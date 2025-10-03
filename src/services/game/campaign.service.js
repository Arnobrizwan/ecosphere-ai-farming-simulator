/**
 * UC6 - Campaign Mode Service
 * Mission-based campaign with NASA satellite data integration
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getCompleteSatelliteData } from '../nasa/satelliteService';

const CAMPAIGNS_COLLECTION = 'campaigns';
const USER_PROGRESS_COLLECTION = 'user_campaign_progress';

// Campaign missions with NASA data integration
export const CAMPAIGN_MISSIONS = {
  mission_1: {
    id: 'mission_1',
    title: 'First Planting',
    description: 'Learn basic planting using real soil moisture data',
    difficulty: 'easy',
    requiredLevel: 0,
    objectives: [
      { type: 'plant_crop', target: 'rice', amount: 10, points: 100 },
      { type: 'check_soil_moisture', source: 'smap', threshold: 0.25, points: 50 },
      { type: 'water_if_needed', condition: 'soil_moisture < 0.20', points: 50 },
    ],
    rewards: {
      xp: 200,
      coins: 100,
      unlocks: ['mission_2', 'crop_wheat'],
    },
    nasaData: {
      required: ['SMAP'],
      locationBased: true,
    },
  },
  mission_2: {
    id: 'mission_2',
    title: 'Weather-Based Harvesting',
    description: 'Use NASA weather data to time your harvest',
    difficulty: 'medium',
    requiredLevel: 1,
    requires: ['mission_1'],
    objectives: [
      { type: 'monitor_ndvi', source: 'modis', threshold: 0.6, points: 150 },
      { type: 'check_temperature', source: 'power', maxTemp: 35, points: 100 },
      { type: 'harvest_crop', timing: 'optimal', yield: 80, points: 200 },
    ],
    rewards: {
      xp: 450,
      coins: 250,
      unlocks: ['mission_3', 'tutorial_ndvi'],
      badges: ['weather_master'],
    },
    nasaData: {
      required: ['MODIS', 'NASA_POWER'],
      locationBased: true,
    },
  },
  mission_3: {
    id: 'mission_3',
    title: 'Drought Management',
    description: 'Manage crops during low precipitation using satellite monitoring',
    difficulty: 'hard',
    requiredLevel: 3,
    requires: ['mission_2'],
    objectives: [
      { type: 'monitor_precipitation', source: 'power', threshold: 5, points: 100 },
      { type: 'optimize_irrigation', efficiency: 85, points: 200 },
      { type: 'maintain_yield', minYield: 75, points: 250 },
    ],
    rewards: {
      xp: 750,
      coins: 500,
      unlocks: ['mission_4', 'advanced_irrigation'],
      badges: ['drought_survivor', 'water_saver'],
    },
    nasaData: {
      required: ['SMAP', 'NASA_POWER'],
      realTime: true,
    },
  },
};

/**
 * Start a campaign mission
 */
export const startMission = async (userId, missionId) => {
  const mission = CAMPAIGN_MISSIONS[missionId];
  
  if (!mission) {
    throw new Error('Mission not found');
  }

  // Check prerequisites
  const userProgress = await getUserProgress(userId);
  
  if (mission.requiredLevel > userProgress.level) {
    throw new Error(`Level ${mission.requiredLevel} required`);
  }

  if (mission.requires) {
    const completedMissions = userProgress.completedMissions || [];
    const hasPrereqs = mission.requires.every(req => completedMissions.includes(req));
    
    if (!hasPrereqs) {
      throw new Error('Complete prerequisite missions first');
    }
  }

  // Load NASA satellite data for mission
  let nasaData = null;
  if (mission.nasaData?.required && mission.nasaData.locationBased) {
    const userLocation = userProgress.farmLocation || { latitude: 23.81, longitude: 90.41 };
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
      const satData = await getCompleteSatelliteData(
        userId,
        userLocation.latitude,
        userLocation.longitude,
        startDate,
        endDate
      );
      nasaData = satData;
    } catch (error) {
      console.warn('[Campaign] NASA data fetch failed:', error);
    }
  }

  // Create mission instance
  const missionInstance = {
    userId,
    missionId,
    mission,
    nasaData,
    status: 'active',
    progress: {},
    startedAt: new Date().toISOString(),
  };

  await addDoc(collection(db, 'active_missions'), missionInstance);

  return {
    success: true,
    mission: missionInstance,
  };
};

/**
 * Update mission progress
 */
export const updateMissionProgress = async (userId, missionId, objectiveType, value) => {
  const q = query(
    collection(db, 'active_missions'),
    where('userId', '==', userId),
    where('missionId', '==', missionId),
    where('status', '==', 'active'),
    limit(1)
  );
  const activeMission = await getDocs(q);

  if (activeMission.empty) {
    throw new Error('No active mission found');
  }

  const missionDoc = activeMission.docs[0];
  const mission = missionDoc.data();
  const objective = mission.mission.objectives.find(obj => obj.type === objectiveType);

  if (!objective) {
    throw new Error('Objective not found');
  }

  // Update progress
  const newProgress = { ...mission.progress };
  newProgress[objectiveType] = value;

  // Check if objective completed
  const objectiveCompleted = checkObjectiveCompletion(objective, value, mission.nasaData);

  if (objectiveCompleted) {
    newProgress[`${objectiveType}_completed`] = true;
    newProgress[`${objectiveType}_points`] = objective.points;
  }

  await updateDoc(missionDoc.ref, {
    progress: newProgress,
    updatedAt: new Date().toISOString(),
  });

  // Check if all objectives completed
  const allCompleted = mission.mission.objectives.every(obj => 
    newProgress[`${obj.type}_completed`]
  );

  if (allCompleted) {
    await completeMission(userId, missionId, missionDoc.ref);
  }

  return {
    success: true,
    progress: newProgress,
    objectiveCompleted,
    missionCompleted: allCompleted,
  };
};

/**
 * Complete mission and award rewards
 */
async function completeMission(userId, missionId, missionRef) {
  const mission = CAMPAIGN_MISSIONS[missionId];
  const userProgress = await getUserProgress(userId);

  // Calculate total points
  const totalPoints = mission.objectives.reduce((sum, obj) => sum + obj.points, 0);

  // Award XP and coins
  const newXP = (userProgress.xp || 0) + mission.rewards.xp;
  const newCoins = (userProgress.coins || 0) + mission.rewards.coins;
  const newLevel = calculateLevel(newXP);

  // Update user progress
  const updatedProgress = {
    ...userProgress,
    xp: newXP,
    coins: newCoins,
    level: newLevel,
    completedMissions: [...(userProgress.completedMissions || []), missionId],
    unlockedContent: [...(userProgress.unlockedContent || []), ...(mission.rewards.unlocks || [])],
    badges: [...(userProgress.badges || []), ...(mission.rewards.badges || [])],
  };

  await setDoc(doc(db, USER_PROGRESS_COLLECTION, userId), updatedProgress, { merge: true });

  // Mark mission as completed
  await updateDoc(missionRef, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    score: totalPoints,
  });

  return updatedProgress;
}

/**
 * Check if objective is completed based on NASA data
 */
function checkObjectiveCompletion(objective, value, nasaData) {
  switch (objective.type) {
    case 'check_soil_moisture':
      if (nasaData?.soilMoisture) {
        const avgMoisture = nasaData.soilMoisture.reduce((sum, d) => sum + d.soilMoisture, 0) / nasaData.soilMoisture.length;
        return avgMoisture >= objective.threshold;
      }
      return value >= objective.threshold;

    case 'monitor_ndvi':
      if (nasaData?.modisNdvi) {
        return nasaData.modisNdvi.mean >= objective.threshold;
      }
      return value >= objective.threshold;

    case 'check_temperature':
      if (nasaData?.powerData) {
        // Check temperature from NASA POWER data
        return true; // Implement actual check
      }
      return value <= objective.maxTemp;

    case 'plant_crop':
      return value >= objective.amount;

    case 'harvest_crop':
      return value >= objective.yield;

    default:
      return value >= (objective.target || objective.amount || 1);
  }
}

/**
 * Get user campaign progress
 */
export const getUserProgress = async (userId) => {
  const docSnap = await getDoc(doc(db, USER_PROGRESS_COLLECTION, userId));

  if (!docSnap.exists()) {
    const defaultProgress = {
      userId,
      level: 0,
      xp: 0,
      coins: 0,
      completedMissions: [],
      unlockedContent: ['mission_1'],
      badges: [],
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, USER_PROGRESS_COLLECTION, userId), defaultProgress);
    return defaultProgress;
  }

  return docSnap.data();
};

/**
 * Calculate level from XP
 */
function calculateLevel(xp) {
  // 200 XP per level, exponential growth
  return Math.floor(Math.sqrt(xp / 100));
}

/**
 * Retry failed mission
 */
export const retryMission = async (userId, missionId) => {
  // Delete failed attempt
  const q = query(
    collection(db, 'active_missions'),
    where('userId', '==', userId),
    where('missionId', '==', missionId),
    where('status', '==', 'failed'),
    limit(1)
  );
  const activeMission = await getDocs(q);

  if (!activeMission.empty) {
    await activeMission.docs[0].ref.delete();
  }

  // Start fresh
  return startMission(userId, missionId);
};

/**
 * Enable easier difficulty
 */
export const enableEasyMode = async (userId, missionId) => {
  const mission = CAMPAIGN_MISSIONS[missionId];
  
  if (!mission) {
    throw new Error('Mission not found');
  }

  // Reduce objectives by 20%
  const easyMission = {
    ...mission,
    difficulty: 'easy',
    objectives: mission.objectives.map(obj => ({
      ...obj,
      amount: obj.amount ? Math.floor(obj.amount * 0.8) : obj.amount,
      threshold: obj.threshold ? obj.threshold * 0.8 : obj.threshold,
      points: Math.floor(obj.points * 0.7), // Reduced rewards
    })),
    rewards: {
      ...mission.rewards,
      xp: Math.floor(mission.rewards.xp * 0.7),
      coins: Math.floor(mission.rewards.coins * 0.7),
    },
  };

  return {
    success: true,
    mission: easyMission,
  };
};
