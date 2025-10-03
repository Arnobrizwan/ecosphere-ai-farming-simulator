/**
 * UC10 - Learning Progress Tracking Service
 * Comprehensive progress dashboard with KPIs and visualizations
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getUserProgress as getCampaignProgress } from './campaign.service';
import { getUserTutorialProgress } from './tutorial.service';
import { getUserQuizProgress } from './quiz.service';

const USER_PROGRESS_COLLECTION = 'user_learning_progress';

/**
 * Get comprehensive learning progress
 */
export const getLearningProgress = async (userId) => {
  // Aggregate data from all sources
  const [campaignData, tutorialData, quizData, achievementsData] = await Promise.all([
    getCampaignProgress(userId),
    getUserTutorialProgress(userId),
    getUserQuizProgress(userId),
    getAchievements(userId),
  ]);

  // Calculate total XP
  const totalXP = (campaignData.xp || 0) + (tutorialData.xp || 0) + (quizData.xp || 0);

  // Calculate level from total XP
  const level = calculateLevel(totalXP);

  // Calculate XP for next level
  const currentLevelXP = getLevelXP(level);
  const nextLevelXP = getLevelXP(level + 1);
  const xpProgress = ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  // Aggregate badges
  const allBadges = [
    ...(campaignData.badges || []),
    ...(tutorialData.badges || []),
    ...(quizData.badges || []),
    ...(achievementsData.badges || []),
  ];
  const uniqueBadges = [...new Set(allBadges)];

  // Calculate completion stats
  const completionStats = {
    missions: {
      completed: campaignData.completedMissions?.length || 0,
      total: Object.keys(require('./campaign.service').CAMPAIGN_MISSIONS).length,
      percentage: ((campaignData.completedMissions?.length || 0) / Object.keys(require('./campaign.service').CAMPAIGN_MISSIONS).length * 100).toFixed(1),
    },
    tutorials: {
      completed: tutorialData.completedTutorials?.length || 0,
      total: Object.keys(require('./tutorial.service').TUTORIALS).length,
      percentage: ((tutorialData.completedTutorials?.length || 0) / Object.keys(require('./tutorial.service').TUTORIALS).length * 100).toFixed(1),
    },
    quizzes: {
      completed: quizData.totalQuizzes || 0,
      averageScore: quizData.averageScore?.toFixed(1) || 0,
    },
  };

  // Get streak data
  const streakData = await calculateStreak(userId);

  // Get unlocked features
  const unlockedFeatures = [
    ...(campaignData.unlockedContent || []),
    ...(achievementsData.unlockedFeatures || []),
  ];

  const progress = {
    userId,
    level,
    totalXP,
    xpProgress: xpProgress.toFixed(1),
    nextLevelXP: nextLevelXP - totalXP,
    badges: uniqueBadges,
    badgeCount: uniqueBadges.length,
    completion: completionStats,
    streak: streakData,
    unlockedFeatures,
    kpis: {
      missionSuccessRate: calculateMissionSuccessRate(campaignData),
      averageQuizScore: quizData.averageScore?.toFixed(1) || 0,
      tutorialCompletionRate: completionStats.tutorials.percentage,
      totalPlaytime: await getTotalPlaytime(userId),
    },
    recentActivity: await getRecentActivity(userId),
    updatedAt: new Date().toISOString(),
  };

  // Store aggregated progress
  await setDoc(doc(db, USER_PROGRESS_COLLECTION, userId), progress, { merge: true });

  return {
    success: true,
    progress,
  };
};

/**
 * Calculate user level from XP
 */
function calculateLevel(xp) {
  // Quadratic progression: level = sqrt(xp / 100)
  return Math.floor(Math.sqrt(xp / 100));
}

/**
 * Get XP required for level
 */
function getLevelXP(level) {
  return level * level * 100;
}

/**
 * Calculate mission success rate
 */
function calculateMissionSuccessRate(campaignData) {
  const completed = campaignData.completedMissions?.length || 0;
  const failed = campaignData.failedMissions?.length || 0;
  const total = completed + failed;
  
  if (total === 0) return 100;
  
  return ((completed / total) * 100).toFixed(1);
}

/**
 * Calculate learning streak
 */
async function calculateStreak(userId) {
  const q = query(
    collection(db, 'user_activities'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(30)
  );
  const activities = await getDocs(q);

  if (activities.empty) {
    return {
      current: 0,
      longest: 0,
      lastActive: null,
    };
  }

  const dates = activities.docs.map(doc => doc.data().date);
  const uniqueDates = [...new Set(dates)].sort().reverse();

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (uniqueDates[i] === expectedDate) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastActive: uniqueDates[0],
  };
}

/**
 * Get total playtime
 */
async function getTotalPlaytime(userId) {
  const q = query(
    collection(db, 'user_sessions'),
    where('userId', '==', userId)
  );
  const sessions = await getDocs(q);

  const totalMinutes = sessions.docs.reduce((sum, doc) => {
    const session = doc.data();
    if (session.endedAt && session.startedAt) {
      const duration = new Date(session.endedAt) - new Date(session.startedAt);
      return sum + (duration / 60000); // Convert to minutes
    }
    return sum;
  }, 0);

  return {
    minutes: Math.floor(totalMinutes),
    hours: (totalMinutes / 60).toFixed(1),
    formatted: formatPlaytime(totalMinutes),
  };
}

/**
 * Format playtime
 */
function formatPlaytime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Get recent activity
 */
async function getRecentActivity(userId) {
  const q = query(
    collection(db, 'user_activities'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(10)
  );
  const activities = await getDocs(q);

  return activities.docs.map(doc => doc.data());
}

/**
 * Get achievements
 */
async function getAchievements(userId) {
  const docSnap = await getDoc(doc(db, 'user_achievements', userId));

  if (!docSnap.exists()) {
    return { badges: [], unlockedFeatures: [] };
  }

  return docSnap.data();
}

/**
 * Get progress history (for charts)
 */
export const getProgressHistory = async (userId, days = 30) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const q = query(
    collection(db, 'user_activities'),
    where('userId', '==', userId),
    where('timestamp', '>=', startDate.toISOString()),
    orderBy('timestamp', 'asc')
  );
  const activities = await getDocs(q);

  // Group by date
  const dailyData = {};
  
  activities.docs.forEach(doc => {
    const activity = doc.data();
    const date = activity.date || activity.timestamp.split('T')[0];
    
    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        xpEarned: 0,
        missionsCompleted: 0,
        tutorialsCompleted: 0,
        quizzesTaken: 0,
      };
    }
    
    if (activity.type === 'mission_completed') {
      dailyData[date].missionsCompleted++;
      dailyData[date].xpEarned += activity.xp || 0;
    } else if (activity.type === 'tutorial_completed') {
      dailyData[date].tutorialsCompleted++;
      dailyData[date].xpEarned += activity.xp || 0;
    } else if (activity.type === 'quiz_completed') {
      dailyData[date].quizzesTaken++;
      dailyData[date].xpEarned += activity.xp || 0;
    }
  });

  const history = Object.values(dailyData).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  return {
    success: true,
    history,
  };
};

/**
 * Record activity
 */
export const recordActivity = async (userId, activityType, data = {}) => {
  const activity = {
    userId,
    type: activityType,
    ...data,
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
  };

  await addDoc(collection(db, 'user_activities'), activity);

  return {
    success: true,
  };
};

/**
 * Get personalized achievements list
 */
export const getPersonalizedAchievements = async (userId) => {
  const progress = await getLearningProgress(userId);
  
  const recommendations = [];

  // Recommend next mission
  if (progress.progress.completion.missions.completed < progress.progress.completion.missions.total) {
    recommendations.push({
      type: 'mission',
      title: 'Continue Campaign',
      description: 'Complete your next mission to unlock rewards',
      priority: 'high',
    });
  }

  // Recommend tutorials
  if (progress.progress.completion.tutorials.percentage < 100) {
    recommendations.push({
      type: 'tutorial',
      title: 'Learn New Skills',
      description: 'Complete tutorials to master farming techniques',
      priority: 'medium',
    });
  }

  // Recommend quiz if low score
  if (progress.progress.kpis.averageQuizScore < 80) {
    recommendations.push({
      type: 'quiz',
      title: 'Improve Your Score',
      description: 'Retake quizzes to boost your knowledge',
      priority: 'medium',
    });
  }

  return {
    success: true,
    recommendations,
  };
};
