
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import { signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import Constants from 'expo-constants';
import { auth, db } from './firebase.config';

// Data from achievement.service.js
const ACHIEVEMENTS = [
  // Milestone Category
  {
    id: 'welcomeAboard',
    name: 'Welcome Aboard',
    description: 'Complete registration and profile setup',
    icon: '👋',
    category: 'milestone',
    rarity: 'common',
    criteria: {
      type: 'profileComplete',
      condition: { profileComplete: true },
      multiStep: false
    },
    rewards: { xp: 50, coins: 25, title: null },
    secretBadge: false,
    displayOrder: 1
  },
  {
    id: 'firstSteps',
    name: 'First Steps',
    description: 'Complete your first tutorial',
    icon: '📚',
    category: 'milestone',
    rarity: 'common',
    criteria: {
      type: 'tutorialComplete',
      condition: { count: 1 },
      multiStep: false
    },
    rewards: { xp: 75, coins: 35, title: null },
    secretBadge: false,
    displayOrder: 2
  },
  {
    id: 'farmerInTraining',
    name: 'Farmer in Training',
    description: 'Complete 3 missions',
    icon: '🌱',
    category: 'milestone',
    rarity: 'rare',
    criteria: {
      type: 'missionCount',
      condition: { count: 3 },
      multiStep: false
    },
    rewards: { xp: 150, coins: 75, title: 'Trainee' },
    secretBadge: false,
    displayOrder: 3
  },
  {
    id: 'masterFarmer',
    name: 'Master Farmer',
    description: 'Complete all campaign missions',
    icon: '🏆',
    category: 'milestone',
    rarity: 'legendary',
    criteria: {
      type: 'missionCount',
      condition: { count: 14 },
      multiStep: false
    },
    rewards: { xp: 1000, coins: 500, title: 'Master Farmer' },
    secretBadge: false,
    displayOrder: 4
  },
  
  // Mastery Category
  {
    id: 'quickLearner',
    name: 'Quick Learner',
    description: 'Complete 3 tutorials',
    icon: '🎓',
    category: 'mastery',
    rarity: 'common',
    criteria: {
      type: 'tutorialComplete',
      condition: { count: 3 },
      multiStep: false
    },
    rewards: { xp: 100, coins: 50, title: null },
    secretBadge: false,
    displayOrder: 5
  },
  {
    id: 'quizMaster',
    name: 'Quiz Master',
    description: 'Pass 10 quizzes',
    icon: '📝',
    category: 'mastery',
    rarity: 'rare',
    criteria: {
      type: 'quizCount',
      condition: { count: 10 },
      multiStep: false
    },
    rewards: { xp: 200, coins: 100, title: 'Quiz Master' },
    secretBadge: false,
    displayOrder: 6
  },
  {
    id: 'perfectScore',
    name: 'Perfect Score',
    description: 'Get 100% on any quiz',
    icon: '⭐',
    category: 'mastery',
    rarity: 'rare',
    criteria: {
      type: 'quizPerfect',
      condition: { score: 100 },
      multiStep: false
    },
    rewards: { xp: 150, coins: 75, title: null },
    secretBadge: false,
    displayOrder: 7
  },
  {
    id: 'straightAs',
    name: "Straight As",
    description: 'Get 100% on 5 quizzes',
    icon: '🌟',
    category: 'mastery',
    rarity: 'epic',
    criteria: {
      type: 'perfectQuizCount',
      condition: { count: 5 },
      multiStep: false
    },
    rewards: { xp: 500, coins: 250, title: 'Perfect Scholar' },
    secretBadge: false,
    displayOrder: 8
  },
  
  // Challenge Category
  {
    id: 'earlyBird',
    name: 'Early Bird',
    description: 'Log in for 7 consecutive days',
    icon: '🔥',
    category: 'challenge',
    rarity: 'rare',
    criteria: {
      type: 'streakDays',
      condition: { consecutiveDays: 7 },
      multiStep: false
    },
    rewards: { xp: 150, coins: 75, title: 'Dedicated Farmer' },
    secretBadge: false,
    displayOrder: 9
  },
  {
    id: 'marathonRunner',
    name: 'Marathon Runner',
    description: 'Log in for 30 consecutive days',
    icon: '🏃',
    category: 'challenge',
    rarity: 'epic',
    criteria: {
      type: 'streakDays',
      condition: { consecutiveDays: 30 },
      multiStep: false
    },
    rewards: { xp: 500, coins: 250, title: 'Committed Farmer' },
    secretBadge: false,
    displayOrder: 10
  },
  {
    id: 'levelUp5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: '⚡',
    category: 'challenge',
    rarity: 'rare',
    criteria: {
      type: 'levelReached',
      condition: { level: 5 },
      multiStep: false
    },
    rewards: { xp: 200, coins: 100, title: 'Rising Star' },
    secretBadge: false,
    displayOrder: 11
  },
  {
    id: 'levelUp10',
    name: 'Elite Farmer',
    description: 'Reach Level 10',
    icon: '💎',
    category: 'challenge',
    rarity: 'legendary',
    criteria: {
      type: 'levelReached',
      condition: { level: 10 },
      multiStep: false
    },
    rewards: { xp: 1000, coins: 500, title: 'Elite Farmer' },
    secretBadge: false,
    displayOrder: 12
  },
  
  // Secret Achievements
  {
    id: 'nasaExplorer',
    name: 'NASA Explorer',
    description: 'View all NASA data layers',
    icon: '🛰️',
    category: 'mastery',
    rarity: 'rare',
    criteria: {
      type: 'nasaDataViewed',
      condition: { layersViewed: 4 },
      multiStep: false
    },
    rewards: { xp: 250, coins: 125, title: 'Data Explorer' },
    secretBadge: true,
    displayOrder: 13
  },
  {
    id: 'firstHarvest',
    name: 'First Harvest',
    description: 'Complete your first farming mission',
    icon: '🌾',
    category: 'milestone',
    rarity: 'common',
    criteria: {
      type: 'missionComplete',
      condition: { missionId: 'm1_1' },
      multiStep: false
    },
    rewards: { xp: 100, coins: 50, title: 'Harvest Hero' },
    secretBadge: false,
    displayOrder: 14
  }
];

// Data from unlock.service.js
const UNLOCK_RULES = [
  {
    featureId: 'campaignMode',
    displayName: 'Campaign Mode',
    description: 'Complete missions and learn farming skills',
    icon: '🎯',
    requirements: {
      minXP: 0,
      minLevel: 1,
      tutorialsCompleted: [],
      missionsCompleted: [],
      quizzesPassed: [],
      badgesRequired: [],
      daysActive: 0,
      operator: 'AND'
    },
    category: 'gameMode',
    benefitText: 'Start your farming journey!',
    previewAvailable: true,
    defaultUnlocked: true
  },
  {
    featureId: 'quizSystem',
    displayName: 'Quiz System',
    description: 'Test your knowledge with interactive quizzes',
    icon: '📝',
    requirements: {
      minXP: 100,
      minLevel: 2,
      tutorialsCompleted: ['welcome'],
      missionsCompleted: [],
      quizzesPassed: [],
      badgesRequired: [],
      daysActive: 0,
      operator: 'AND'
    },
    category: 'tool',
    benefitText: 'Test your farming knowledge!',
    previewAvailable: true,
    defaultUnlocked: false
  },
  {
    featureId: 'sandboxMode',
    displayName: 'Sandbox Mode',
    description: 'Experiment with farming scenarios freely',
    icon: '🧪',
    requirements: {
      minXP: 300,
      minLevel: 3,
      tutorialsCompleted: ['welcome', 'satellite_data'],
      missionsCompleted: [],
      quizzesPassed: [],
      badgesRequired: [],
      daysActive: 0,
      operator: 'AND'
    },
    category: 'gameMode',
    benefitText: 'Experiment without limits!',
    previewAvailable: true,
    defaultUnlocked: false
  },
  {
    featureId: 'advancedMissions',
    displayName: 'Advanced Missions',
    description: 'Tackle challenging farming scenarios',
    icon: '🏆',
    requirements: {
      minXP: 500,
      minLevel: 4,
      tutorialsCompleted: ['welcome', 'satellite_data', 'first_crop'],
      missionsCompleted: ['m1_1', 'm1_2', 'm1_3'],
      quizzesPassed: ['soil_moisture_basics'],
      badgesRequired: [],
      daysActive: 0,
      operator: 'AND'
    },
    category: 'gameMode',
    benefitText: 'Challenge yourself with complex scenarios!',
    previewAvailable: true,
    defaultUnlocked: false
  },
  {
    featureId: 'communityAccess',
    displayName: 'Community Platform',
    description: 'Connect with other farmers and share knowledge',
    icon: '👥',
    requirements: {
      minXP: 750,
      minLevel: 5,
      tutorialsCompleted: ['welcome', 'satellite_data'],
      missionsCompleted: [],
      quizzesPassed: ['soil_moisture_basics', 'reading_ndvi'],
      badgesRequired: [],
      daysActive: 7,
      operator: 'AND'
    },
    category: 'social',
    benefitText: 'Learn from the farming community!',
    previewAvailable: false,
    defaultUnlocked: false
  },
  {
    featureId: 'expertNetwork',
    displayName: 'Expert Network',
    description: 'Get advice from agricultural experts',
    icon: '🎓',
    requirements: {
      minXP: 1000,
      minLevel: 6,
      tutorialsCompleted: ['welcome', 'satellite_data', 'first_crop', 'nasa_decisions'],
      missionsCompleted: ['m1_1', 'm1_2', 'm1_3', 'm2_1', 'm2_2'],
      quizzesPassed: ['soil_moisture_basics', 'reading_ndvi', 'rainfall_patterns'],
      badgesRequired: ['quiz_master'],
      daysActive: 14,
      operator: 'AND'
    },
    category: 'social',
    benefitText: 'Connect with agricultural professionals!',
    previewAvailable: false,
    defaultUnlocked: false
  },
  {
    featureId: 'advancedAnalytics',
    displayName: 'Advanced Analytics',
    description: 'Deep insights into your farming data',
    icon: '📊',
    requirements: {
      minXP: 1500,
      minLevel: 7,
      tutorialsCompleted: ['welcome', 'satellite_data', 'first_crop', 'nasa_decisions'],
      missionsCompleted: ['m1_1', 'm1_2', 'm1_3', 'm2_1', 'm2_2', 'm2_3', 'm2_4'],
      quizzesPassed: ['soil_moisture_basics', 'reading_ndvi', 'rainfall_patterns'],
      badgesRequired: [],
      daysActive: 0,
      operator: 'AND'
    },
    category: 'tool',
    benefitText: 'Unlock powerful data analysis tools!',
    previewAvailable: true,
    defaultUnlocked: false
  }
];

const getSeedCredentials = () => {
  const extra = Constants?.expoConfig?.extra ?? {};

  const email = extra.seedEmail ?? process.env.EXPO_PUBLIC_SEED_EMAIL;
  const password = extra.seedPassword ?? process.env.EXPO_PUBLIC_SEED_PASSWORD;

  if (email && password) {
    return { email, password };
  }

  return null;
};

const ensureSeedAuth = async () => {
  if (auth.currentUser) {
    return;
  }

  const seedCredentials = getSeedCredentials();

  try {
    if (seedCredentials) {
      await signInWithEmailAndPassword(auth, seedCredentials.email, seedCredentials.password);
      console.log('Authenticated with seed credentials for seeding.');
      return;
    }

    await signInAnonymously(auth);
    console.log('Authenticated anonymously for seeding.');
  } catch (error) {
    if (seedCredentials) {
      console.error('Unable to authenticate with seed credentials for seeding:', error);
    } else if (error?.code === 'auth/admin-restricted-operation' || error?.code === 'auth/operation-not-allowed') {
      console.error(
        'Anonymous authentication is disabled for this Firebase project. Set EXPO_PUBLIC_SEED_EMAIL and EXPO_PUBLIC_SEED_PASSWORD or sign in manually before seeding.'
      );
    } else {
      console.error('Unable to authenticate for seeding:', error);
    }
    throw error;
  }
};

const seedCollection = async (collectionName, data) => {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) {
      console.log(`Seeding ${collectionName}...`);
      const batch = writeBatch(db);
      data.forEach((item) => {
        const docRef = doc(collectionRef, item.id || item.featureId);
        batch.set(docRef, item);
      });
      await batch.commit();
      console.log(`${collectionName} seeded successfully.`);
    } else {
      console.log(`${collectionName} already contains data. Skipping seeding.`);
    }
  } catch (error) {
    console.error(`Error seeding ${collectionName}:`, error);
  }
};

export const seedDatabase = async () => {
  try {
    await ensureSeedAuth();
  } catch (error) {
    return;
  }

  await seedCollection('achievements', ACHIEVEMENTS);
  await seedCollection('unlock_rules', UNLOCK_RULES);
};

// To run this seeder, you could add a button or a command in your app that calls seedDatabase.
// For example, in a development screen:
// import { seedDatabase } from './services/seed';
// <Button title="Seed Database" onPress={seedDatabase} />
