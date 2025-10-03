import axios from 'axios';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase.config';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const DEFAULT_STATUSES = ['scheduled', 'active', 'paused', 'completed', 'failed', 'waiting'];
const DEFAULT_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly'];

const calculateNextRun = (schedule) => {
  if (!schedule || !schedule.time) {
    return null;
  }

  try {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const baseDate = new Date(now);
    baseDate.setHours(hours, minutes || 0, 0, 0);

    if (schedule.frequency === 'once') {
      return baseDate.getTime() > now.getTime() ? baseDate.getTime() : null;
    }

    if (schedule.frequency === 'weekly' && Array.isArray(schedule.days) && schedule.days.length > 0) {
      const currentDayIndex = now.getDay();
      const sortedDays = [...schedule.days].sort();
      const nextDay = sortedDays.find((dayIndex) => dayIndex >= currentDayIndex);
      const targetDay = typeof nextDay === 'number' ? nextDay : sortedDays[0];
      const diff = (targetDay - currentDayIndex + 7) % 7 || 7;
      baseDate.setDate(now.getDate() + diff);
      return baseDate.getTime();
    }

    if (baseDate <= now) {
      switch (schedule.frequency) {
        case 'daily':
          baseDate.setDate(baseDate.getDate() + 1);
          break;
        case 'weekly':
          baseDate.setDate(baseDate.getDate() + 7);
          break;
        case 'monthly':
          baseDate.setMonth(baseDate.getMonth() + 1);
          break;
        default:
          return baseDate.getTime();
      }
    }

    return baseDate.getTime();
  } catch (error) {
    console.warn('Unable to calculate next run for schedule', schedule, error);
    return null;
  }
};

const sanitizeTaskPayload = (payload = {}) => {
  const {
    name,
    description = '',
    type = 'generic',
    category = 'operations',
    trigger = null,
    schedule = null,
    targetDevices = [],
    targetPlots = [],
    resources = {},
    priority = 'normal',
    automation = {},
  } = payload;

  if (!name || typeof name !== 'string') {
    throw new Error('Task name is required');
  }

  if (!trigger && !schedule) {
    throw new Error('Task requires either a trigger or a schedule');
  }

  if (schedule && schedule.frequency && !DEFAULT_FREQUENCIES.includes(schedule.frequency)) {
    throw new Error(`Unsupported schedule frequency: ${schedule.frequency}`);
  }

  const nextRunAt = calculateNextRun(schedule);

  return {
    name: name.trim(),
    description: description.trim(),
    type,
    category,
    trigger,
    schedule,
    targetDevices,
    targetPlots,
    resources,
    priority,
    automation,
    status: 'scheduled',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nextRunAt,
    lastRunAt: null,
    lastResult: null,
    manualOverride: {
      active: false,
      reason: '',
      expiresAt: null,
    },
  };
};

const parseGeminiText = (text) => {
  if (!text) return null;

  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const candidate = text.slice(jsonStart, jsonEnd + 1);
      return JSON.parse(candidate);
    }
  } catch (error) {
    console.warn('Failed to parse Gemini structured response', error);
  }

  return { narrative: text };
};

const callGemini = async (prompt) => {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      message: 'Gemini API key not configured. Set EXPO_PUBLIC_GEMINI_API_KEY to enable AI assistance.',
    };
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
          temperature: 0.4,
          maxOutputTokens: 512,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      success: true,
      data: parseGeminiText(text) || { narrative: text },
    };
  } catch (error) {
    console.error('Gemini smart task request failed:', error);
    return {
      success: false,
      message: error?.response?.data?.error?.message || error.message || 'Gemini request failed',
    };
  }
};

export class SmartTaskService {
  constructor(userId) {
    if (!userId) {
      throw new Error('SmartTaskService requires a userId');
    }

    this.userId = userId;
    this.collectionRef = collection(db, 'users', userId, 'smartTasks');
  }

  subscribe(callback, errorCallback) {
    const q = query(this.collectionRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const tasks = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        callback(tasks);
      },
      (error) => {
        console.error('SmartTask subscription error:', error);
        if (errorCallback) {
          errorCallback(error);
        } else {
          // Fallback: return empty array
          callback([]);
        }
      }
    );
  }

  async listTasks() {
    const q = query(this.collectionRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }

  async createTask(payload) {
    const task = sanitizeTaskPayload(payload);
    const docRef = await addDoc(this.collectionRef, task);
    return { id: docRef.id, ...task };
  }

  async updateTask(taskId, updates = {}) {
    if (!taskId) {
      throw new Error('Task ID is required to update a task');
    }

    const updatesWithMeta = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (updates.schedule) {
      updatesWithMeta.nextRunAt = calculateNextRun(updates.schedule);
    }

    const taskRef = doc(this.collectionRef, taskId);
    await updateDoc(taskRef, updatesWithMeta);
    return { success: true };
  }

  async deleteTask(taskId) {
    if (!taskId) {
      throw new Error('Task ID is required to delete a task');
    }

    const taskRef = doc(this.collectionRef, taskId);
    await deleteDoc(taskRef);
    return { success: true };
  }

  async updateStatus(taskId, status, reason = '') {
    if (!DEFAULT_STATUSES.includes(status)) {
      throw new Error(`Unsupported status: ${status}`);
    }

    return this.updateTask(taskId, {
      status,
      lastResult: status === 'failed' ? reason : null,
    });
  }

  async setManualOverride(taskId, { active, reason = '', expiresAt = null }) {
    return this.updateTask(taskId, {
      manualOverride: {
        active,
        reason,
        expiresAt,
      },
    });
  }

  async recordRunResult(taskId, { success, details = '', metrics = {} }) {
    return this.updateTask(taskId, {
      lastRunAt: Date.now(),
      lastResult: {
        success,
        details,
        metrics,
      },
      status: success ? 'completed' : 'failed',
    });
  }

  async generateRuleFromPrompt(promptText, context = {}) {
    const prompt = `You are an agricultural expert helping configure automated farm tasks. Respond in JSON with keys name, description, trigger, schedule, resources, priority.\n` +
      `Use this context:${JSON.stringify(context)}\n` +
      `User request: ${promptText}`;

    const result = await callGemini(prompt);
    return result;
  }

  async evaluateTaskSafety(taskConfig) {
    const prompt = `Evaluate this automated farm task for safety and feasibility. Respond in JSON with keys safe (boolean), issues (string array), recommendations (string array).\n` +
      `${JSON.stringify(taskConfig, null, 2)}`;

    const result = await callGemini(prompt);
    return result;
  }

  mapToAutomationPayload(task) {
    if (!task) return null;

    return {
      name: task.name,
      icon: task.automation?.icon || '⚙️',
      type: task.type,
      targetPlots: task.targetPlots || [],
      schedule: task.schedule || null,
      trigger: task.trigger || null,
      resourceRequirements: task.resources || {},
      duration: task.automation?.duration || 300,
      priority: task.priority || 'normal',
    };
  }
}

export default SmartTaskService;
