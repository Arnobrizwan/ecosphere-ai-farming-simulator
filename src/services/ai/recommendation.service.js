import axios from 'axios';
import { collection, addDoc, serverTimestamp, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { ref, child, get } from 'firebase/database';
import { db, rtdb } from '../firebase.config';
import { gatherUserContext } from './tutor.service';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const FALLBACK_RECOMMENDATIONS = [
  {
    id: 'fallback_irrigation',
    title: 'Prioritize Irrigation For Dry Plots',
    category: 'irrigation',
    priority: 'HIGH',
    rationale: 'Soil moisture readings remain below 30% on two plots. Without irrigation, seedlings risk permanent stress.',
    nextSteps: ['Schedule irrigation within 12 hours', 'Log moisture after watering'],
    impact: 'Avoid 25% yield loss on the northern plots',
    confidence: 0.7,
  },
  {
    id: 'fallback_fertigation',
    title: 'Apply Nitrogen Booster',
    category: 'fertigation',
    priority: 'MEDIUM',
    rationale: 'Growth logs show slow tillering while NDVI trends flatten. Mild nitrogen deficit likely.',
    nextSteps: ['Mix foliar feed (0.5%)', 'Apply during evening hours'],
    impact: 'Restore expected tiller growth within 5 days',
    confidence: 0.65,
  },
  {
    id: 'fallback_risk',
    title: 'Prepare For Weekend Rain',
    category: 'risk',
    priority: 'MEDIUM',
    rationale: 'IMERG forecast signals 45mm rainfall over 48h. Risk of waterlogging around low-lying beds.',
    nextSteps: ['Clear drainage channels', 'Move tools to storage shed'],
    impact: 'Prevent disease outbreaks and equipment damage',
    confidence: 0.6,
  },
];

const FALLBACK_ADVICE = {
  id: 'fallback_advice',
  headline: 'Keep Tracking Soil Moisture Daily',
  message: 'Your fields are transitioning from transplanting to tillering. Use the IoT moisture sensor to irrigate lightly but frequently. Combine that with a nitrogen-rich foliar spray this week to keep the crop vigorous.',
  contextHighlights: [
    'Farm size: 2 acres • Crop: BRRI dhan28',
    'Experience level: Beginner',
    'Location: Floodplain — watch drainage after heavy rain',
  ],
  suggestions: [
    'Log every irrigation event inside Smart Tasks to build history',
    'Take photos of canopy weekly to monitor colour changes',
  ],
};

const fetchSmartTaskSummary = async (userId) => {
  try {
    const tasksSnap = await getDocs(query(collection(db, 'users', userId, 'smartTasks'), orderBy('createdAt', 'desc'), limit(10)));
    const tasks = [];
    tasksSnap.forEach((docSnap) => {
      const data = docSnap.data();
      tasks.push({
        id: docSnap.id,
        name: data.name,
        status: data.status,
        category: data.category,
        priority: data.priority,
        schedule: data.schedule,
      });
    });
    return tasks;
  } catch (error) {
    console.warn('Failed to fetch smart task summary', error);
    return [];
  }
};

const fetchTelemetrySnapshot = async (farmId) => {
  if (!rtdb) return null;
  try {
    const farmSnap = await get(child(ref(rtdb), `iot/farms/${farmId}/devices`));
    if (!farmSnap.exists()) {
      return null;
    }
    const devices = farmSnap.val();
    const summary = Object.entries(devices).map(([id, payload]) => ({
      id,
      name: payload.name,
      type: payload.type,
      status: payload.status,
      battery: payload.battery,
      telemetry: payload.telemetry,
      alerts: payload.alerts ? Object.values(payload.alerts).filter((alert) => alert && !alert.acknowledged).length : 0,
    }));
    return summary;
  } catch (error) {
    console.warn('Failed to fetch IoT telemetry snapshot', error);
    return null;
  }
};

const callGemini = async (prompt, temperature = 0.45, maxTokens = 768) => {
  if (!GEMINI_API_KEY) {
    return { success: false, message: 'Gemini API key not configured.' };
  }

  try {
    const response = await axios.post(
      `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 35000,
      }
    );

    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return { success: false, message: 'No content returned from Gemini.' };
    }
    return { success: true, text };
  } catch (error) {
    console.error('Gemini recommendation request failed:', error.message);
    return {
      success: false,
      message: error?.response?.data?.error?.message || error.message || 'Gemini request failed',
    };
  }
};

const parseJSON = (raw) => {
  if (!raw) return null;
  try {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse Gemini JSON block', error, raw);
    return null;
  }
};

const buildRecommendationPrompt = (context) => {
  const { profile, tasks, telemetry } = context;
  const telemetrySummary = telemetry && telemetry.length
    ? telemetry.map((device) => `${device.name} (${device.type}) — status ${device.status}${device.alerts ? `, alerts: ${device.alerts}` : ''}`).join('\n')
    : 'No active telemetry records.';

  const taskSummary = tasks && tasks.length
    ? tasks.map((task) => `${task.name} [${task.status || 'scheduled'} — ${task.priority || 'normal'}]`).join('\n')
    : 'No logged smart tasks.';

  return `You are an agronomy recommendation engine for smallholder farms in South Asia.
Respond with JSON matching this schema:
{
  "recommendations": [
    {
      "id": "string",
      "title": "string",
      "category": "fertigation|irrigation|risk|planting|market|training",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "rationale": "string",
      "impact": "string",
      "nextSteps": ["string", "string"],
      "confidence": 0-1
    }
  ]
}
Ensure 2-4 items ranked from highest to lowest priority.

FARMER PROFILE:
- Role: ${profile.userRole}
- Experience: ${profile.experienceLevel}
- Location: ${profile.location}
- Crops: ${profile.crops.join(', ')}
- Farm Size: ${profile.farmSize} acres

RECENT TASKS:
${taskSummary}

IOT SNAPSHOT:
${telemetrySummary}
`;};

const buildAdvicePrompt = (context) => {
  const { profile, tasks, telemetry } = context;
  const firstTask = tasks?.[0];
  const telemetryHint = telemetry && telemetry.length ? `${telemetry.length} active devices reporting.` : 'No telemetry available.';

  return `You are a personal agronomy coach.
Return JSON:
{
  "id": "string",
  "headline": "string",
  "message": "3-4 sentence actionable advice",
  "contextHighlights": ["string", "string"],
  "suggestions": ["string", "string"]
}
Make advice personalised using location, experience, current crops, and telemetry cues.

PROFILE: ${profile.userRole}, exp ${profile.experienceLevel}, location ${profile.location}, crops ${profile.crops.join(', ')}.
FARM CONTEXT: ${profile.farmSize} acres, current activity ${profile.currentActivity}.
TOP TASK: ${firstTask ? `${firstTask.name} (${firstTask.status})` : 'No smart tasks logged'}.
TELEMETRY: ${telemetryHint}
`;
};

const collectContext = async (userId, farmId) => {
  const profile = await gatherUserContext(userId);
  const tasks = await fetchSmartTaskSummary(userId);
  const telemetry = await fetchTelemetrySnapshot(farmId || `farm_${userId}`) || await fetchTelemetrySnapshot('demoFarm');

  return { profile, tasks, telemetry };
};

export const recommendationService = {
  async getRecommendations(userId, farmId) {
    const context = await collectContext(userId, farmId);
    const prompt = buildRecommendationPrompt(context);

    const result = await callGemini(prompt, 0.35, 768);
    if (!result.success) {
      return {
        source: 'fallback',
        recommendations: FALLBACK_RECOMMENDATIONS,
        message: result.message,
      };
    }

    const parsed = parseJSON(result.text);
    const recommendations = parsed?.recommendations || FALLBACK_RECOMMENDATIONS;

    return {
      source: parsed ? 'gemini' : 'fallback_parse_error',
      recommendations,
      context,
    };
  },

  async logRecommendationDecision(userId, recommendation, decision) {
    const logRef = collection(db, 'users', userId, 'recommendationLogs');
    await addDoc(logRef, {
      recommendationId: recommendation.id,
      title: recommendation.title,
      category: recommendation.category,
      priority: recommendation.priority,
      decision,
      rationale: recommendation.rationale,
      impact: recommendation.impact || null,
      nextSteps: recommendation.nextSteps || [],
      decidedAt: serverTimestamp(),
    });
  },

  async getAdvice(userId, farmId) {
    const context = await collectContext(userId, farmId);
    const prompt = buildAdvicePrompt(context);
    const result = await callGemini(prompt, 0.5, 640);

    if (!result.success) {
      return {
        source: 'fallback',
        advice: FALLBACK_ADVICE,
        message: result.message,
      };
    }

    const parsed = parseJSON(result.text);
    const advice = parsed || FALLBACK_ADVICE;

    return {
      source: parsed ? 'gemini' : 'fallback_parse_error',
      advice,
      context,
    };
  },

  async logAdvice(userId, advice) {
    const logRef = collection(db, 'users', userId, 'adviceLogs');
    const docRef = await addDoc(logRef, {
      headline: advice.headline,
      message: advice.message,
      contextHighlights: advice.contextHighlights || [],
      suggestions: advice.suggestions || [],
      createdAt: serverTimestamp(),
      adviceId: advice.id || null,
    });
    return docRef.id;
  },

  async submitAdviceFeedback(userId, adviceLogId, feedback) {
    const feedbackRef = collection(db, 'users', userId, 'adviceLogs', adviceLogId, 'feedback');
    await addDoc(feedbackRef, {
      rating: feedback.rating,
      comments: feedback.comments || '',
      submittedAt: serverTimestamp(),
    });
  },
};

export default recommendationService;
