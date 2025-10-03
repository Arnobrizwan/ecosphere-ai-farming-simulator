import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.config';
import { useGameState } from '../../game2d/GameStateContext';
import { ENHANCED_MISSIONS, CAMPAIGN_STORY, MISSION_CATEGORIES } from '../../data/campaignMissions';
import { CHARACTERS } from '../../data/characters';
import StoryNarrative from '../../components/StoryNarrative';

const { width } = Dimensions.get('window');

// Use enhanced missions with characters and story
const MISSIONS_DATA = ENHANCED_MISSIONS.length > 0 ? ENHANCED_MISSIONS : [
  // Chapter 1: Getting Started
  {
    id: 'm1_1',
    chapterNumber: 1,
    missionNumber: 1,
    title: 'Set Up Your First Field',
    description: 'Learn the basics of farm setup by creating your first field and selecting a crop.',
    difficulty: 'beginner',
    objectives: [
      { id: 'obj1', text: 'Select a location on your farm', completed: false, type: 'action' },
      { id: 'obj2', text: 'Choose your first crop', completed: false, type: 'action' },
      { id: 'obj3', text: 'Set planting date', completed: false, type: 'action' }
    ],
    rewards: { xp: 100, coins: 50, badges: ['first_field'] },
    unlockRequirements: { previousMissions: [], xpRequired: 0 },
    estimatedTime: '10 min',
    realWorldSkill: 'Farm Planning',
    nasaDataUsed: []
  },
  {
    id: 'm1_2',
    chapterNumber: 1,
    missionNumber: 2,
    title: 'Understanding Your Soil',
    description: 'Discover the importance of soil type and how it affects your crops.',
    difficulty: 'beginner',
    objectives: [
      { id: 'obj1', text: 'Check your soil type', completed: false, type: 'info' },
      { id: 'obj2', text: 'Learn about soil properties', completed: false, type: 'tutorial' },
      { id: 'obj3', text: 'Match crops to soil type', completed: false, type: 'quiz' }
    ],
    rewards: { xp: 150, coins: 75, badges: ['soil_expert'] },
    unlockRequirements: { previousMissions: ['m1_1'], xpRequired: 100 },
    estimatedTime: '15 min',
    realWorldSkill: 'Soil Analysis',
    nasaDataUsed: []
  },
  {
    id: 'm1_3',
    chapterNumber: 1,
    missionNumber: 3,
    title: 'First Planting Season',
    description: 'Plan and execute your first planting season with proper timing.',
    difficulty: 'beginner',
    objectives: [
      { id: 'obj1', text: 'Check seasonal calendar', completed: false, type: 'info' },
      { id: 'obj2', text: 'Prepare field for planting', completed: false, type: 'action' },
      { id: 'obj3', text: 'Plant your first crop', completed: false, type: 'action' }
    ],
    rewards: { xp: 200, coins: 100, badges: ['first_planting'] },
    unlockRequirements: { previousMissions: ['m1_2'], xpRequired: 250 },
    estimatedTime: '20 min',
    realWorldSkill: 'Seasonal Planning',
    nasaDataUsed: []
  },
  
  // Chapter 2: Water Management
  {
    id: 'm2_1',
    chapterNumber: 2,
    missionNumber: 1,
    title: 'Understanding Soil Moisture',
    description: 'Learn to monitor soil moisture levels using NASA SMAP satellite data.',
    difficulty: 'intermediate',
    objectives: [
      { id: 'obj1', text: 'Access SMAP soil moisture data', completed: false, type: 'action' },
      { id: 'obj2', text: 'Identify dry zones in your field', completed: false, type: 'analysis' },
      { id: 'obj3', text: 'Plan irrigation schedule', completed: false, type: 'action' }
    ],
    rewards: { xp: 250, coins: 150, badges: ['water_wise'] },
    unlockRequirements: { previousMissions: ['m1_3'], xpRequired: 450 },
    estimatedTime: '25 min',
    realWorldSkill: 'Irrigation Planning',
    nasaDataUsed: ['SMAP']
  },
  {
    id: 'm2_2',
    chapterNumber: 2,
    missionNumber: 2,
    title: 'Rainfall Prediction',
    description: 'Use NASA IMERG precipitation data to predict rainfall and optimize irrigation.',
    difficulty: 'intermediate',
    objectives: [
      { id: 'obj1', text: 'Check IMERG rainfall forecast', completed: false, type: 'info' },
      { id: 'obj2', text: 'Adjust irrigation based on forecast', completed: false, type: 'action' },
      { id: 'obj3', text: 'Save water resources', completed: false, type: 'achievement' }
    ],
    rewards: { xp: 300, coins: 200, badges: ['rain_master'] },
    unlockRequirements: { previousMissions: ['m2_1'], xpRequired: 700 },
    estimatedTime: '30 min',
    realWorldSkill: 'Weather Forecasting',
    nasaDataUsed: ['IMERG']
  },
  {
    id: 'm2_3',
    chapterNumber: 2,
    missionNumber: 3,
    title: 'Efficient Irrigation',
    description: 'Implement efficient irrigation techniques to conserve water.',
    difficulty: 'intermediate',
    objectives: [
      { id: 'obj1', text: 'Calculate water requirements', completed: false, type: 'calculation' },
      { id: 'obj2', text: 'Set up drip irrigation', completed: false, type: 'action' },
      { id: 'obj3', text: 'Monitor water usage', completed: false, type: 'tracking' }
    ],
    rewards: { xp: 350, coins: 250, badges: ['irrigation_pro'] },
    unlockRequirements: { previousMissions: ['m2_2'], xpRequired: 1000 },
    estimatedTime: '35 min',
    realWorldSkill: 'Water Conservation',
    nasaDataUsed: ['SMAP', 'IMERG']
  },
  {
    id: 'm2_4',
    chapterNumber: 2,
    missionNumber: 4,
    title: 'Drought Management',
    description: 'Learn strategies to manage your farm during drought conditions.',
    difficulty: 'advanced',
    objectives: [
      { id: 'obj1', text: 'Identify drought indicators', completed: false, type: 'analysis' },
      { id: 'obj2', text: 'Implement water-saving measures', completed: false, type: 'action' },
      { id: 'obj3', text: 'Protect crop yield', completed: false, type: 'achievement' }
    ],
    rewards: { xp: 400, coins: 300, badges: ['drought_survivor'] },
    unlockRequirements: { previousMissions: ['m2_3'], xpRequired: 1350 },
    estimatedTime: '40 min',
    realWorldSkill: 'Crisis Management',
    nasaDataUsed: ['SMAP', 'IMERG', 'MODIS']
  },
  
  // Chapter 3: Crop Health
  {
    id: 'm3_1',
    chapterNumber: 3,
    missionNumber: 1,
    title: 'Monitoring Crop Growth',
    description: 'Use satellite imagery to monitor your crop growth and health.',
    difficulty: 'intermediate',
    objectives: [
      { id: 'obj1', text: 'View NDVI vegetation index', completed: false, type: 'info' },
      { id: 'obj2', text: 'Identify healthy vs stressed areas', completed: false, type: 'analysis' },
      { id: 'obj3', text: 'Take corrective action', completed: false, type: 'action' }
    ],
    rewards: { xp: 300, coins: 200, badges: ['crop_monitor'] },
    unlockRequirements: { previousMissions: ['m2_4'], xpRequired: 1750 },
    estimatedTime: '30 min',
    realWorldSkill: 'Remote Sensing',
    nasaDataUsed: ['MODIS', 'Landsat']
  },
  {
    id: 'm3_2',
    chapterNumber: 3,
    missionNumber: 2,
    title: 'Pest Detection',
    description: 'Learn to detect early signs of pest infestation using data analysis.',
    difficulty: 'intermediate',
    objectives: [
      { id: 'obj1', text: 'Scan field for anomalies', completed: false, type: 'analysis' },
      { id: 'obj2', text: 'Identify pest patterns', completed: false, type: 'info' },
      { id: 'obj3', text: 'Apply treatment', completed: false, type: 'action' }
    ],
    rewards: { xp: 350, coins: 250, badges: ['pest_detective'] },
    unlockRequirements: { previousMissions: ['m3_1'], xpRequired: 2050 },
    estimatedTime: '35 min',
    realWorldSkill: 'Pest Management',
    nasaDataUsed: ['MODIS']
  },
  {
    id: 'm3_3',
    chapterNumber: 3,
    missionNumber: 3,
    title: 'Nutrient Management',
    description: 'Optimize fertilizer application based on crop needs and soil data.',
    difficulty: 'advanced',
    objectives: [
      { id: 'obj1', text: 'Analyze soil nutrient levels', completed: false, type: 'analysis' },
      { id: 'obj2', text: 'Calculate fertilizer needs', completed: false, type: 'calculation' },
      { id: 'obj3', text: 'Apply nutrients efficiently', completed: false, type: 'action' }
    ],
    rewards: { xp: 400, coins: 300, badges: ['nutrient_master'] },
    unlockRequirements: { previousMissions: ['m3_2'], xpRequired: 2400 },
    estimatedTime: '40 min',
    realWorldSkill: 'Soil Fertility',
    nasaDataUsed: []
  },
  {
    id: 'm3_4',
    chapterNumber: 3,
    missionNumber: 4,
    title: 'Disease Prevention',
    description: 'Implement preventive measures to protect crops from diseases.',
    difficulty: 'advanced',
    objectives: [
      { id: 'obj1', text: 'Monitor weather conditions', completed: false, type: 'tracking' },
      { id: 'obj2', text: 'Identify disease risk factors', completed: false, type: 'analysis' },
      { id: 'obj3', text: 'Apply preventive treatments', completed: false, type: 'action' }
    ],
    rewards: { xp: 450, coins: 350, badges: ['disease_preventer'] },
    unlockRequirements: { previousMissions: ['m3_3'], xpRequired: 2800 },
    estimatedTime: '45 min',
    realWorldSkill: 'Disease Management',
    nasaDataUsed: ['IMERG', 'MODIS']
  },
  
  // Chapter 4: Harvest & Market
  {
    id: 'm4_1',
    chapterNumber: 4,
    missionNumber: 1,
    title: 'Harvest Timing',
    description: 'Learn to determine the optimal harvest time for maximum yield.',
    difficulty: 'intermediate',
    objectives: [
      { id: 'obj1', text: 'Check crop maturity indicators', completed: false, type: 'info' },
      { id: 'obj2', text: 'Monitor weather for harvest window', completed: false, type: 'tracking' },
      { id: 'obj3', text: 'Execute harvest', completed: false, type: 'action' }
    ],
    rewards: { xp: 400, coins: 300, badges: ['harvest_expert'] },
    unlockRequirements: { previousMissions: ['m3_4'], xpRequired: 3250 },
    estimatedTime: '35 min',
    realWorldSkill: 'Harvest Planning',
    nasaDataUsed: ['IMERG']
  },
  {
    id: 'm4_2',
    chapterNumber: 4,
    missionNumber: 2,
    title: 'Yield Estimation',
    description: 'Use satellite data to estimate your crop yield before harvest.',
    difficulty: 'advanced',
    objectives: [
      { id: 'obj1', text: 'Analyze vegetation indices', completed: false, type: 'analysis' },
      { id: 'obj2', text: 'Calculate expected yield', completed: false, type: 'calculation' },
      { id: 'obj3', text: 'Compare with actual harvest', completed: false, type: 'comparison' }
    ],
    rewards: { xp: 450, coins: 350, badges: ['yield_predictor'] },
    unlockRequirements: { previousMissions: ['m4_1'], xpRequired: 3650 },
    estimatedTime: '40 min',
    realWorldSkill: 'Yield Prediction',
    nasaDataUsed: ['MODIS', 'Landsat']
  },
  {
    id: 'm4_3',
    chapterNumber: 4,
    missionNumber: 3,
    title: 'Market Strategy',
    description: 'Develop a strategy to sell your harvest at the best price.',
    difficulty: 'advanced',
    objectives: [
      { id: 'obj1', text: 'Research market prices', completed: false, type: 'info' },
      { id: 'obj2', text: 'Choose selling strategy', completed: false, type: 'decision' },
      { id: 'obj3', text: 'Complete sale', completed: false, type: 'action' }
    ],
    rewards: { xp: 500, coins: 400, badges: ['market_master', 'campaign_complete'] },
    unlockRequirements: { previousMissions: ['m4_2'], xpRequired: 4100 },
    estimatedTime: '45 min',
    realWorldSkill: 'Market Analysis',
    nasaDataUsed: []
  }
];

const CHAPTERS = [
  { number: 1, title: 'Getting Started', icon: '🌱', color: '#90EE90' },
  { number: 2, title: 'Water Management', icon: '💧', color: '#87CEEB' },
  { number: 3, title: 'Crop Health', icon: '🌾', color: '#FFD700' },
  { number: 4, title: 'Harvest & Market', icon: '🚜', color: '#FF8C00' }
];

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Beginner', color: '#90EE90', icon: '⭐' },
  intermediate: { label: 'Intermediate', color: '#FFD700', icon: '⭐⭐' },
  advanced: { label: 'Advanced', color: '#FF6347', icon: '⭐⭐⭐' }
};

export default function CampaignModeScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [showStoryNarrative, setShowStoryNarrative] = useState(false);
  const [storySegments, setStorySegments] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [userProgress, setUserProgress] = useState({
    completedMissions: [],
    currentXP: 0,
    totalCoins: 0,
    badges: [],
    currentMission: null
  });
  const [missions, setMissions] = useState(MISSIONS_DATA);
  const [expandedChapter, setExpandedChapter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unlockingAll, setUnlockingAll] = useState(false);
  const { startCampaignMission, completeCampaignMission, abortCampaignMission } = useGameState();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
      await loadGameProgress(user.uid);
    }
    setLoading(false);
  };

  const loadGameProgress = async (uid) => {
    try {
      const progressRef = doc(db, 'users', uid, 'gameProgress', 'campaign');
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        setUserProgress(progressSnap.data());
      } else {
        const defaultProgress = {
          completedMissions: [],
          currentXP: 0,
          totalCoins: 0,
          badges: [],
          currentMission: null,
        };
        await setDoc(progressRef, defaultProgress);
        setUserProgress(defaultProgress);
      }
    } catch (error) {
      console.log('Load progress error:', error);
    }
  };

  const persistProgress = async (progress) => {
    if (!userId) return;
    try {
      const progressRef = doc(db, 'users', userId, 'gameProgress', 'campaign');
      await setDoc(progressRef, progress);
      setUserProgress(progress);
    } catch (error) {
      console.log('Save progress error:', error);
    }
  };

  const isMissionUnlocked = (mission) => {
    // First mission is always unlocked
    if (mission.unlockRequirements.previousMissions.length === 0) {
      return true;
    }

    // Check if all previous missions are completed
    const allPreviousCompleted = mission.unlockRequirements.previousMissions.every(
      prevId => userProgress.completedMissions.includes(prevId)
    );

    // Check if user has enough XP
    const hasEnoughXP = userProgress.currentXP >= mission.unlockRequirements.xpRequired;

    return allPreviousCompleted && hasEnoughXP;
  };

  const isMissionCompleted = (missionId) => {
    return userProgress.completedMissions.includes(missionId);
  };

  const isMissionInProgress = (missionId) => {
    return userProgress.currentMission === missionId;
  };

  const getMissionStars = (missionId) => {
    // Placeholder - would calculate based on performance
    return isMissionCompleted(missionId) ? 3 : 0;
  };

  const getNextMissionId = (missionId) => {
    const index = missions.findIndex((m) => m.id === missionId);
    if (index !== -1 && index + 1 < missions.length) {
      return missions[index + 1].id;
    }
    return null;
  };

  const getChapterProgress = (chapterNumber) => {
    const chapterMissions = missions.filter(m => m.chapterNumber === chapterNumber);
    const completedCount = chapterMissions.filter(m => isMissionCompleted(m.id)).length;
    return {
      completed: completedCount,
      total: chapterMissions.length,
      percentage: (completedCount / chapterMissions.length) * 100
    };
  };

  const handleStartMission = (mission) => {
    if (!isMissionUnlocked(mission)) {
      Alert.alert(
        '🔒 Mission Locked',
        `Complete previous missions and earn ${mission.unlockRequirements.xpRequired} XP to unlock this mission.`
      );
      return;
    }

    // Store selected mission
    setSelectedMission(mission);

    // Parse story into segments
    const segments = parseMissionStoryIntoSegments(mission);
    
    if (segments.length > 0) {
      // Show story narrative before starting mission
      setStorySegments(segments);
      setShowStoryNarrative(true);
    } else {
      // No story, go directly to mission
      startMissionDirectly(mission);
    }
  };

  const parseMissionStoryIntoSegments = (mission) => {
    const segments = [];

    // Add story intro if available
    if (mission.story && mission.story.intro) {
      const sentences = mission.story.intro.match(/[^.!?]+[.!?]+/g) || [mission.story.intro];
      for (let i = 0; i < sentences.length; i += 2) {
        const segment = sentences.slice(i, i + 2).join(' ').trim();
        if (segment) segments.push(segment);
      }
    } else if (mission.description) {
      // Fallback to description
      segments.push(mission.description);
    }

    // Add objectives as a segment
    if (mission.objectives && mission.objectives.length > 0) {
      const objectiveText = "Your objectives:\n" + 
        mission.objectives.map((obj, idx) => `${idx + 1}. ${obj.text}`).join('\n');
      segments.push(objectiveText);
    }

    // Add rewards info
    if (mission.rewards) {
      let rewardText = "Rewards:\n";
      if (mission.rewards.xp) rewardText += `⭐ ${mission.rewards.xp} XP\n`;
      if (mission.rewards.coins) rewardText += `🪙 ${mission.rewards.coins} Coins\n`;
      if (mission.rewards.badges && mission.rewards.badges.length > 0) {
        rewardText += `🏆 ${mission.rewards.badges.join(', ')}`;
      }
      segments.push(rewardText);
    }

    return segments;
  };

  const startMissionDirectly = (mission) => {
    startCampaignMission(mission.id);
    navigation.navigate('CampaignMission', { missionId: mission.id });
  };

  const handleStoryComplete = () => {
    setShowStoryNarrative(false);
    if (selectedMission) {
      startMissionDirectly(selectedMission);
    }
  };

  const completeMission = async (mission) => {
    const alreadyCompleted = userProgress.completedMissions.includes(mission.id);
    const updatedProgress = {
      ...userProgress,
      completedMissions: alreadyCompleted
        ? userProgress.completedMissions
        : [...userProgress.completedMissions, mission.id],
      currentXP: userProgress.currentXP + mission.rewards.xp,
      totalCoins: userProgress.totalCoins + mission.rewards.coins,
      badges: mission.rewards.badges
        ? Array.from(new Set([...(userProgress.badges || []), ...mission.rewards.badges]))
        : userProgress.badges,
      currentMission: null,
    };

    await persistProgress(updatedProgress);
    completeCampaignMission(mission.id, getNextMissionId(mission.id));

    Alert.alert(
      'Mission Complete! 🎉',
      `You earned ${mission.rewards.xp} XP and ${mission.rewards.coins} coins.`,
      [{ text: 'Great!' }]
    );
  };

  const handleUnlockAll = async () => {
    if (!userId) return;
    setUnlockingAll(true);
    try {
      const unlocked = {
        ...userProgress,
        completedMissions: [],
        currentXP: 9999,
        totalCoins: 9999,
      };
      await persistProgress(unlocked);
      Alert.alert('Unlocked', 'All missions are now accessible.');
    } catch (error) {
      Alert.alert('Error', 'Unable to unlock missions right now.');
    } finally {
      setUnlockingAll(false);
    }
  };

  const toggleChapter = (chapterNumber) => {
    setExpandedChapter(expandedChapter === chapterNumber ? null : chapterNumber);
  };

  const renderChapterCard = (chapter) => {
    const progress = getChapterProgress(chapter.number);
    const isExpanded = expandedChapter === chapter.number;

    return (
      <View key={chapter.number} style={styles.chapterContainer}>
        <TouchableOpacity
          style={[styles.chapterCard, { borderLeftColor: chapter.color }]}
          onPress={() => toggleChapter(chapter.number)}
        >
          <View style={styles.chapterHeader}>
            <Text style={styles.chapterIcon}>{chapter.icon}</Text>
            <View style={styles.chapterInfo}>
              <Text style={styles.chapterTitle}>
                Chapter {chapter.number}: {chapter.title}
              </Text>
              <Text style={styles.chapterProgress}>
                {progress.completed}/{progress.total} missions completed
              </Text>
            </View>
            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </View>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.missionsContainer}>
            {missions
              .filter(m => m.chapterNumber === chapter.number)
              .map(renderMissionCard)}
          </View>
        )}
      </View>
    );
  };

  const renderMissionCard = (mission) => {
    const unlocked = isMissionUnlocked(mission);
    const completed = isMissionCompleted(mission.id);
    const inProgress = isMissionInProgress(mission.id);
    const stars = getMissionStars(mission.id);
    const difficultyConfig = DIFFICULTY_CONFIG[mission.difficulty];

    // Get character info
    const mainCharacter = mission.story?.mainCharacter ? CHARACTERS[mission.story.mainCharacter] : null;

    return (
      <TouchableOpacity
        key={mission.id}
        style={[
          styles.missionCard,
          !unlocked && styles.missionCardLocked,
          inProgress && styles.missionCardInProgress,
          completed && styles.missionCardCompleted
        ]}
        onPress={() => handleStartMission(mission)}
        disabled={!unlocked}
      >
        {/* Lock Overlay */}
        {!unlocked && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockText}>Locked</Text>
          </View>
        )}

        <View style={styles.missionHeader}>
          <View style={styles.missionTitleRow}>
            <Text style={styles.missionNumber}>
              {mission.chapterNumber}.{mission.missionNumber}
            </Text>
            <Text style={styles.missionTitle}>{mission.title}</Text>
          </View>

          {completed && (
            <View style={styles.starsContainer}>
              {[1, 2, 3].map(star => (
                <Text key={star} style={styles.star}>
                  {star <= stars ? '⭐' : '☆'}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Character Badge */}
        {mainCharacter && (
          <View style={styles.characterBadge}>
            <Text style={styles.characterAvatar}>{mainCharacter.avatar}</Text>
            <Text style={styles.characterName}>{mainCharacter.name}</Text>
          </View>
        )}

        <Text style={styles.missionDescription} numberOfLines={2}>
          {mission.subtitle || mission.description}
        </Text>

        <View style={styles.missionMeta}>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyConfig.color }]}>
            <Text style={styles.difficultyText}>{difficultyConfig.label}</Text>
          </View>
          
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>⏱️ {mission.estimatedTime}</Text>
          </View>
        </View>

        <View style={styles.missionFooter}>
          <View style={styles.rewardsContainer}>
            <Text style={styles.rewardText}>🎁 {mission.rewards.xp} XP</Text>
            <Text style={styles.rewardText}>💰 {mission.rewards.coins} coins</Text>
          </View>

          {unlocked && !completed && (
            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>
                {inProgress ? 'Continue' : 'Start'}
              </Text>
            </View>
          )}

          {completed && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✓ Completed</Text>
            </View>
          )}
        </View>

        {mission.realWorldSkill && (
          <View style={styles.skillTag}>
            <Text style={styles.skillText}>📚 {mission.realWorldSkill}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Campaign...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎮 Campaign Mode</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statText}>⚡ {userProgress.currentXP} XP</Text>
          <Text style={styles.statText}>💰 {userProgress.totalCoins}</Text>
        </View>
      </View>

      {/* Chapters List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {CHAPTERS.map(renderChapterCard)}
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Story Narrative */}
      {selectedMission && (
        <StoryNarrative
          visible={showStoryNarrative}
          onClose={handleStoryComplete}
          storySegments={storySegments}
          characterName={
            selectedMission.story?.mainCharacter 
              ? CHARACTERS[selectedMission.story.mainCharacter]?.name 
              : 'Mission Briefing'
          }
          characterAvatar={
            selectedMission.story?.mainCharacter 
              ? CHARACTERS[selectedMission.story.mainCharacter]?.avatar 
              : '📋'
          }
        />
      )}
    </View>
  );
}

CampaignModeScreen.showGameOverlay = false;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.pureWhite,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.primaryGreen,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 10,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statText: {
    fontSize: 16,
    color: COLORS.accentYellow,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  chapterContainer: {
    marginBottom: 10,
  },
  chapterCard: {
    backgroundColor: COLORS.accentYellow,
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 6,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  chapterIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 3,
  },
  chapterProgress: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  expandIcon: {
    fontSize: 16,
    color: COLORS.primaryGreen,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primaryGreen,
  },
  missionsContainer: {
    marginTop: 10,
  },
  missionCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  missionCardLocked: {
    opacity: 0.6,
    borderColor: COLORS.earthBrown,
  },
  missionCardInProgress: {
    borderColor: COLORS.accentYellow,
    borderWidth: 3,
    shadowColor: COLORS.accentYellow,
    shadowOpacity: 0.3,
  },
  missionCardCompleted: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: `${COLORS.primaryGreen}10`,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 5,
  },
  lockText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  missionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    backgroundColor: COLORS.accentYellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginLeft: 2,
  },
  missionDescription: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 12,
    lineHeight: 20,
  },
  missionMeta: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  timeBadge: {
    backgroundColor: COLORS.accentYellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  missionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  startButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  completedBadge: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completedText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  skillTag: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.accentYellow,
  },
  skillText: {
    fontSize: 12,
    color: COLORS.earthBrown,
    fontStyle: 'italic',
  },
  characterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentYellow,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  characterAvatar: {
    fontSize: 16,
    marginRight: 6,
  },
  characterName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
});
