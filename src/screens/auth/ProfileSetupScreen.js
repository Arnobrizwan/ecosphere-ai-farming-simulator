import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  BackHandler
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { profileService } from '../../services/profile.service';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.config';

const { width } = Dimensions.get('window');

// Avatar options
const AVATARS = ['🧑‍🌾', '👨‍🌾', '👩‍🌾', '🌾', '🚜', '🐄'];

// Language options
const LANGUAGES = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'bn', label: 'বাংলা', flag: '🇧🇩' }
];

// Crop options
const CROPS = [
  { id: 'rice', label: 'Rice', icon: '🌾' },
  { id: 'wheat', label: 'Wheat', icon: '🌾' },
  { id: 'vegetables', label: 'Vegetables', icon: '🥬' },
  { id: 'fruits', label: 'Fruits', icon: '🍎' },
  { id: 'livestock', label: 'Livestock', icon: '🐄' },
  { id: 'poultry', label: 'Poultry', icon: '🐔' }
];

// Experience levels
const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', icon: '🌱', description: 'Just starting out' },
  { id: 'intermediate', label: 'Intermediate', icon: '🌿', description: '1-5 years experience' },
  { id: 'advanced', label: 'Advanced', icon: '🌳', description: '5+ years experience' }
];

// Learning interests
const LEARNING_INTERESTS = [
  { id: 'sustainable', label: 'Sustainable Farming' },
  { id: 'technology', label: 'Farm Technology' },
  { id: 'business', label: 'Agri-Business' },
  { id: 'science', label: 'Agricultural Science' }
];

// Notification types
const NOTIFICATION_TYPES = [
  { id: 'weather', label: 'Weather Alerts', icon: '🌤️' },
  { id: 'tips', label: 'Farming Tips', icon: '💡' },
  { id: 'community', label: 'Community Updates', icon: '👥' }
];

export default function ProfileSetupScreen({ navigation, route }) {
  const isEditMode = route?.params?.editMode || false;
  const autoSaveInterval = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');

  // Step 1: Basic Info & Demographics
  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🧑‍🌾');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Step 2: Farming Details (for Farmer)
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [farmSize, setFarmSize] = useState(5);
  const [experienceLevel, setExperienceLevel] = useState('');

  // Step 2 ALT: Learning Goals (for Student)
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [learningInterests, setLearningInterests] = useState([]);

  // Step 3: Preferences
  const [notifications, setNotifications] = useState(['weather', 'tips']);
  const [measurementUnit, setMeasurementUnit] = useState('metric');
  const [reminderTime, setReminderTime] = useState('morning');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();

    // Auto-save draft every 30 seconds
    autoSaveInterval.current = setInterval(() => {
      if (userId && !loading) {
        saveDraft(true); // Silent save
      }
    }, 30000);

    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
      backHandler.remove();
    };
  }, [userId, loading]);

  const handleBackPress = () => {
    if (currentStep > 1) {
      handleBack();
      return true; // Prevent default back behavior
    } else {
      // Ask to save draft before exiting
      Alert.alert(
        '💾 Save Progress?',
        'Do you want to save your progress as a draft?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack()
          },
          {
            text: 'Save Draft',
            onPress: async () => {
              await saveDraft();
              navigation.goBack();
            }
          }
        ]
      );
      return true;
    }
  };

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
      const profileResult = await authService.getUserProfile(user.uid);
      if (profileResult.success) {
        const data = profileResult.data;
        setUserRole(data.role || '');

        // Load saved/draft data
        if (data.fullName) setFullName(data.fullName);
        if (data.avatar) setSelectedAvatar(data.avatar);
        if (data.gender) setGender(data.gender);
        if (data.age) setAge(data.age.toString());
        if (data.location) setLocation(data.location);
        if (data.language) setSelectedLanguage(data.language);

        // Load farming details
        if (data.farmingDetails) {
          if (data.farmingDetails.crops) setSelectedCrops(data.farmingDetails.crops);
          if (data.farmingDetails.farmSize) setFarmSize(data.farmingDetails.farmSize);
          if (data.farmingDetails.experienceLevel) setExperienceLevel(data.farmingDetails.experienceLevel);
        }

        // Load learning goals
        if (data.learningGoals) {
          if (data.learningGoals.gradeLevel) setGradeLevel(data.learningGoals.gradeLevel);
          if (data.learningGoals.schoolName) setSchoolName(data.learningGoals.schoolName);
          if (data.learningGoals.interests) setLearningInterests(data.learningGoals.interests);
        }

        // Load preferences
        if (data.preferences) {
          if (data.preferences.notifications) setNotifications(data.preferences.notifications);
          if (data.preferences.measurementUnit) setMeasurementUnit(data.preferences.measurementUnit);
          if (data.preferences.reminderTime) setReminderTime(data.preferences.reminderTime);
        }
      }
    }
  };

  const getTotalSteps = () => {
    return 3; // Basic Info, Role-specific, Preferences
  };

  const saveDraft = async (silent = false) => {
    if (!userId) return;

    try {
      const draftData = {
        fullName,
        avatar: selectedAvatar,
        gender,
        age: age ? parseInt(age) : null,
        location,
        language: selectedLanguage,
        farmingDetails: userRole === 'farmer' ? {
          crops: selectedCrops,
          farmSize,
          experienceLevel
        } : null,
        learningGoals: userRole === 'student' ? {
          gradeLevel,
          schoolName,
          interests: learningInterests
        } : null,
        preferences: {
          notifications,
          measurementUnit,
          reminderTime
        }
      };

      const result = await profileService.saveDraft(userId, draftData);

      if (!silent) {
        if (result.success) {
          Alert.alert('✅ Draft Saved', 'Your progress has been saved.');
        } else {
          Alert.alert('⚠️ Save Failed', 'Could not save draft. Please try again.');
        }
      }
    } catch (error) {
      console.log('Draft save error:', error);
      if (!silent) {
        Alert.alert('❌ Error', 'An error occurred while saving.');
      }
    }
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      Alert.alert('⚠️ Required', 'Please enter your full name');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (userRole === 'farmer') {
      if (selectedCrops.length === 0) {
        Alert.alert('⚠️ Required', 'Please select at least one crop');
        return false;
      }
      if (!experienceLevel) {
        Alert.alert('⚠️ Required', 'Please select your experience level');
        return false;
      }
    } else if (userRole === 'student') {
      if (!gradeLevel.trim()) {
        Alert.alert('⚠️ Required', 'Please enter your grade level');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    // Validate current step
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;

    // Save draft
    await saveDraft();

    // Move to next step or finish
    if (currentStep < getTotalSteps()) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);

    try {
      const profileData = {
        fullName,
        avatar: selectedAvatar,
        gender,
        age: age ? parseInt(age) : null,
        location,
        language: selectedLanguage,
        farmingDetails: userRole === 'farmer' ? {
          crops: selectedCrops,
          farmSize,
          experienceLevel
        } : null,
        learningGoals: userRole === 'student' ? {
          gradeLevel,
          schoolName,
          interests: learningInterests
        } : null,
        preferences: {
          notifications,
          measurementUnit,
          reminderTime
        }
      };

      // Use profile service to save with validation
      const result = await profileService.saveProfile(userId, profileData, userRole);

      if (result.success) {
        const completionPercentage = result.completion || 100;

        Alert.alert(
          '🎉 Profile Complete!',
          `Your profile is ${completionPercentage}% complete! ${isEditMode ? 'Changes saved successfully.' : 'Let\'s set up your farm location.'}`,
          [
            {
              text: 'Continue',
              onPress: () => {
                if (isEditMode) {
                  navigation.goBack();
                } else {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'LocationSelection' }],
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('⚠️ Validation Error', result.error || 'Please fill all required fields.');
      }
    } catch (error) {
      console.error('Profile save error:', error);
      Alert.alert('❌ Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCrop = (cropId) => {
    if (selectedCrops.includes(cropId)) {
      setSelectedCrops(selectedCrops.filter(id => id !== cropId));
    } else {
      setSelectedCrops([...selectedCrops, cropId]);
    }
  };

  const toggleLearningInterest = (interestId) => {
    if (learningInterests.includes(interestId)) {
      setLearningInterests(learningInterests.filter(id => id !== interestId));
    } else {
      setLearningInterests([...learningInterests, interestId]);
    }
  };

  const toggleNotification = (notifId) => {
    if (notifications.includes(notifId)) {
      setNotifications(notifications.filter(id => id !== notifId));
    } else {
      setNotifications([...notifications, notifId]);
    }
  };

  const renderProgressBar = () => {
    const progress = (currentStep / getTotalSteps()) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBackButton} onPress={handleBackPress}>
            <Text style={styles.topBackButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.progressTitle}>{isEditMode ? 'Edit Profile' : 'Profile Setup'}</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.stepIndicators}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.stepCircle,
                step <= currentStep && styles.stepCircleActive,
                step < currentStep && styles.stepCircleComplete
              ]}
            >
              {step < currentStep ? (
                <Text style={styles.stepCheckmark}>✓</Text>
              ) : (
                <Text style={[
                  styles.stepNumber,
                  step <= currentStep && styles.stepNumberActive
                ]}>
                  {step}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>🎮 Customize Your Character</Text>
      <Text style={styles.stepSubtitle}>Let's create your farming avatar</Text>

      {/* Full Name */}
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      {/* Avatar Selection */}
      <Text style={styles.label}>Choose Your Avatar</Text>
      <View style={styles.avatarGrid}>
        {AVATARS.map((avatar) => (
          <TouchableOpacity
            key={avatar}
            style={[
              styles.avatarOption,
              selectedAvatar === avatar && styles.avatarOptionSelected
            ]}
            onPress={() => setSelectedAvatar(avatar)}
          >
            <Text style={styles.avatarIcon}>{avatar}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Gender Selection */}
      <Text style={styles.label}>Gender (Optional)</Text>
      <View style={styles.genderGrid}>
        <TouchableOpacity
          style={[styles.genderOption, gender === 'male' && styles.genderOptionSelected]}
          onPress={() => setGender('male')}
        >
          <Text style={styles.genderLabel}>Male</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderOption, gender === 'female' && styles.genderOptionSelected]}
          onPress={() => setGender('female')}
        >
          <Text style={styles.genderLabel}>Female</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderOption, gender === 'other' && styles.genderOptionSelected]}
          onPress={() => setGender('other')}
        >
          <Text style={styles.genderLabel}>Other</Text>
        </TouchableOpacity>
      </View>

      {/* Age (Optional) */}
      <Text style={styles.label}>Age (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        maxLength={3}
      />

      {/* Location (Optional) */}
      <Text style={styles.label}>Location (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Dhaka, Bangladesh"
        value={location}
        onChangeText={setLocation}
        autoCapitalize="words"
      />

      {/* Language Selection */}
      <Text style={styles.label}>Language Preference</Text>
      <View style={styles.languageGrid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.id}
            style={[
              styles.languageOption,
              selectedLanguage === lang.id && styles.languageOptionSelected
            ]}
            onPress={() => setSelectedLanguage(lang.id)}
          >
            <Text style={styles.languageFlag}>{lang.flag}</Text>
            <Text style={styles.languageLabel}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStep2Farmer = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>🌾 Your Farming Profile</Text>
      <Text style={styles.stepSubtitle}>Tell us about your farm</Text>

      {/* Crop Selection */}
      <Text style={styles.label}>Primary Crops (Select all that apply)</Text>
      <View style={styles.chipGrid}>
        {CROPS.map((crop) => (
          <TouchableOpacity
            key={crop.id}
            style={[
              styles.chip,
              selectedCrops.includes(crop.id) && styles.chipSelected
            ]}
            onPress={() => toggleCrop(crop.id)}
          >
            <Text style={styles.chipIcon}>{crop.icon}</Text>
            <Text style={[
              styles.chipLabel,
              selectedCrops.includes(crop.id) && styles.chipLabelSelected
            ]}>
              {crop.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Farm Size Slider */}
      <Text style={styles.label}>Farm Size: {farmSize} acres</Text>
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>0.5</Text>
        <View style={styles.sliderTrack}>
          <TouchableOpacity
            style={[styles.sliderThumb, { left: `${(farmSize / 50) * 100}%` }]}
            onPress={() => {}}
          />
        </View>
        <Text style={styles.sliderLabel}>50</Text>
      </View>
      <View style={styles.sliderButtons}>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => setFarmSize(Math.max(0.5, farmSize - 1))}
        >
          <Text style={styles.sliderButtonText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => setFarmSize(Math.min(50, farmSize + 1))}
        >
          <Text style={styles.sliderButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Experience Level */}
      <Text style={styles.label}>Experience Level</Text>
      <View style={styles.experienceGrid}>
        {EXPERIENCE_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={[
              styles.experienceCard,
              experienceLevel === level.id && styles.experienceCardSelected
            ]}
            onPress={() => setExperienceLevel(level.id)}
          >
            <Text style={styles.experienceIcon}>{level.icon}</Text>
            <Text style={styles.experienceLabel}>{level.label}</Text>
            <Text style={styles.experienceDescription}>{level.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStep2Student = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>📚 Learning Goals</Text>
      <Text style={styles.stepSubtitle}>Tell us about your studies</Text>

      {/* Grade Level */}
      <Text style={styles.label}>Grade Level</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Grade 10"
        value={gradeLevel}
        onChangeText={setGradeLevel}
      />

      {/* School Name */}
      <Text style={styles.label}>School Name (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your school name"
        value={schoolName}
        onChangeText={setSchoolName}
      />

      {/* Learning Interests */}
      <Text style={styles.label}>Learning Interests</Text>
      <View style={styles.checkboxContainer}>
        {LEARNING_INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={styles.checkboxRow}
            onPress={() => toggleLearningInterest(interest.id)}
          >
            <View style={[
              styles.checkbox,
              learningInterests.includes(interest.id) && styles.checkboxChecked
            ]}>
              {learningInterests.includes(interest.id) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>{interest.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>⚙️ Preferences</Text>
      <Text style={styles.stepSubtitle}>Customize your experience</Text>

      {/* Notifications */}
      <Text style={styles.label}>Notification Preferences</Text>
      <View style={styles.notificationGrid}>
        {NOTIFICATION_TYPES.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            style={[
              styles.notificationCard,
              notifications.includes(notif.id) && styles.notificationCardSelected
            ]}
            onPress={() => toggleNotification(notif.id)}
          >
            <Text style={styles.notificationIcon}>{notif.icon}</Text>
            <Text style={styles.notificationLabel}>{notif.label}</Text>
            {notifications.includes(notif.id) && (
              <Text style={styles.notificationCheck}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Measurement Units */}
      <Text style={styles.label}>Measurement Units</Text>
      <View style={styles.unitGrid}>
        <TouchableOpacity
          style={[
            styles.unitOption,
            measurementUnit === 'metric' && styles.unitOptionSelected
          ]}
          onPress={() => setMeasurementUnit('metric')}
        >
          <Text style={styles.unitLabel}>Metric</Text>
          <Text style={styles.unitSubLabel}>(kg, m, °C)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.unitOption,
            measurementUnit === 'imperial' && styles.unitOptionSelected
          ]}
          onPress={() => setMeasurementUnit('imperial')}
        >
          <Text style={styles.unitLabel}>Imperial</Text>
          <Text style={styles.unitSubLabel}>(lb, ft, °F)</Text>
        </TouchableOpacity>
      </View>

      {/* Reminder Time */}
      <Text style={styles.label}>Best Time for Reminders</Text>
      <View style={styles.timeGrid}>
        {['morning', 'afternoon', 'evening'].map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeOption,
              reminderTime === time && styles.timeOptionSelected
            ]}
            onPress={() => setReminderTime(time)}
          >
            <Text style={styles.timeLabel}>
              {time.charAt(0).toUpperCase() + time.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Step Content */}
      <View style={styles.content}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && userRole === 'farmer' && renderStep2Farmer()}
        {currentStep === 2 && userRole === 'student' && renderStep2Student()}
        {currentStep === 2 && userRole !== 'farmer' && userRole !== 'student' && renderStep2Farmer()}
        {currentStep === 3 && renderStep3()}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <View style={styles.buttonRow}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          {currentStep === 1 && (
            <TouchableOpacity
              style={styles.saveDraftButton}
              onPress={() => saveDraft(false)}
            >
              <Text style={styles.saveDraftButtonText}>💾 Save Draft</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? '⏳ Saving...' : currentStep === getTotalSteps() ? (isEditMode ? '✅ Save Changes' : '🎉 Finish') : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
        {!isEditMode && (
          <Text style={styles.autoSaveText}>💡 Auto-saves every 30 seconds</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  topBackButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.pureWhite,
  },
  topBackButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  progressTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  topBarSpacer: {
    width: 60,
  },
  progressContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.primaryGreen,
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
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.pureWhite,
    opacity: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    opacity: 0.7,
  },
  stepCircleComplete: {
    opacity: 1,
    backgroundColor: COLORS.accentYellow,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  stepNumberActive: {
    color: COLORS.primaryGreen,
  },
  stepCheckmark: {
    fontSize: 20,
    color: COLORS.primaryGreen,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.earthBrown,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 12,
    marginTop: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.pureWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarOption: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  avatarIcon: {
    fontSize: 48,
  },
  languageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  languageOption: {
    flex: 1,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  languageFlag: {
    fontSize: 36,
    marginBottom: 8,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  genderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genderOption: {
    flex: 1,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  genderOptionSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentYellow,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.earthBrown,
  },
  chipSelected: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  chipIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  chipLabelSelected: {
    color: COLORS.pureWhite,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginHorizontal: 10,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 3,
    position: 'relative',
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGreen,
    top: -9,
    marginLeft: -12,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  sliderButton: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  sliderButtonText: {
    fontSize: 24,
    color: COLORS.pureWhite,
    fontWeight: 'bold',
  },
  experienceGrid: {
    gap: 10,
  },
  experienceCard: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  experienceCardSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  experienceIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  experienceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 5,
  },
  experienceDescription: {
    fontSize: 14,
    color: COLORS.earthBrown,
    textAlign: 'center',
  },
  checkboxContainer: {
    gap: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: COLORS.pureWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primaryGreen,
  },
  checkmark: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  notificationGrid: {
    gap: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  notificationCardSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  notificationCheck: {
    fontSize: 20,
    color: COLORS.pureWhite,
    fontWeight: 'bold',
  },
  unitGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  unitOption: {
    flex: 1,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  unitOptionSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  unitLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 5,
  },
  unitSubLabel: {
    fontSize: 12,
    color: COLORS.earthBrown,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  timeOption: {
    flex: 1,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  timeOptionSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  navigationContainer: {
    padding: 20,
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 1,
    borderTopColor: COLORS.accentYellow,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveDraftButton: {
    flex: 1,
    height: 55,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.earthBrown,
  },
  saveDraftButtonText: {
    color: COLORS.earthBrown,
    fontSize: 16,
    fontWeight: 'bold',
  },
  autoSaveText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.earthBrown,
    marginTop: 10,
    opacity: 0.7,
  },
  backButton: {
    flex: 1,
    height: 55,
    backgroundColor: COLORS.earthBrown,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 2,
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  nextButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
