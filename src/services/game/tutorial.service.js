/**
 * UC8 - Tutorial System Service
 * Interactive step-by-step tutorials for core mechanics
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';

const TUTORIALS_COLLECTION = 'tutorials';
const USER_TUTORIAL_PROGRESS = 'user_tutorial_progress';

// Tutorial definitions
export const TUTORIALS = {
  tutorial_planting: {
    id: 'tutorial_planting',
    title: 'Basic Planting',
    category: 'farming',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    steps: [
      {
        id: 'step_1',
        title: 'Select Crop',
        description: 'Choose rice from the crop menu',
        hint: 'Rice is ideal for beginners and grows well in Bangladesh',
        action: 'select_crop',
        target: 'rice',
        visualIndicator: 'highlight_crop_menu',
      },
      {
        id: 'step_2',
        title: 'Check Soil Moisture',
        description: 'Use SMAP data to check soil moisture levels',
        hint: 'Optimal soil moisture for planting is 20-30%',
        action: 'check_smap',
        nasaData: 'smap',
        threshold: { min: 0.15, max: 0.40 },
        visualIndicator: 'highlight_satellite_button',
      },
      {
        id: 'step_3',
        title: 'Plant Seeds',
        description: 'Tap on the field to plant your seeds',
        hint: 'Plant in rows for better management',
        action: 'plant_seeds',
        target: 'field_plot_1',
        visualIndicator: 'highlight_field',
      },
      {
        id: 'step_4',
        title: 'Water if Needed',
        description: 'Check if irrigation is required',
        hint: 'If soil moisture is below 20%, irrigate immediately',
        action: 'irrigate',
        condition: 'soil_moisture < 0.20',
        visualIndicator: 'highlight_water_button',
      },
    ],
    rewards: {
      xp: 100,
      badge: 'first_planting',
    },
    requiredFor: ['mission_1'],
  },
  tutorial_ndvi: {
    id: 'tutorial_ndvi',
    title: 'Understanding NDVI',
    category: 'satellite_data',
    difficulty: 'intermediate',
    estimatedTime: '7 minutes',
    requires: ['tutorial_planting'],
    steps: [
      {
        id: 'step_1',
        title: 'What is NDVI?',
        description: 'NDVI measures vegetation health from satellite imagery',
        hint: 'Higher NDVI (0.6-0.9) indicates healthy, dense vegetation',
        action: 'read_info',
        visualIndicator: 'show_ndvi_chart',
      },
      {
        id: 'step_2',
        title: 'Access MODIS Data',
        description: 'Open the Satellite Insights panel',
        hint: 'Find it in the main dashboard',
        action: 'open_satellite_panel',
        visualIndicator: 'highlight_satellite_insights',
      },
      {
        id: 'step_3',
        title: 'Interpret NDVI Values',
        description: 'Check your crop NDVI reading',
        hint: 'NDVI < 0.3 = stress, 0.3-0.6 = moderate, > 0.6 = healthy',
        action: 'read_ndvi',
        nasaData: 'modis',
        visualIndicator: 'show_ndvi_scale',
      },
      {
        id: 'step_4',
        title: 'Take Action',
        description: 'If NDVI is low, investigate causes',
        hint: 'Low NDVI could mean pests, disease, or water stress',
        action: 'identify_stress',
        visualIndicator: 'highlight_recommendations',
      },
    ],
    rewards: {
      xp: 200,
      badge: 'satellite_expert',
    },
  },
  tutorial_irrigation: {
    id: 'tutorial_irrigation',
    title: 'Smart Irrigation',
    category: 'water_management',
    difficulty: 'intermediate',
    estimatedTime: '10 minutes',
    requires: ['tutorial_planting'],
    steps: [
      {
        id: 'step_1',
        title: 'Monitor Soil Moisture',
        description: 'Use SMAP data to track soil water content',
        action: 'check_smap',
        nasaData: 'smap',
        visualIndicator: 'show_moisture_map',
      },
      {
        id: 'step_2',
        title: 'Check Weather Forecast',
        description: 'Review NASA POWER precipitation data',
        action: 'check_weather',
        nasaData: 'power',
        visualIndicator: 'show_forecast',
      },
      {
        id: 'step_3',
        title: 'Calculate Water Need',
        description: 'Determine irrigation amount based on data',
        hint: 'Target: 25-30% soil moisture for most crops',
        action: 'calculate_irrigation',
        visualIndicator: 'show_calculator',
      },
      {
        id: 'step_4',
        title: 'Apply Water',
        description: 'Irrigate efficiently to reach optimal moisture',
        action: 'irrigate',
        efficiency: 85,
        visualIndicator: 'highlight_irrigation_controls',
      },
    ],
    rewards: {
      xp: 250,
      badge: 'water_master',
    },
  },
};

/**
 * Start tutorial
 */
export const startTutorial = async (userId, tutorialId) => {
  const tutorial = TUTORIALS[tutorialId];
  
  if (!tutorial) {
    throw new Error('Tutorial not found');
  }

  // Check prerequisites
  if (tutorial.requires) {
    const userProgress = await getUserTutorialProgress(userId);
    const hasPrereqs = tutorial.requires.every(req => 
      userProgress.completedTutorials?.includes(req)
    );
    
    if (!hasPrereqs) {
      throw new Error('Complete prerequisite tutorials first');
    }
  }

  // Create tutorial session
  const session = {
    userId,
    tutorialId,
    tutorial,
    currentStep: 0,
    completedSteps: [],
    skippedSteps: [],
    startedAt: new Date().toISOString(),
    status: 'active',
  };

  await addDoc(collection(db, 'active_tutorials'), session);

  return {
    success: true,
    session,
    currentStep: tutorial.steps[0],
  };
};

/**
 * Complete tutorial step
 */
export const completeStep = async (userId, tutorialId, stepId, actionData = {}) => {
  const q = query(
    collection(db, 'active_tutorials'),
    where('userId', '==', userId),
    where('tutorialId', '==', tutorialId),
    where('status', '==', 'active'),
    limit(1)
  );
  const sessionQuery = await getDocs(q);

  if (sessionQuery.empty) {
    throw new Error('No active tutorial session');
  }

  const sessionDoc = sessionQuery.docs[0];
  const session = sessionDoc.data();
  const step = session.tutorial.steps.find(s => s.id === stepId);

  if (!step) {
    throw new Error('Step not found');
  }

  // Validate action
  const isValid = validateStepAction(step, actionData);
  
  if (!isValid) {
    return {
      success: false,
      error: 'Action does not meet step requirements',
      hint: step.hint,
    };
  }

  // Mark step as completed
  const completedSteps = [...session.completedSteps, stepId];
  const currentStepIndex = session.currentStep + 1;
  const nextStep = session.tutorial.steps[currentStepIndex];

  await updateDoc(sessionDoc.ref, {
    completedSteps,
    currentStep: currentStepIndex,
    updatedAt: new Date().toISOString(),
  });

  // Check if tutorial completed
  if (!nextStep) {
    await completeTutorial(userId, tutorialId, sessionDoc.ref);
    
    return {
      success: true,
      completed: true,
      rewards: session.tutorial.rewards,
    };
  }

  return {
    success: true,
    completed: false,
    nextStep,
  };
};

/**
 * Skip tutorial step (with warning)
 */
export const skipStep = async (userId, tutorialId, stepId) => {
  const q = query(
    collection(db, 'active_tutorials'),
    where('userId', '==', userId),
    where('tutorialId', '==', tutorialId),
    where('status', '==', 'active'),
    limit(1)
  );
  const sessionQuery = await getDocs(q);

  if (sessionQuery.empty) {
    throw new Error('No active tutorial session');
  }

  const sessionDoc = sessionQuery.docs[0];
  const session = sessionDoc.data();

  const skippedSteps = [...session.skippedSteps, stepId];
  const currentStepIndex = session.currentStep + 1;
  const nextStep = session.tutorial.steps[currentStepIndex];

  await updateDoc(sessionDoc.ref, {
    skippedSteps,
    currentStep: currentStepIndex,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    warning: 'Skipping steps may affect your understanding',
    nextStep,
  };
};

/**
 * Validate step action
 */
function validateStepAction(step, actionData) {
  switch (step.action) {
    case 'select_crop':
      return actionData.crop === step.target;
    
    case 'check_smap':
      if (step.threshold) {
        return actionData.soilMoisture >= step.threshold.min && 
               actionData.soilMoisture <= step.threshold.max;
      }
      return actionData.checked === true;
    
    case 'plant_seeds':
      return actionData.planted === true && actionData.location === step.target;
    
    case 'irrigate':
      if (step.condition) {
        // Evaluate condition
        return actionData.irrigated === true;
      }
      return actionData.irrigated === true;
    
    case 'read_info':
    case 'open_satellite_panel':
    case 'read_ndvi':
      return actionData.completed === true;
    
    default:
      return actionData.completed === true;
  }
}

/**
 * Complete tutorial
 */
async function completeTutorial(userId, tutorialId, sessionRef) {
  const tutorial = TUTORIALS[tutorialId];
  const userProgress = await getUserTutorialProgress(userId);

  // Award XP and badges
  const newXP = (userProgress.xp || 0) + tutorial.rewards.xp;
  const badges = [...(userProgress.badges || [])];
  
  if (tutorial.rewards.badge && !badges.includes(tutorial.rewards.badge)) {
    badges.push(tutorial.rewards.badge);
  }

  // Update progress
  await setDoc(doc(db, USER_TUTORIAL_PROGRESS, userId), {
    ...userProgress,
    xp: newXP,
    badges,
    completedTutorials: [...(userProgress.completedTutorials || []), tutorialId],
    lastCompleted: new Date().toISOString(),
  }, { merge: true });

  // Mark session as completed
  await updateDoc(sessionRef, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });

  // Track analytics
  await addDoc(collection(db, 'tutorial_analytics'), {
    userId,
    tutorialId,
    completedAt: new Date().toISOString(),
    duration: Date.now() - new Date(sessionRef.data().startedAt).getTime(),
  });
}

/**
 * Get user tutorial progress
 */
export const getUserTutorialProgress = async (userId) => {
  const docSnap = await getDoc(doc(db, USER_TUTORIAL_PROGRESS, userId));

  if (!docSnap.exists()) {
    const defaultProgress = {
      userId,
      xp: 0,
      badges: [],
      completedTutorials: [],
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, USER_TUTORIAL_PROGRESS, userId), defaultProgress);
    return defaultProgress;
  }

  return docSnap.data();
};

/**
 * Get available tutorials
 */
export const getAvailableTutorials = async (userId) => {
  const userProgress = await getUserTutorialProgress(userId);
  const completedTutorials = userProgress.completedTutorials || [];

  const available = Object.values(TUTORIALS).filter(tutorial => {
    // Already completed
    if (completedTutorials.includes(tutorial.id)) {
      return false;
    }

    // Check prerequisites
    if (tutorial.requires) {
      return tutorial.requires.every(req => completedTutorials.includes(req));
    }

    return true;
  });

  return {
    success: true,
    tutorials: available,
  };
};
