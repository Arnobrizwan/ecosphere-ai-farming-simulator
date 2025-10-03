import { collection, addDoc, query, orderBy, limit, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase.config';
import axios from 'axios';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Fallback FAQ for offline mode or API failures
const CACHED_FAQ = [
  {
    question: 'What is SMAP?',
    answer: 'SMAP (Soil Moisture Active Passive) is a NASA satellite that measures water content in soil using microwave sensors. It provides data every 2-3 days at 9km resolution, helping farmers plan irrigation.'
  },
  {
    question: 'What is NDVI?',
    answer: 'NDVI (Normalized Difference Vegetation Index) measures crop health from 0 to 1. Values: 0-0.2 (bare soil), 0.2-0.4 (early growth), 0.4-0.6 (active growth), 0.6-0.8 (peak health).'
  },
  {
    question: 'How do I use NASA data?',
    answer: 'Open the Map screen and tap the layers icon. Select SMAP for soil moisture, IMERG for rainfall, NDVI for crop health, or LST for temperature. The data updates every few days.'
  },
  {
    question: 'What crops should I plant?',
    answer: 'It depends on your soil moisture, season, and location. In Bangladesh, rice is ideal during monsoon (high moisture), while wheat works in winter (lower moisture). Check SMAP data first.'
  },
  {
    question: 'How do I complete missions?',
    answer: 'Each mission has specific objectives shown at the top. Follow the step-by-step instructions, use NASA data layers when prompted, and make decisions based on the data you see.'
  }
];

/**
 * Gather user context from Firestore for AI prompts
 */
export const gatherUserContext = async (userId) => {
  try {
    const [profileSnap, farmConfigSnap, progressSnap] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDoc(doc(db, 'users', userId, 'locations', 'default')),
      getDoc(doc(db, 'users', userId, 'learningProgress', 'default'))
    ]);

    const profile = profileSnap.exists() ? profileSnap.data() : {};
    const farmConfig = farmConfigSnap.exists() ? farmConfigSnap.data() : {};
    const progress = progressSnap.exists() ? progressSnap.data() : {};

    return {
      userRole: profile.role || 'farmer',
      location: profile.location || 'Manikganj, Bangladesh',
      experienceLevel: profile.experienceLevel || 'beginner',
      crops: farmConfig.plots?.map(p => p.crop).filter(Boolean) || ['rice'],
      farmSize: farmConfig.totalArea || 2,
      currentActivity: progress.currentMission || 'browsing',
      completedTutorials: progress.completedTutorials || [],
      recentTopics: progress.recentTopics || []
    };
  } catch (error) {
    console.error('Error gathering context:', error);
    return {
      userRole: 'farmer',
      location: 'Bangladesh',
      experienceLevel: 'beginner',
      crops: ['rice'],
      farmSize: 2,
      currentActivity: 'browsing',
      completedTutorials: [],
      recentTopics: []
    };
  }
};

/**
 * Gather game context for in-game AI responses
 */
export const gatherGameContext = (gameState) => {
  return {
    playerPosition: gameState.player?.position || { x: 0, y: 0, z: 0 },
    nearbyObjects: gameState.nearbyObjects || [],
    nearbyPlots: gameState.nearbyPlots || [],
    currentMission: gameState.activeMission || null,
    plotStates: gameState.plots?.map(p => ({
      id: p.id,
      soilMoisture: p.userData?.soilMoisture || 0,
      planted: p.userData?.planted || false,
      cropType: p.userData?.cropType || null,
      cropHealth: p.userData?.cropHealth || 100,
      lastWatered: p.userData?.lastWatered || null
    })) || [],
    playerInventory: gameState.player?.inventory || [],
    nasaData: gameState.nasaData || {},
    lastActions: gameState.actionHistory?.slice(-5) || [],
    currentArea: gameState.currentArea || null,
    nasaLayerActive: gameState.nasaLayerActive || false,
    nasaLayerType: gameState.nasaLayerType || null
  };
};

/**
 * Build system prompt with user and game context
 */
const buildSystemPrompt = (context, gameContext = null) => {
  let prompt = `You are AgriBot, a friendly AI farming companion in the EcoSphere 3D game. You appear as a helpful robot character that guides players through farming challenges.

PERSONALITY:
- Encouraging and patient mentor
- Slightly playful but knowledgeable
- Use catchphrases like "Let's grow together!" and "Good thinking!"
- Celebrate successes enthusiastically

USER CONTEXT:
- Role: ${context.userRole}
- Location: ${context.location}
- Farm: ${context.farmSize} acres, growing ${context.crops.join(', ')}
- Experience: ${context.experienceLevel}
- Current Activity: ${context.currentActivity}`;

  if (gameContext) {
    prompt += `

GAME STATE:
- Player Position: (${gameContext.playerPosition.x.toFixed(1)}, ${gameContext.playerPosition.z.toFixed(1)})
- Current Mission: ${gameContext.currentMission?.title || 'Free exploration'}
- Nearby Plots: ${gameContext.nearbyPlots.length} plots
- NASA Layer Active: ${gameContext.nasaLayerActive ? gameContext.nasaLayerType : 'None'}`;

    if (gameContext.plotStates.length > 0) {
      const problemPlots = gameContext.plotStates.filter(p => p.soilMoisture < 20 || p.cropHealth < 50);
      if (problemPlots.length > 0) {
        prompt += `\n- Problem Plots: ${problemPlots.length} plots need attention`;
      }
    }
  }

  prompt += `

RESPONSE GUIDELINES:
- Keep responses SHORT (2-3 sentences max for in-game dialogue)
- Be conversational and game-appropriate
- Reference what player is looking at or doing
- Explain technical terms simply
- Relate game mechanics to real farming
- Provide actionable next steps
- For students: educational, explain "why"
- For farmers: practical, focus on "how"

TONE: Friendly game companion, encouraging, patient`;

  return prompt;
};

/**
 * Call Google Gemini API with conversation history and optional game context
 */
export const getAIResponse = async (userMessage, conversationHistory = [], userId, gameContext = null) => {
  try {
    // Gather context
    const context = await gatherUserContext(userId);

    // Build conversation context for Gemini
    const systemPrompt = buildSystemPrompt(context, gameContext);

    // Format conversation history for Gemini
    let conversationText = systemPrompt + "\n\n";
    conversationHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'AgriBot';
      conversationText += `${role}: ${msg.content}\n`;
    });
    conversationText += `User: ${userMessage}\nAgriBot:`;

    // Call Gemini API
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: conversationText
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const aiMessage = response.data.candidates[0].content.parts[0].text;
    return {
      success: true,
      message: aiMessage,
      context
    };
  } catch (error) {
    console.error('Gemini API error:', error);

    // Fallback to cached FAQ
    const cachedAnswer = findCachedAnswer(userMessage);
    if (cachedAnswer) {
      return {
        success: true,
        message: cachedAnswer + '\n\n(Offline Mode - Using cached answer)',
        cached: true
      };
    }

    return {
      success: false,
      error: error.message,
      message: "I'm having trouble connecting right now. Please try again or check the FAQ section."
    };
  }
};

/**
 * Find cached answer for common questions
 */
const findCachedAnswer = (question) => {
  const lowerQuestion = question.toLowerCase();
  const match = CACHED_FAQ.find(faq => 
    lowerQuestion.includes(faq.question.toLowerCase()) ||
    faq.question.toLowerCase().includes(lowerQuestion)
  );
  return match ? match.answer : null;
};

/**
 * Save conversation to Firestore
 */
export const saveConversation = async (userId, messages, topic = 'general') => {
  try {
    const conversationRef = collection(db, 'users', userId, 'aiConversations');
    const conversationDoc = await addDoc(conversationRef, {
      messages,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      topic,
      resolved: false
    });
    return { success: true, conversationId: conversationDoc.id };
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load conversation history
 */
export const loadConversationHistory = async (userId, conversationId) => {
  try {
    const conversationRef = doc(db, 'users', userId, 'aiConversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      return {
        success: true,
        conversation: conversationSnap.data()
      };
    }
    
    return { success: false, error: 'Conversation not found' };
  } catch (error) {
    console.error('Error loading conversation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get recent conversations
 */
export const getRecentConversations = async (userId, limitCount = 10) => {
  try {
    const conversationsRef = collection(db, 'users', userId, 'aiConversations');
    const q = query(conversationsRef, orderBy('lastMessageAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    const conversations = [];
    snapshot.forEach(doc => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, conversations };
  } catch (error) {
    console.error('Error loading conversations:', error);
    return { success: false, error: error.message, conversations: [] };
  }
};

/**
 * Save message feedback
 */
export const saveFeedback = async (userId, conversationId, messageId, rating, reason = '', comment = '') => {
  try {
    const conversationRef = doc(db, 'users', userId, 'aiConversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      const messages = data.messages || [];
      
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            feedback: {
              rating,
              reason,
              comment,
              timestamp: new Date().toISOString()
            }
          };
        }
        return msg;
      });
      
      await updateDoc(conversationRef, { messages: updatedMessages });
      return { success: true };
    }
    
    return { success: false, error: 'Conversation not found' };
  } catch (error) {
    console.error('Error saving feedback:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get quick question suggestions based on context
 */
export const getQuickQuestions = (context) => {
  const baseQuestions = [
    'How do I use SMAP data?',
    'What crops should I plant now?',
    'Explain this mission objective',
    'Why are my crops stressed?'
  ];
  
  // Add context-specific questions
  if (context.currentActivity && context.currentActivity.includes('Mission')) {
    baseQuestions.unshift(`Help with ${context.currentActivity}`);
  }
  
  if (context.crops.includes('rice')) {
    baseQuestions.push('Best irrigation schedule for rice');
  }
  
  return baseQuestions.slice(0, 5);
};

/**
 * Get short contextual response for in-game dialogue
 */
export const getContextualResponse = async (situation, userId, gameContext) => {
  try {
    const context = await gatherUserContext(userId);
    const systemPrompt = buildSystemPrompt(context, gameContext);

    const conversationText = `${systemPrompt}\n\nUser: ${situation}\nAgriBot:`;

    if (!GEMINI_API_KEY) {
      // Fallback to cached response
      return {
        success: true,
        message: "I'm here to help! What would you like to know?",
        cached: true
      };
    }

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: conversationText
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150, // Shorter for in-game dialogue
          topP: 0.8,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return {
      success: true,
      message: response.data.candidates[0].content.parts[0].text
    };
  } catch (error) {
    console.error('Contextual response error:', error);
    return {
      success: false,
      message: "Let me think about that... (Connection issue)",
      error: error.message
    };
  }
};

export default {
  gatherUserContext,
  gatherGameContext,
  getAIResponse,
  getContextualResponse,
  saveConversation,
  loadConversationHistory,
  getRecentConversations,
  saveFeedback,
  getQuickQuestions
};
