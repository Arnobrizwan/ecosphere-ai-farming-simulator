import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

export default function QuizResultsScreen({ navigation, route }) {
  const {
    quizId,
    score,
    correctAnswers,
    totalQuestions,
    stars,
    passed,
    answers,
    questions,
    rewards
  } = route.params;

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const starsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate score circle
    Animated.spring(scoreAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Animate stars
    Animated.stagger(200, [
      ...Array(stars).fill(0).map(() =>
        Animated.spring(starsAnim, {
          toValue: 1,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        })
      )
    ]).start();
  }, []);

  const getScoreColor = () => {
    if (score >= 90) return COLORS.primaryGreen;
    if (score >= 70) return COLORS.accentYellow;
    return '#FF6347';
  };

  const getResultMessage = () => {
    if (score >= 90) return '🎉 Excellent!';
    if (score >= 70) return '👍 Good Job!';
    if (passed) return '✓ Passed';
    return '📚 Keep Learning';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quiz Results</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Score Circle */}
        <Animated.View style={[
          styles.scoreCircle,
          {
            transform: [{
              scale: scoreAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1]
              })
            }]
          }
        ]}>
          <Text style={[styles.scorePercentage, { color: getScoreColor() }]}>
            {score}%
          </Text>
          <Text style={styles.scoreLabel}>{getResultMessage()}</Text>
        </Animated.View>

        {/* Stars */}
        <View style={styles.starsContainer}>
          {[1, 2, 3].map((star) => (
            <Animated.Text
              key={star}
              style={[
                styles.star,
                {
                  opacity: star <= stars ? 1 : 0.3,
                  transform: [{
                    scale: star <= stars ? starsAnim : 1
                  }]
                }
              ]}
            >
              ⭐
            </Animated.Text>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{correctAnswers}/{totalQuestions}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{passed ? 'Yes' : 'No'}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stars}</Text>
            <Text style={styles.statLabel}>Stars</Text>
          </View>
        </View>

        {/* Questions Breakdown */}
        <View style={styles.breakdownContainer}>
          <Text style={styles.breakdownTitle}>Questions Breakdown</Text>
          {answers.map((answer, index) => (
            <View key={index} style={styles.questionRow}>
              <View style={[
                styles.questionIndicator,
                answer.correct ? styles.indicatorCorrect : styles.indicatorWrong
              ]}>
                <Text style={styles.indicatorText}>
                  {answer.correct ? '✓' : '✗'}
                </Text>
              </View>
              <Text style={styles.questionRowText}>
                Question {index + 1}
              </Text>
              <Text style={styles.questionPoints}>
                {answer.points} pts
              </Text>
            </View>
          ))}
        </View>

        {/* Rewards */}
        {passed && (
          <View style={styles.rewardsContainer}>
            <Text style={styles.rewardsTitle}>🎁 Rewards Earned</Text>
            <View style={styles.rewardsList}>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardIcon}>⚡</Text>
                <Text style={styles.rewardText}>{rewards.xp} XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardIcon}>💰</Text>
                <Text style={styles.rewardText}>{rewards.coins} Coins</Text>
              </View>
              {rewards.badge && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardIcon}>🏆</Text>
                  <Text style={styles.rewardText}>{rewards.badge}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Review Section */}
        {!passed && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>💡 Review Recommended</Text>
            <Text style={styles.reviewText}>
              Review the questions you missed and try again to pass!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            navigation.goBack();
            // Could navigate to quiz again with same quizId
          }}
        >
          <Text style={styles.retryButtonText}>↺ Retry Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('Game')}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  content: {
    flex: 1,
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accentYellow,
    borderWidth: 8,
    borderColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  scorePercentage: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 18,
    color: COLORS.deepBlack,
    fontWeight: 'bold',
    marginTop: 5,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  star: {
    fontSize: 48,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 30,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    minWidth: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  breakdownContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 15,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentYellow,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  questionIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indicatorCorrect: {
    backgroundColor: COLORS.primaryGreen,
  },
  indicatorWrong: {
    backgroundColor: '#FF6347',
  },
  indicatorText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionRowText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  questionPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  rewardsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.primaryGreen,
    padding: 20,
    borderRadius: 15,
  },
  rewardsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 15,
    textAlign: 'center',
  },
  rewardsList: {
    gap: 10,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pureWhite,
    padding: 12,
    borderRadius: 10,
  },
  rewardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  reviewSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.accentYellow,
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.earthBrown,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 10,
  },
  reviewText: {
    fontSize: 14,
    color: COLORS.earthBrown,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 2,
    borderTopColor: COLORS.accentYellow,
  },
  retryButton: {
    flex: 1,
    backgroundColor: COLORS.earthBrown,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
