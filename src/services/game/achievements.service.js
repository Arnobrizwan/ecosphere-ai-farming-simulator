/**
 * UC11/UC12 - Feature Unlocks and Achievements Service
 * Unlock advanced mechanics and award achievements based on progress
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { recordActivity } from './progress.service';

const ACHIEVEMENTS_COLLECTION = 'user_achievements';
const UNLOCKS_COLLECTION = 'user_unlocks';

// Achievement catalog
export const ACHIEVEMENTS = {
  first_steps: {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Complete your first tutorial',
    icon: '🎓',
    category: 'tutorial',
    criteria: { type: 'tutorial_completed', count: 1 },
    rewards: { xp: 50, badge: 'learner' },
  },
  green_thumb: {
    id: 'green_thumb',
    title: 'Green Thumb',
    description: 'Successfully plant 100 crops',
    icon: '🌱',
    category: 'farming',
    criteria: { type: 'crops_planted', count: 100 },
    rewards: { xp: 200, badge: 'green_thumb', unlocks: ['advanced_seeds'] },
  },
  satellite_expert: {
    id: 'satellite_expert',
    title: 'Satellite Expert',
    description: 'Use NASA satellite data 10 times',
    icon: '🛰️',
    category: 'satellite',
    criteria: { type: 'satellite_data_used', count: 10 },
    rewards: { xp: 300, badge: 'satellite_expert', unlocks: ['real_time_alerts'] },
  },
  water_master: {
    id: 'water_master',
    title: 'Water Master',
    description: 'Achieve 90% irrigation efficiency',
    icon: '💧',
    category: 'efficiency',
    criteria: { type: 'irrigation_efficiency', threshold: 90 },
    rewards: { xp: 400, badge: 'water_master', unlocks: ['drip_irrigation'] },
  },
  quiz_champion: {
    id: 'quiz_champion',
    title: 'Quiz Champion',
    description: 'Score 100% on any quiz',
    icon: '🏆',
    category: 'quiz',
    criteria: { type: 'quiz_score', threshold: 100 },
    rewards: { xp: 250, badge: 'quiz_champion', unlocks: ['expert_quizzes'] },
  },
  mission_master: {
    id: 'mission_master',
    title: 'Mission Master',
    description: 'Complete all campaign missions',
    icon: '🎯',
    category: 'campaign',
    criteria: { type: 'missions_completed', count: 'all' },
    rewards: { xp: 1000, badge: 'mission_master', unlocks: ['hard_mode', 'bonus_missions'] },
  },
  data_scientist: {
    id: 'data_scientist',
    title: 'Data Scientist',
    description: 'Analyze SMAP, MODIS, and Landsat data in one session',
    icon: '📊',
    category: 'satellite',
    criteria: { type: 'all_satellite_sources', required: ['SMAP', 'MODIS', 'Landsat'] },
    rewards: { xp: 500, badge: 'data_scientist', unlocks: ['ai_predictions'] },
  },
  streak_master: {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    category: 'engagement',
    criteria: { type: 'streak', count: 7 },
    rewards: { xp: 300, badge: 'streak_master', unlocks: ['daily_rewards'] },
  },
};

// Feature unlock catalog
export const UNLOCKABLE_FEATURES = {
  advanced_seeds: {
    id: 'advanced_seeds',
    title: 'Advanced Seeds',
    description: 'Access to high-yield crop varieties',
    type: 'gameplay',
    requiredXP: 500,
    requiredBadges: ['green_thumb'],
  },
  real_time_alerts: {
    id: 'real_time_alerts',
    title: 'Real-Time Alerts',
    description: 'Get instant notifications from NASA satellite data',
    type: 'feature',
    requiredXP: 750,
    requiredBadges: ['satellite_expert'],
  },
  drip_irrigation: {
    id: 'drip_irrigation',
    title: 'Drip Irrigation System',
    description: 'Advanced water-saving irrigation method',
    type: 'tool',
    requiredXP: 1000,
    requiredBadges: ['water_master'],
  },
  expert_quizzes: {
    id: 'expert_quizzes',
    title: 'Expert Quizzes',
    description: 'Challenging quizzes with bigger rewards',
    type: 'content',
    requiredXP: 600,
    requiredBadges: ['quiz_champion'],
  },
  hard_mode: {
    id: 'hard_mode',
    title: 'Hard Mode Campaigns',
    description: 'Extreme difficulty missions for veterans',
    type: 'content',
    requiredXP: 2000,
    requiredBadges: ['mission_master'],
  },
  ai_predictions: {
    id: 'ai_predictions',
    title: 'AI Yield Predictions',
    description: 'ML-powered crop yield forecasting using NASA models',
    type: 'feature',
    requiredXP: 1500,
    requiredBadges: ['data_scientist'],
  },
  daily_rewards: {
    id: 'daily_rewards',
    title: 'Daily Reward Bonuses',
    description: 'Extra XP and coins for daily login',
    type: 'feature',
    requiredXP: 800,
    requiredBadges: ['streak_master'],
  },
};

/**
 * Check and award achievement
 */
export const checkAchievement = async (userId, achievementId, actionData = {}) => {
  const achievement = ACHIEVEMENTS[achievementId];
  
  if (!achievement) {
    throw new Error('Achievement not found');
  }

  // Check if already earned
  const userAchievements = await getUserAchievements(userId);
  
  if (userAchievements.earned?.includes(achievementId)) {
    return {
      success: false,
      message: 'Achievement already earned',
    };
  }

  // Validate criteria
  const meetsRequirements = await validateAchievementCriteria(
    userId,
    achievement.criteria,
    actionData
  );

  if (!meetsRequirements) {
    return {
      success: false,
      message: 'Criteria not met',
    };
  }

  // Award achievement
  await awardAchievement(userId, achievement);

  return {
    success: true,
    achievement,
    rewards: achievement.rewards,
  };
};

/**
 * Validate achievement criteria
 */
async function validateAchievementCriteria(userId, criteria, actionData) {
  const { type, count, threshold, required } = criteria;

  switch (type) {
    case 'tutorial_completed':
      const tutorialCount = await getTutorialCount(userId);
      return tutorialCount >= count;

    case 'crops_planted':
      return actionData.totalCropsPlanted >= count;

    case 'satellite_data_used':
      const satUsageCount = await getSatelliteUsageCount(userId);
      return satUsageCount >= count;

    case 'irrigation_efficiency':
      return actionData.efficiency >= threshold;

    case 'quiz_score':
      return actionData.score >= threshold;

    case 'missions_completed':
      if (count === 'all') {
        const missions = await getDoc(doc(db, 'user_campaign_progress', userId));
        const totalMissions = Object.keys(require('./campaign.service').CAMPAIGN_MISSIONS).length;
        return missions.data()?.completedMissions?.length >= totalMissions;
      }
      return actionData.missionsCompleted >= count;

    case 'all_satellite_sources':
      return required.every(source => actionData.usedSources?.includes(source));

    case 'streak':
      return actionData.streakDays >= count;

    default:
      return false;
  }
}

/**
 * Award achievement
 */
async function awardAchievement(userId, achievement) {
  const userAchievements = await getUserAchievements(userId);

  // Add to earned achievements
  const earned = [...(userAchievements.earned || []), achievement.id];
  const badges = [...(userAchievements.badges || [])];
  
  if (achievement.rewards.badge && !badges.includes(achievement.rewards.badge)) {
    badges.push(achievement.rewards.badge);
  }

  // Update user achievements
  await setDoc(doc(db, ACHIEVEMENTS_COLLECTION, userId), {
    userId,
    earned,
    badges,
    lastEarned: {
      achievementId: achievement.id,
      earnedAt: new Date().toISOString(),
    },
  }, { merge: true });

  // Award XP
  if (achievement.rewards.xp) {
    await recordActivity(userId, 'achievement_earned', {
      achievementId: achievement.id,
      xp: achievement.rewards.xp,
    });
  }

  // Process unlocks
  if (achievement.rewards.unlocks) {
    for (const featureId of achievement.rewards.unlocks) {
      await processUnlock(userId, featureId);
    }
  }

  // Trigger celebration notification
  await addDoc(collection(db, 'notifications'), {
    userId,
    type: 'achievement',
    title: `Achievement Unlocked: ${achievement.title}`,
    message: achievement.description,
    icon: achievement.icon,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Process feature unlock
 */
async function processUnlock(userId, featureId) {
  const feature = UNLOCKABLE_FEATURES[featureId];
  
  if (!feature) return;

  const userUnlocks = await getUserUnlocks(userId);
  
  if (userUnlocks.unlocked?.includes(featureId)) {
    return; // Already unlocked
  }

  // Unlock feature
  await setDoc(doc(db, UNLOCKS_COLLECTION, userId), {
    userId,
    unlocked: [...(userUnlocks.unlocked || []), featureId],
    lastUnlocked: {
      featureId,
      unlockedAt: new Date().toISOString(),
    },
  }, { merge: true });

  // Notification
  await addDoc(collection(db, 'notifications'), {
    userId,
    type: 'feature_unlock',
    title: `Feature Unlocked: ${feature.title}`,
    message: feature.description,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check feature unlock eligibility
 */
export const checkFeatureUnlock = async (userId, featureId) => {
  const feature = UNLOCKABLE_FEATURES[featureId];
  
  if (!feature) {
    throw new Error('Feature not found');
  }

  // Check if already unlocked
  const userUnlocks = await getUserUnlocks(userId);
  
  if (userUnlocks.unlocked?.includes(featureId)) {
    return {
      success: true,
      unlocked: true,
    };
  }

  // Check requirements
  const progress = await getDoc(doc(db, 'user_learning_progress', userId));
  const userProgress = progress.data() || {};
  const userAchievements = await getUserAchievements(userId);

  const meetsXP = userProgress.totalXP >= feature.requiredXP;
  const meetsBadges = feature.requiredBadges?.every(badge => 
    userAchievements.badges?.includes(badge)
  ) ?? true;

  if (meetsXP && meetsBadges) {
    // Auto-unlock
    await processUnlock(userId, featureId);
    
    return {
      success: true,
      unlocked: true,
      autoUnlocked: true,
    };
  }

  return {
    success: false,
    unlocked: false,
    requirements: {
      xpNeeded: Math.max(0, feature.requiredXP - (userProgress.totalXP || 0)),
      badgesNeeded: feature.requiredBadges?.filter(badge => 
        !userAchievements.badges?.includes(badge)
      ) || [],
    },
  };
};

/**
 * Get user achievements
 */
export const getUserAchievements = async (userId) => {
  const docSnap = await getDoc(doc(db, ACHIEVEMENTS_COLLECTION, userId));

  if (!docSnap.exists()) {
    const defaultData = {
      userId,
      earned: [],
      badges: [],
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, ACHIEVEMENTS_COLLECTION, userId), defaultData);
    return defaultData;
  }

  return docSnap.data();
};

/**
 * Get user unlocks
 */
export const getUserUnlocks = async (userId) => {
  const docSnap = await getDoc(doc(db, UNLOCKS_COLLECTION, userId));

  if (!docSnap.exists()) {
    const defaultData = {
      userId,
      unlocked: [],
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, UNLOCKS_COLLECTION, userId), defaultData);
    return defaultData;
  }

  return docSnap.data();
};

/**
 * Helper functions
 */
async function getTutorialCount(userId) {
  const docSnap = await getDoc(doc(db, 'user_tutorial_progress', userId));
  return docSnap.data()?.completedTutorials?.length || 0;
}

async function getSatelliteUsageCount(userId) {
  const q = query(
    collection(db, 'user_activities'),
    where('userId', '==', userId),
    where('type', '==', 'satellite_data_used')
  );
  const activities = await getDocs(q);

  return activities.size;
}
