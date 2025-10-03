import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.config';

const { width } = Dimensions.get('window');

// Sample quizzes data (would be fetched from Firestore in production)
const QUIZZES_DATA = [
  {
    id: 'soil_moisture_basics',
    title: 'Soil Moisture Basics',
    description: 'Test your knowledge about soil moisture and SMAP satellite data',
    category: 'soilMoisture',
    difficulty: 'easy',
    passingScore: 70,
    timeLimit: 300,
    rewards: { xp: 100, coins: 50, badge: 'soil_expert' },
    unlockRequirements: { tutorialsCompleted: ['welcome'], missionsCompleted: [] },
    questions: [
      {
        id: 'q1',
        questionText: 'What does the SMAP satellite measure?',
        type: 'multipleChoice',
        options: [
          'Soil moisture levels',
          'Air temperature',
          'Crop prices',
          'Rainfall amount'
        ],
        correctAnswer: 0,
        explanation: 'SMAP (Soil Moisture Active Passive) specifically measures soil moisture from space, helping farmers make irrigation decisions.',
        points: 10
      },
      {
        id: 'q2',
        questionText: 'What is the optimal soil moisture range for rice planting?',
        type: 'multipleChoice',
        options: [
          '0-10%',
          '20-40%',
          '60-80%',
          '90-100%'
        ],
        correctAnswer: 1,
        explanation: 'Rice grows best with soil moisture between 20-40%. Too dry or too wet can harm the crop.',
        points: 10
      },
      {
        id: 'q3',
        questionText: 'More water always means better crops.',
        type: 'trueFalse',
        options: ['True', 'False'],
        correctAnswer: 1,
        explanation: 'False! Too much water can drown roots and cause diseases. Crops need the right amount of water.',
        points: 10
      },
      {
        id: 'q4',
        questionText: 'When should you irrigate based on SMAP data?',
        type: 'multipleChoice',
        options: [
          'When soil moisture is very high',
          'When soil moisture drops below 20%',
          'Only during full moon',
          'Every day regardless of moisture'
        ],
        correctAnswer: 1,
        explanation: 'Irrigate when soil moisture drops below 20% to prevent crop stress while avoiding water waste.',
        points: 10
      },
      {
        id: 'q5',
        questionText: 'SMAP data can help save water and money.',
        type: 'trueFalse',
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: 'True! By knowing exact soil moisture, farmers can irrigate only when needed, saving water and reducing costs.',
        points: 10
      }
    ]
  },
  {
    id: 'reading_ndvi',
    title: 'Reading NDVI',
    description: 'Learn to interpret vegetation health from satellite imagery',
    category: 'crops',
    difficulty: 'medium',
    passingScore: 70,
    timeLimit: 300,
    rewards: { xp: 150, coins: 75, badge: 'ndvi_reader' },
    unlockRequirements: { tutorialsCompleted: ['satellite_data'], missionsCompleted: [] },
    questions: [
      {
        id: 'q1',
        questionText: 'What does NDVI stand for?',
        type: 'multipleChoice',
        options: [
          'National Data Verification Index',
          'Normalized Difference Vegetation Index',
          'New Digital Video Interface',
          'Natural Drought Variation Indicator'
        ],
        correctAnswer: 1,
        explanation: 'NDVI stands for Normalized Difference Vegetation Index. It measures plant health using satellite data.',
        points: 10
      },
      {
        id: 'q2',
        questionText: 'What does a high NDVI value (0.7-1.0) indicate?',
        type: 'multipleChoice',
        options: [
          'Dead or dying crops',
          'Bare soil',
          'Healthy, dense vegetation',
          'Water bodies'
        ],
        correctAnswer: 2,
        explanation: 'High NDVI values (0.7-1.0) indicate healthy, dense vegetation with good chlorophyll content.',
        points: 10
      },
      {
        id: 'q3',
        questionText: 'NDVI can detect crop stress before it\'s visible to the eye.',
        type: 'trueFalse',
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: 'True! NDVI can detect stress 1-2 weeks before visible symptoms, allowing early intervention.',
        points: 10
      },
      {
        id: 'q4',
        questionText: 'What color typically represents healthy crops in NDVI maps?',
        type: 'multipleChoice',
        options: [
          'Red or brown',
          'Blue',
          'Dark green',
          'Yellow'
        ],
        correctAnswer: 2,
        explanation: 'Dark green represents healthy crops. Yellow/brown indicates stress, and red shows bare soil or dead vegetation.',
        points: 10
      },
      {
        id: 'q5',
        questionText: 'Lower NDVI values always mean the crop has failed.',
        type: 'trueFalse',
        options: ['True', 'False'],
        correctAnswer: 1,
        explanation: 'False! Lower NDVI might indicate early growth stage, recent planting, or temporary stress. Context matters.',
        points: 10
      }
    ]
  },
  {
    id: 'rainfall_patterns',
    title: 'Rainfall Patterns',
    description: 'Understand rainfall data and irrigation planning',
    category: 'weather',
    difficulty: 'easy',
    passingScore: 70,
    timeLimit: 240,
    rewards: { xp: 100, coins: 50, badge: 'weather_watcher' },
    unlockRequirements: { tutorialsCompleted: ['welcome'], missionsCompleted: [] },
    questions: [
      {
        id: 'q1',
        questionText: 'What is IMERG?',
        type: 'multipleChoice',
        options: [
          'A type of crop',
          'Integrated Multi-satellitE Retrievals for GPM (rainfall data)',
          'A fertilizer brand',
          'An irrigation system'
        ],
        correctAnswer: 1,
        explanation: 'IMERG provides global rainfall data from multiple satellites, helping farmers plan irrigation.',
        points: 10
      },
      {
        id: 'q2',
        questionText: 'Rainfall data can help you plan when to irrigate.',
        type: 'trueFalse',
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: 'True! If rain is forecast, you can delay irrigation and save water and money.',
        points: 10
      },
      {
        id: 'q3',
        questionText: 'How far ahead can rainfall forecasts help planning?',
        type: 'multipleChoice',
        options: [
          'Only today',
          '7-10 days',
          '6 months',
          '2 years'
        ],
        correctAnswer: 1,
        explanation: 'Reliable rainfall forecasts typically extend 7-10 days, useful for short-term irrigation planning.',
        points: 10
      },
      {
        id: 'q4',
        questionText: 'You should always irrigate on the same schedule regardless of rainfall.',
        type: 'trueFalse',
        options: ['True', 'False'],
        correctAnswer: 1,
        explanation: 'False! Adjust irrigation based on rainfall to avoid overwatering and save resources.',
        points: 10
      }
    ]
  }
];

export default function QuizScreen({ navigation, route }) {
  const [userId, setUserId] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const timerRef = useRef(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserData();
    
    // Load quiz from route params or default
    if (route?.params?.quizId) {
      const quiz = QUIZZES_DATA.find(q => q.id === route.params.quizId);
      if (quiz) {
        startQuiz(quiz);
      }
    }
  }, [route?.params]);

  useEffect(() => {
    if (selectedQuiz && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [selectedQuiz, timeRemaining]);

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
    }
  };

  const startQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setTimeRemaining(quiz.timeLimit);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setUsedHint(false);
    setShowHint(false);
  };

  const handleTimeUp = () => {
    clearInterval(timerRef.current);
    Alert.alert(
      '⏰ Time\'s Up!',
      'The quiz time has ended. Let\'s see your results!',
      [{ text: 'View Results', onPress: finishQuiz }]
    );
  };

  const handleAnswerSelect = (index) => {
    if (!showFeedback) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      Alert.alert('⚠️ No Answer', 'Please select an answer before submitting');
      return;
    }

    const question = selectedQuiz.questions[currentQuestionIndex];
    const correct = selectedAnswer === question.correctAnswer;
    
    setIsCorrect(correct);
    setShowFeedback(true);

    // Calculate points (reduce if hint was used)
    const points = correct ? (usedHint ? question.points - 5 : question.points) : 0;
    setScore(score + points);

    // Record answer
    setAnswers([...answers, {
      questionId: question.id,
      selectedAnswer,
      correct,
      points
    }]);

    // Animate feedback
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      moveToNextQuestion();
    });
  };

  const moveToNextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    setUsedHint(false);
    setShowHint(false);

    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const handleSkip = () => {
    const question = selectedQuiz.questions[currentQuestionIndex];
    
    setAnswers([...answers, {
      questionId: question.id,
      selectedAnswer: null,
      correct: false,
      points: 0
    }]);

    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setUsedHint(false);
      setShowHint(false);
    } else {
      finishQuiz();
    }
  };

  const handleUseHint = () => {
    if (score >= 5) {
      setScore(score - 5);
      setUsedHint(true);
      setShowHint(true);
    } else {
      Alert.alert('💰 Not Enough Points', 'You need at least 5 points to use a hint');
    }
  };

  const finishQuiz = async () => {
    clearInterval(timerRef.current);

    const totalQuestions = selectedQuiz.questions.length;
    const correctAnswers = answers.filter(a => a.correct).length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = percentage >= selectedQuiz.passingScore;
    
    let stars = 0;
    if (percentage >= 90) stars = 3;
    else if (percentage >= 70) stars = 2;
    else if (passed) stars = 1;

    // Save to Firestore
    try {
      const progressRef = doc(db, 'users', userId, 'quizProgress', selectedQuiz.id);
      const existingProgress = await getDoc(progressRef);
      
      const attempts = existingProgress.exists() ? (existingProgress.data().attempts || 0) + 1 : 1;
      const bestScore = existingProgress.exists() 
        ? Math.max(existingProgress.data().bestScore || 0, percentage)
        : percentage;

      await setDoc(progressRef, {
        attempts,
        bestScore,
        stars: Math.max(existingProgress.data()?.stars || 0, stars),
        completed: passed,
        lastAttempt: new Date().toISOString(),
        wrongAnswers: answers.filter(a => !a.correct).map(a => a.questionId)
      });

      // Award XP if passed
      if (passed) {
        const gameProgressRef = doc(db, 'users', userId, 'gameProgress', 'campaign');
        const gameProgress = await getDoc(gameProgressRef);
        const currentXP = gameProgress.exists() ? gameProgress.data().currentXP || 0 : 0;
        
        await setDoc(gameProgressRef, {
          currentXP: currentXP + selectedQuiz.rewards.xp
        }, { merge: true });
      }
    } catch (error) {
      console.log('Save quiz progress error:', error);
    }

    // Navigate to results
    navigation.navigate('QuizResults', {
      quizId: selectedQuiz.id,
      score: percentage,
      correctAnswers,
      totalQuestions,
      stars,
      passed,
      answers,
      questions: selectedQuiz.questions,
      rewards: selectedQuiz.rewards
    });
  };

  if (!selectedQuiz) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📝 Quizzes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </View>
    );
  }

  const question = selectedQuiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100;
  const timerColor = timeRemaining < 10 ? '#FF6347' : timeRemaining < 30 ? COLORS.accentYellow : COLORS.primaryGreen;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Exit</Text>
          </TouchableOpacity>
          <View style={[styles.timer, { backgroundColor: timerColor }]}>
            <Text style={styles.timerText}>⏱️ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</Text>
          </View>
        </View>
        
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1}/{selectedQuiz.questions.length}
          </Text>
          <Text style={styles.scoreText}>Score: {score}</Text>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Question Card */}
      <ScrollView style={styles.content}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.questionText}</Text>

          {/* Answer Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === index && styles.optionButtonSelected,
                  showFeedback && index === question.correctAnswer && styles.optionButtonCorrect,
                  showFeedback && selectedAnswer === index && !isCorrect && styles.optionButtonWrong
                ]}
                onPress={() => handleAnswerSelect(index)}
                disabled={showFeedback}
              >
                <Text style={[
                  styles.optionText,
                  selectedAnswer === index && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hint Section */}
          {showHint && (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>💡 {question.explanation}</Text>
            </View>
          )}

          {/* Feedback */}
          {showFeedback && (
            <Animated.View style={[styles.feedbackBox, { opacity: feedbackAnim }]}>
              <Text style={[styles.feedbackIcon, isCorrect ? styles.correctIcon : styles.wrongIcon]}>
                {isCorrect ? '✓' : '✗'}
              </Text>
              <Text style={styles.feedbackTitle}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </Text>
              <Text style={styles.feedbackText}>{question.explanation}</Text>
              {isCorrect && (
                <Text style={styles.pointsEarned}>+{usedHint ? question.points - 5 : question.points} points</Text>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {!showFeedback && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.hintButton}
            onPress={handleUseHint}
            disabled={usedHint || showHint}
          >
            <Text style={styles.hintButtonText}>
              {usedHint ? '✓ Hint Used' : '💡 Hint (-5pts)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, selectedAnswer === null && styles.submitButtonDisabled]}
            onPress={handleSubmitAnswer}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  timer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: COLORS.pureWhite,
    fontSize: 14,
  },
  scoreText: {
    color: COLORS.accentYellow,
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 3,
    overflow: 'hidden',
    opacity: 0.3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.pureWhite,
  },
  content: {
    flex: 1,
  },
  questionCard: {
    margin: 20,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 15,
    padding: 20,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 25,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: COLORS.accentYellow,
    padding: 18,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  optionButtonCorrect: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: `${COLORS.primaryGreen}40`,
  },
  optionButtonWrong: {
    borderColor: '#FF6347',
    backgroundColor: '#FF634740',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: COLORS.pureWhite,
  },
  hintBox: {
    backgroundColor: COLORS.skyBlue,
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.pureWhite,
    lineHeight: 20,
  },
  feedbackBox: {
    backgroundColor: COLORS.accentYellow,
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  feedbackIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  correctIcon: {
    color: COLORS.primaryGreen,
  },
  wrongIcon: {
    color: '#FF6347',
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 14,
    color: COLORS.earthBrown,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  pointsEarned: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 2,
    borderTopColor: COLORS.accentYellow,
  },
  hintButton: {
    flex: 1,
    backgroundColor: COLORS.skyBlue,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  hintButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  skipButton: {
    flex: 1,
    backgroundColor: COLORS.earthBrown,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.primaryGreen,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginTop: 10,
  },
});
