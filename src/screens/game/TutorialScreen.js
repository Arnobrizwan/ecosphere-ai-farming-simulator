import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.config';

const { width } = Dimensions.get('window');

// Sample tutorials data (would be fetched from Firestore in production)
const TUTORIALS_DATA = [
  {
    id: 'welcome',
    title: 'Welcome to EcoSphere',
    description: 'Learn the basics of navigating the app and setting up your profile',
    category: 'basics',
    estimatedTime: '5 min',
    xpReward: 50,
    requiredLevel: 0,
    icon: '👋',
    steps: [
      {
        stepNumber: 1,
        title: 'Welcome!',
        description: 'EcoSphere helps you learn sustainable farming using real NASA satellite data. Let\'s get started!',
        action: 'observe',
        hint: 'This tutorial will guide you through the basics',
        media: null
      },
      {
        stepNumber: 2,
        title: 'Navigation',
        description: 'Use the bottom navigation bar to switch between Dashboard, Game, and Profile screens.',
        action: 'observe',
        targetElement: 'bottom-nav',
        hint: 'Tap any icon to navigate',
        media: null
      },
      {
        stepNumber: 3,
        title: 'Your Dashboard',
        description: 'The Dashboard shows your farm overview, quick stats, and recent activities.',
        action: 'navigate',
        targetElement: 'dashboard',
        hint: 'This is your home base',
        media: null
      },
      {
        stepNumber: 4,
        title: 'Game Modes',
        description: 'Play Campaign Mode for missions or Sandbox Mode to experiment freely.',
        action: 'observe',
        targetElement: 'game-screen',
        hint: 'Try both modes to learn different skills',
        media: null
      },
      {
        stepNumber: 5,
        title: 'You\'re Ready!',
        description: 'You now know the basics. Start exploring and learning about sustainable farming!',
        action: 'observe',
        hint: 'Complete more tutorials to earn XP',
        media: null
      }
    ]
  },
  {
    id: 'satellite_data',
    title: 'Understanding Satellite Data',
    description: 'Learn how to read and interpret NASA satellite data for farming',
    category: 'basics',
    estimatedTime: '8 min',
    xpReward: 100,
    requiredLevel: 0,
    icon: '🛰️',
    steps: [
      {
        stepNumber: 1,
        title: 'What is SMAP?',
        description: 'SMAP (Soil Moisture Active Passive) measures soil moisture from space. This helps farmers know when to irrigate.',
        action: 'observe',
        hint: 'Soil moisture is crucial for crop health',
        media: null
      },
      {
        stepNumber: 2,
        title: 'Reading NDVI',
        description: 'NDVI (Normalized Difference Vegetation Index) shows plant health. Green = healthy, yellow = stressed, brown = unhealthy.',
        action: 'observe',
        hint: 'Higher NDVI values mean healthier crops',
        media: null
      },
      {
        stepNumber: 3,
        title: 'Rainfall Patterns',
        description: 'IMERG data tracks rainfall globally. Use it to plan irrigation and predict water availability.',
        action: 'observe',
        hint: 'Check rainfall forecasts weekly',
        media: null
      },
      {
        stepNumber: 4,
        title: 'Temperature Data',
        description: 'Temperature affects crop growth rates and water needs. Monitor it to optimize planting times.',
        action: 'observe',
        hint: 'Extreme temperatures stress crops',
        media: null
      },
      {
        stepNumber: 5,
        title: 'Combining Data',
        description: 'Use multiple data sources together for better decisions. Low soil moisture + high temp = urgent irrigation needed.',
        action: 'observe',
        hint: 'Data-driven farming is more efficient',
        media: null
      },
      {
        stepNumber: 6,
        title: 'Practice Time',
        description: 'Now try using satellite data in Sandbox Mode to see how it affects your crops!',
        action: 'observe',
        hint: 'Experiment freely in Sandbox',
        media: null
      }
    ]
  },
  {
    id: 'first_crop',
    title: 'Planning Your First Crop',
    description: 'Step-by-step guide to planning and planting your first crop',
    category: 'basics',
    estimatedTime: '10 min',
    xpReward: 150,
    requiredLevel: 0,
    icon: '🌱',
    steps: [
      {
        stepNumber: 1,
        title: 'Choose Your Crop',
        description: 'Select a crop based on your soil type, climate, and market demand. Rice and wheat are good starters.',
        action: 'observe',
        hint: 'Match crops to your conditions',
        media: null
      },
      {
        stepNumber: 2,
        title: 'Check Soil Moisture',
        description: 'Use SMAP data to check current soil moisture levels. Ideal range is 20-40% for most crops.',
        action: 'observe',
        hint: 'Too dry or too wet both cause problems',
        media: null
      },
      {
        stepNumber: 3,
        title: 'Set Planting Date',
        description: 'Choose a planting date based on seasonal patterns and rainfall forecasts.',
        action: 'input',
        targetElement: 'date-picker',
        hint: 'Align with rainy season for best results',
        media: null
      },
      {
        stepNumber: 4,
        title: 'Prepare Your Field',
        description: 'Ensure soil is properly tilled and fertilized before planting.',
        action: 'observe',
        hint: 'Good preparation = better yields',
        media: null
      },
      {
        stepNumber: 5,
        title: 'Plant Your Crop',
        description: 'Follow recommended spacing and depth for your chosen crop.',
        action: 'tap',
        targetElement: 'plant-button',
        hint: 'Proper spacing prevents competition',
        media: null
      },
      {
        stepNumber: 6,
        title: 'Monitor Growth',
        description: 'Check NDVI data weekly to track crop health and identify issues early.',
        action: 'observe',
        hint: 'Early detection saves crops',
        media: null
      },
      {
        stepNumber: 7,
        title: 'Harvest Time!',
        description: 'When NDVI peaks and starts declining, it\'s time to harvest. Congratulations!',
        action: 'observe',
        hint: 'Timing is everything for maximum yield',
        media: null
      }
    ]
  },
  {
    id: 'nasa_decisions',
    title: 'Using NASA Data for Decisions',
    description: 'Advanced tutorial on making farming decisions with satellite data',
    category: 'advanced',
    estimatedTime: '12 min',
    xpReward: 200,
    requiredLevel: 1,
    icon: '🎓',
    steps: [
      {
        stepNumber: 1,
        title: 'Access Satellite View',
        description: 'Navigate to the NASA Data section to view real-time satellite imagery of your farm.',
        action: 'navigate',
        targetElement: 'nasa-data',
        hint: 'This unlocks in Campaign Mission 2.1',
        media: null
      },
      {
        stepNumber: 2,
        title: 'Interpret NDVI Colors',
        description: 'Dark green (0.7-1.0) = very healthy, Light green (0.4-0.7) = moderate, Yellow/Brown (0-0.4) = stressed or bare soil.',
        action: 'observe',
        hint: 'Color changes indicate crop status',
        media: null
      },
      {
        stepNumber: 3,
        title: 'Check Rainfall Forecast',
        description: 'View 7-day rainfall predictions to plan irrigation schedules.',
        action: 'observe',
        hint: 'Save water by timing with rain',
        media: null
      },
      {
        stepNumber: 4,
        title: 'Identify Dry Zones',
        description: 'Use SMAP soil moisture map to find areas needing extra irrigation.',
        action: 'tap',
        targetElement: 'moisture-map',
        hint: 'Target irrigation to save resources',
        media: null
      },
      {
        stepNumber: 5,
        title: 'Plan Irrigation',
        description: 'Based on soil moisture and rainfall forecast, create an irrigation schedule.',
        action: 'input',
        targetElement: 'irrigation-plan',
        hint: 'Efficient irrigation saves money',
        media: null
      },
      {
        stepNumber: 6,
        title: 'Monitor Results',
        description: 'After implementing your plan, check NDVI changes to see if crop health improves.',
        action: 'observe',
        hint: 'Data shows if your decisions work',
        media: null
      },
      {
        stepNumber: 7,
        title: 'Adjust Strategy',
        description: 'Use what you learned to refine your approach. Data-driven farming is iterative.',
        action: 'observe',
        hint: 'Keep learning and improving',
        media: null
      },
      {
        stepNumber: 8,
        title: 'Expert Level!',
        description: 'You now understand how to use NASA data for smart farming decisions. Keep practicing!',
        action: 'observe',
        hint: 'Share your knowledge with others',
        media: null
      }
    ]
  }
];

export default function TutorialScreen({ navigation, route }) {
  const [userId, setUserId] = useState('');
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedTutorials, setCompletedTutorials] = useState([]);
  const [showTutorialView, setShowTutorialView] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    // Auto-launch tutorial if passed via route params
    if (route?.params?.tutorialId) {
      const tutorial = TUTORIALS_DATA.find(t => t.id === route.params.tutorialId);
      if (tutorial) {
        startTutorial(tutorial);
      }
    }
  }, [route?.params]);

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
      await loadCompletedTutorials(user.uid);
      await loadUserXP(user.uid);
    }
  };

  const loadCompletedTutorials = async (uid) => {
    try {
      const tutorialsRef = collection(db, 'users', uid, 'tutorials');
      const tutorialsSnap = await getDocs(tutorialsRef);
      
      const completed = [];
      tutorialsSnap.forEach((doc) => {
        if (doc.data().completed) {
          completed.push(doc.id);
        }
      });
      setCompletedTutorials(completed);
    } catch (error) {
      console.log('Load tutorials error:', error);
    }
  };

  const loadUserXP = async (uid) => {
    try {
      const progressRef = doc(db, 'users', uid, 'gameProgress', 'campaign');
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        setUserXP(progressSnap.data().currentXP || 0);
      }
    } catch (error) {
      console.log('Load XP error:', error);
    }
  };

  const isTutorialCompleted = (tutorialId) => {
    return completedTutorials.includes(tutorialId);
  };

  const startTutorial = (tutorial) => {
    setSelectedTutorial(tutorial);
    setCurrentStep(0);
    setShowTutorialView(true);
  };

  const handleNext = () => {
    if (currentStep < selectedTutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setShowSkipWarning(true);
  };

  const confirmSkip = () => {
    setShowSkipWarning(false);
    setShowTutorialView(false);
    setSelectedTutorial(null);
    setCurrentStep(0);
  };

  const completeTutorial = async () => {
    try {
      // Save completion to Firestore
      const tutorialRef = doc(db, 'users', userId, 'tutorials', selectedTutorial.id);
      await setDoc(tutorialRef, {
        completed: true,
        completedAt: new Date().toISOString(),
        score: 100 // Could be calculated based on performance
      });

      // Award XP
      const newXP = userXP + selectedTutorial.xpReward;
      const progressRef = doc(db, 'users', userId, 'gameProgress', 'campaign');
      await setDoc(progressRef, {
        currentXP: newXP
      }, { merge: true });

      setUserXP(newXP);
      setCompletedTutorials([...completedTutorials, selectedTutorial.id]);
      
      // Check for badge unlock
      if (completedTutorials.length + 1 >= 3) {
        // Unlock "Quick Learner" badge
        Alert.alert('🏆 Badge Unlocked!', 'You earned the "Quick Learner" badge for completing 3 tutorials!');
      }

      setShowCompletionModal(true);
    } catch (error) {
      console.log('Complete tutorial error:', error);
      Alert.alert('Error', 'Failed to save progress');
    }
  };

  const closeCompletionModal = () => {
    setShowCompletionModal(false);
    setShowTutorialView(false);
    setSelectedTutorial(null);
    setCurrentStep(0);
  };

  const renderTutorialCard = (tutorial) => {
    const completed = isTutorialCompleted(tutorial.id);
    const locked = tutorial.requiredLevel > 0 && userXP < tutorial.requiredLevel * 100;

    return (
      <TouchableOpacity
        key={tutorial.id}
        style={[
          styles.tutorialCard,
          completed && styles.tutorialCardCompleted,
          locked && styles.tutorialCardLocked
        ]}
        onPress={() => !locked && startTutorial(tutorial)}
        disabled={locked}
      >
        {locked && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}

        <Text style={styles.tutorialIcon}>{tutorial.icon}</Text>
        
        <View style={styles.tutorialInfo}>
          <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
          <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
          
          <View style={styles.tutorialMeta}>
            <Text style={styles.metaText}>⏱️ {tutorial.estimatedTime}</Text>
            <Text style={styles.metaText}>🎁 {tutorial.xpReward} XP</Text>
            <Text style={[
              styles.categoryBadge,
              tutorial.category === 'advanced' && styles.categoryAdvanced
            ]}>
              {tutorial.category}
            </Text>
          </View>
        </View>

        {completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTutorialView = () => {
    if (!selectedTutorial) return null;

    const step = selectedTutorial.steps[currentStep];
    const progress = ((currentStep + 1) / selectedTutorial.steps.length) * 100;

    return (
      <View style={styles.tutorialView}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {selectedTutorial.steps.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Illustration Area */}
        <View style={styles.illustrationArea}>
          <Text style={styles.illustrationPlaceholder}>
            {step.media ? '🖼️ Illustration' : '📚'}
          </Text>
        </View>

        {/* Step Content */}
        <ScrollView style={styles.stepContent}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>

          {/* Hint Section */}
          {step.hint && (
            <View style={styles.hintSection}>
              <Text style={styles.hintTitle}>💡 Hint</Text>
              <Text style={styles.hintText}>{step.hint}</Text>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip Tutorial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentStep === selectedTutorial.steps.length - 1 ? 'Finish ✓' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!showTutorialView ? (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.headerBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>📚 Tutorials</Text>
            <Text style={styles.headerSubtitle}>Learn at your own pace</Text>
            <Text style={styles.xpDisplay}>⚡ {userXP} XP</Text>
          </View>

          {/* Tutorials List */}
          <ScrollView style={styles.tutorialsList}>
            <Text style={styles.sectionTitle}>Basics</Text>
            {TUTORIALS_DATA.filter(t => t.category === 'basics').map(renderTutorialCard)}

            <Text style={styles.sectionTitle}>Advanced</Text>
            {TUTORIALS_DATA.filter(t => t.category === 'advanced').map(renderTutorialCard)}
          </ScrollView>
        </>
      ) : (
        renderTutorialView()
      )}

      {/* Skip Warning Modal */}
      <Modal
        visible={showSkipWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkipWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Skip Tutorial?</Text>
            <Text style={styles.modalText}>
              You won't earn XP if you skip. Are you sure you want to exit?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSkipWarning(false)}
              >
                <Text style={styles.modalCancelText}>Continue Learning</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmSkip}
              >
                <Text style={styles.modalConfirmText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={closeCompletionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            <Text style={styles.completionIcon}>🎉</Text>
            <Text style={styles.completionTitle}>Tutorial Complete!</Text>
            <Text style={styles.completionText}>
              You earned {selectedTutorial?.xpReward} XP
            </Text>
            <View style={styles.rewardBox}>
              <Text style={styles.rewardText}>⚡ Total XP: {userXP}</Text>
              <Text style={styles.rewardText}>
                📚 Completed: {completedTutorials.length + 1}/{TUTORIALS_DATA.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.completionButton}
              onPress={closeCompletionModal}
            >
              <Text style={styles.completionButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerBackButton: {
    marginBottom: 10,
  },
  headerBackText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.accentYellow,
    marginBottom: 10,
  },
  xpDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accentYellow,
  },
  tutorialsList: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginTop: 15,
    marginBottom: 10,
  },
  tutorialCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    position: 'relative',
  },
  tutorialCardCompleted: {
    backgroundColor: `${COLORS.primaryGreen}20`,
    borderColor: COLORS.primaryGreen,
  },
  tutorialCardLocked: {
    opacity: 0.6,
    borderColor: COLORS.earthBrown,
  },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  lockIcon: {
    fontSize: 24,
  },
  tutorialIcon: {
    fontSize: 48,
    marginRight: 15,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 5,
  },
  tutorialDescription: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 8,
  },
  tutorialMeta: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.deepBlack,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    textTransform: 'uppercase',
  },
  categoryAdvanced: {
    backgroundColor: COLORS.earthBrown,
  },
  completedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 24,
    color: COLORS.pureWhite,
  },
  tutorialView: {
    flex: 1,
  },
  progressContainer: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.pureWhite,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 4,
    overflow: 'hidden',
    opacity: 0.3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.pureWhite,
  },
  illustrationArea: {
    height: 200,
    backgroundColor: COLORS.accentYellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primaryGreen,
  },
  illustrationPlaceholder: {
    fontSize: 80,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 15,
  },
  stepDescription: {
    fontSize: 16,
    color: COLORS.deepBlack,
    lineHeight: 24,
    marginBottom: 20,
  },
  hintSection: {
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.earthBrown,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 2,
    borderTopColor: COLORS.accentYellow,
  },
  backButton: {
    flex: 1,
    backgroundColor: COLORS.earthBrown,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  skipButton: {
    flex: 1,
    backgroundColor: COLORS.skyBlue,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 2,
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 25,
    width: width * 0.85,
    borderWidth: 3,
    borderColor: COLORS.accentYellow,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: COLORS.deepBlack,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.earthBrown,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  completionModal: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 30,
    width: width * 0.85,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  completionIcon: {
    fontSize: 80,
    marginBottom: 15,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 10,
  },
  completionText: {
    fontSize: 18,
    color: COLORS.deepBlack,
    marginBottom: 20,
  },
  rewardBox: {
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
    marginBottom: 5,
  },
  completionButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
  },
  completionButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
