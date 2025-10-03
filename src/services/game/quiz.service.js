/**
 * UC9 - Quiz System Service
 * Evaluate user understanding after tutorials and missions
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';

const QUIZ_BANK_COLLECTION = 'quiz_bank';
const USER_QUIZ_PROGRESS = 'user_quiz_progress';

// Quiz question bank
export const QUIZ_QUESTIONS = {
  planting_basics: [
    {
      id: 'q_plant_1',
      question: 'What is the optimal soil moisture for planting rice?',
      type: 'multiple_choice',
      options: ['10-15%', '20-30%', '40-50%', '60-70%'],
      correctAnswer: 1,
      explanation: 'Rice requires 20-30% soil moisture for optimal germination',
      points: 10,
      difficulty: 'easy',
    },
    {
      id: 'q_plant_2',
      question: 'Which NASA satellite provides soil moisture data?',
      type: 'multiple_choice',
      options: ['MODIS', 'SMAP', 'Landsat', 'GOES'],
      correctAnswer: 1,
      explanation: 'SMAP (Soil Moisture Active Passive) measures soil water content',
      points: 15,
      difficulty: 'medium',
    },
    {
      id: 'q_plant_3',
      question: 'What does NDVI measure?',
      type: 'multiple_choice',
      options: ['Soil pH', 'Vegetation health', 'Temperature', 'Rainfall'],
      correctAnswer: 1,
      explanation: 'NDVI (Normalized Difference Vegetation Index) indicates vegetation vigor',
      points: 15,
      difficulty: 'medium',
    },
  ],
  satellite_data: [
    {
      id: 'q_sat_1',
      question: 'An NDVI value of 0.2 indicates:',
      type: 'multiple_choice',
      options: ['Healthy vegetation', 'Moderate health', 'Vegetation stress', 'No vegetation'],
      correctAnswer: 2,
      explanation: 'NDVI < 0.3 indicates vegetation stress or sparse coverage',
      points: 20,
      difficulty: 'medium',
    },
    {
      id: 'q_sat_2',
      question: 'What is the ideal soil moisture range for most crops?',
      type: 'multiple_choice',
      options: ['5-10%', '15-20%', '25-35%', '45-50%'],
      correctAnswer: 2,
      explanation: 'Most crops thrive with 25-35% soil moisture',
      points: 15,
      difficulty: 'easy',
    },
    {
      id: 'q_sat_3',
      question: 'High temperature (>35°C) indicates:',
      type: 'true_false',
      statement: 'Crops may experience heat stress and require additional irrigation',
      correctAnswer: true,
      explanation: 'Temperatures above 35°C cause heat stress in most crops',
      points: 10,
      difficulty: 'easy',
    },
  ],
  irrigation: [
    {
      id: 'q_irr_1',
      question: 'When should you irrigate based on SMAP data?',
      type: 'multiple_choice',
      options: ['Soil moisture > 40%', 'Soil moisture 25-35%', 'Soil moisture < 20%', 'Always irrigate daily'],
      correctAnswer: 2,
      explanation: 'Irrigate when soil moisture drops below 20% to prevent drought stress',
      points: 20,
      difficulty: 'medium',
    },
    {
      id: 'q_irr_2',
      question: 'What is water use efficiency?',
      type: 'multiple_choice',
      options: [
        'Total water applied',
        'Crop yield per unit of water',
        'Rainfall amount',
        'Irrigation frequency',
      ],
      correctAnswer: 1,
      explanation: 'WUE measures crop production per unit of water used',
      points: 15,
      difficulty: 'medium',
    },
  ],
};

/**
 * Start quiz
 */
export const startQuiz = async (userId, category, mode = 'standard') => {
  const questions = QUIZ_QUESTIONS[category];
  
  if (!questions) {
    throw new Error('Quiz category not found');
  }

  // Shuffle questions
  const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
  
  // Select questions based on mode
  const selectedQuestions = mode === 'timed' 
    ? shuffledQuestions.slice(0, 5) 
    : shuffledQuestions;

  const quiz = {
    userId,
    category,
    mode,
    questions: selectedQuestions.map(q => ({ ...q, userAnswer: null })),
    currentQuestion: 0,
    score: 0,
    startedAt: new Date().toISOString(),
    status: 'active',
    timeLimit: mode === 'timed' ? 300000 : null, // 5 minutes for timed mode
  };

  const docRef = await addDoc(collection(db, 'active_quizzes'), quiz);

  return {
    success: true,
    quizId: docRef.id,
    quiz: {
      ...quiz,
      questions: quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        statement: q.statement,
        points: q.points,
      })),
    },
  };
};

/**
 * Submit answer
 */
export const submitAnswer = async (quizId, questionId, answer) => {
  const quizDocRef = doc(db, 'active_quizzes', quizId);
  const quizDoc = await getDoc(quizDocRef);

  if (!quizDoc.exists()) {
    throw new Error('Quiz not found');
  }

  const quiz = quizDoc.data();
  
  if (quiz.status !== 'active') {
    throw new Error('Quiz is not active');
  }

  // Check time limit
  if (quiz.timeLimit) {
    const elapsed = Date.now() - new Date(quiz.startedAt).getTime();
    if (elapsed > quiz.timeLimit) {
      await updateDoc(quizDocRef, { status: 'timeout' });
      return {
        success: false,
        error: 'Time limit exceeded',
      };
    }
  }

  // Find question
  const questionIndex = quiz.questions.findIndex(q => q.id === questionId);
  
  if (questionIndex === -1) {
    throw new Error('Question not found');
  }

  const question = quiz.questions[questionIndex];
  const isCorrect = checkAnswer(question, answer);

  // Update question with user answer
  const updatedQuestions = [...quiz.questions];
  updatedQuestions[questionIndex] = {
    ...question,
    userAnswer: answer,
    isCorrect,
  };

  // Update score
  const newScore = isCorrect ? quiz.score + question.points : quiz.score;

  await updateDoc(quizDocRef, {
    questions: updatedQuestions,
    score: newScore,
    currentQuestion: questionIndex + 1,
    updatedAt: new Date().toISOString(),
  });

  // Check if quiz completed
  const allAnswered = updatedQuestions.every(q => q.userAnswer !== null);

  if (allAnswered) {
    await completeQuiz(quiz.userId, quizId, quizDocRef, newScore, updatedQuestions);

    return {
      success: true,
      isCorrect,
      explanation: question.explanation,
      completed: true,
      finalScore: newScore,
    };
  }

  return {
    success: true,
    isCorrect,
    explanation: question.explanation,
    completed: false,
    nextQuestion: updatedQuestions[questionIndex + 1],
  };
};

/**
 * Check if answer is correct
 */
function checkAnswer(question, answer) {
  if (question.type === 'multiple_choice') {
    return answer === question.correctAnswer;
  }
  
  if (question.type === 'true_false') {
    return answer === question.correctAnswer;
  }
  
  return false;
}

/**
 * Complete quiz
 */
async function completeQuiz(userId, quizId, quizRef, finalScore, questions) {
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const percentage = (finalScore / totalPoints) * 100;

  // Determine grade
  let grade;
  let badge = null;
  let xpMultiplier = 1.0;

  if (percentage >= 90) {
    grade = 'A+';
    badge = 'quiz_master';
    xpMultiplier = 1.5;
  } else if (percentage >= 80) {
    grade = 'A';
    xpMultiplier = 1.3;
  } else if (percentage >= 70) {
    grade = 'B';
    xpMultiplier = 1.2;
  } else if (percentage >= 60) {
    grade = 'C';
    xpMultiplier = 1.0;
  } else {
    grade = 'F';
    xpMultiplier = 0.5;
  }

  const earnedXP = Math.floor(totalPoints * xpMultiplier);

  // Update user progress
  const userProgress = await getUserQuizProgress(userId);
  const newXP = (userProgress.xp || 0) + earnedXP;
  const badges = [...(userProgress.badges || [])];
  
  if (badge && !badges.includes(badge)) {
    badges.push(badge);
  }

  await setDoc(doc(db, USER_QUIZ_PROGRESS, userId), {
    ...userProgress,
    xp: newXP,
    badges,
    completedQuizzes: [...(userProgress.completedQuizzes || []), quizId],
    totalQuizzes: (userProgress.totalQuizzes || 0) + 1,
    averageScore: ((userProgress.averageScore || 0) * (userProgress.totalQuizzes || 0) + percentage) / ((userProgress.totalQuizzes || 0) + 1),
  }, { merge: true });

  // Mark quiz as completed
  await updateDoc(quizRef, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    finalScore,
    totalPoints,
    percentage,
    grade,
    earnedXP,
    badge,
  });

  return {
    finalScore,
    totalPoints,
    percentage,
    grade,
    earnedXP,
    badge,
  };
}

/**
 * Get quiz results
 */
export const getQuizResults = async (quizId) => {
  const quizDoc = await getDoc(doc(db, 'active_quizzes', quizId));

  if (!quizDoc.exists()) {
    throw new Error('Quiz not found');
  }

  const quiz = quizDoc.data();
  
  if (quiz.status !== 'completed') {
    throw new Error('Quiz not completed yet');
  }

  return {
    success: true,
    results: {
      score: quiz.finalScore,
      totalPoints: quiz.totalPoints,
      percentage: quiz.percentage,
      grade: quiz.grade,
      earnedXP: quiz.earnedXP,
      badge: quiz.badge,
      questions: quiz.questions.map(q => ({
        question: q.question,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
        explanation: q.explanation,
      })),
    },
  };
};

/**
 * Get user quiz progress
 */
export const getUserQuizProgress = async (userId) => {
  const docSnap = await getDoc(doc(db, USER_QUIZ_PROGRESS, userId));

  if (!docSnap.exists()) {
    const defaultProgress = {
      userId,
      xp: 0,
      badges: [],
      completedQuizzes: [],
      totalQuizzes: 0,
      averageScore: 0,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, USER_QUIZ_PROGRESS, userId), defaultProgress);
    return defaultProgress;
  }

  return docSnap.data();
};

/**
 * Get leaderboard
 */
export const getQuizLeaderboard = async (category = null, limitCount = 10) => {
  const q = query(
    collection(db, USER_QUIZ_PROGRESS),
    orderBy('xp', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  
  const leaderboard = snapshot.docs.map((doc, index) => ({
    rank: index + 1,
    userId: doc.id,
    ...doc.data(),
  }));

  return {
    success: true,
    leaderboard,
  };
};
