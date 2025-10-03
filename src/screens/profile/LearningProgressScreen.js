import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { ProgressService } from '../../services/progress.service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.config';
import ProgressCard from '../../components/ProgressCard';

const { width } = Dimensions.get('window');

export default function LearningProgressScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [progressData, setProgressData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
      await loadProgress(user.uid);
    }
  };

  const loadProgress = async (uid) => {
    try {
      const progressRef = doc(db, 'users', uid, 'learningProgress', 'main');
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        setProgressData(progressSnap.data());
      } else {
        // Initialize progress for new user
        const initialData = await ProgressService.initializeProgress(uid);
        setProgressData(initialData);
      }
      
      // Load insights
      const userInsights = await ProgressService.getInsights(uid);
      setInsights(userInsights);
      
      setLoading(false);
    } catch (error) {
      console.log('Load progress error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgress(userId);
    setRefreshing(false);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🌱</Text>
      <Text style={styles.emptyTitle}>Start Your Learning Journey!</Text>
      <Text style={styles.emptyText}>
        Complete activities to track your progress
      </Text>
      <View style={styles.emptyActions}>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Tutorial')}
        >
          <Text style={styles.emptyButtonText}>📚 Start Tutorial</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('CampaignMode')}
        >
          <Text style={styles.emptyButtonText}>🎯 Try Mission</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Learning Progress</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      </View>
    );
  }

  if (!progressData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Learning Progress</Text>
        </View>
        {renderEmptyState()}
      </View>
    );
  }

  const { overview, skills, modules, performance, activity, milestones } = progressData;
  const levelInfo = ProgressService.calculateLevel(overview.totalXP);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Learning Progress</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Level Section */}
        <View style={styles.levelSection}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{levelInfo.level}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>Level {levelInfo.level}</Text>
            <Text style={styles.xpText}>
              {overview.totalXP} XP • {levelInfo.xpToNextLevel} to next level
            </Text>
          </View>
        </View>

        {/* XP Progress Bar */}
        <View style={styles.xpProgressContainer}>
          <View style={styles.xpProgressBar}>
            <View
              style={[
                styles.xpProgressFill,
                { width: `${levelInfo.progressPercentage}%` }
              ]}
            />
          </View>
          <Text style={styles.xpProgressText}>
            {Math.round(levelInfo.progressPercentage)}% to Level {levelInfo.level + 1}
          </Text>
        </View>

        {/* Overview Cards Row */}
        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>⚡</Text>
            <Text style={styles.overviewValue}>{overview.totalXP}</Text>
            <Text style={styles.overviewLabel}>Total XP</Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>🔥</Text>
            <Text style={styles.overviewValue}>{overview.currentStreak}</Text>
            <Text style={styles.overviewLabel}>Day Streak</Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>🏆</Text>
            <Text style={styles.overviewValue}>{modules.achievements.earned}</Text>
            <Text style={styles.overviewLabel}>Badges</Text>
          </View>
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Skills</Text>
          {Object.entries(skills).map(([skillName, skillData]) => (
            <View key={skillName} style={styles.skillRow}>
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>
                  {skillName.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <Text style={styles.skillLevel}>Level {skillData.level}</Text>
              </View>
              <View style={styles.skillProgressBar}>
                <View
                  style={[
                    styles.skillProgressFill,
                    { width: `${(skillData.level / skillData.maxLevel) * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.skillXP}>{skillData.xp} XP</Text>
            </View>
          ))}
        </View>

        {/* Module Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Learning Modules</Text>
          
          <ProgressCard
            icon="📖"
            title="Tutorials"
            current={modules.tutorials.completed}
            total={modules.tutorials.total}
            percentage={modules.tutorials.percentage}
            color={COLORS.primaryGreen}
            onPress={() => navigation.navigate('Tutorial')}
          />

          <ProgressCard
            icon="🎯"
            title="Missions"
            current={modules.missions.completed}
            total={modules.missions.total}
            percentage={modules.missions.percentage}
            color={COLORS.skyBlue}
            onPress={() => navigation.navigate('CampaignMode')}
          />

          <ProgressCard
            icon="📝"
            title="Quizzes"
            current={modules.quizzes.passed}
            total={modules.quizzes.total}
            percentage={modules.quizzes.percentage}
            color={COLORS.accentYellow}
            onPress={() => navigation.navigate('Quiz')}
          />

          <ProgressCard
            icon="🏆"
            title="Achievements"
            current={modules.achievements.earned}
            total={modules.achievements.total}
            percentage={modules.achievements.percentage}
            color={COLORS.earthBrown}
            onPress={() => {}}
          />
        </View>

        {/* Performance Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Performance</Text>
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Average Quiz Score</Text>
              <Text style={styles.performanceValue}>
                {performance.averageQuizScore}%
              </Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Mission Rating</Text>
              <Text style={styles.performanceValue}>
                {'⭐'.repeat(Math.floor(performance.averageMissionStars))} ({performance.averageMissionStars.toFixed(1)})
              </Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Perfect Quizzes</Text>
              <Text style={styles.performanceValue}>
                {performance.perfectQuizzes}
              </Text>
            </View>
            {performance.fastestQuizTime > 0 && (
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Fastest Quiz</Text>
                <Text style={styles.performanceValue}>
                  {Math.floor(performance.fastestQuizTime / 60)}m {performance.fastestQuizTime % 60}s
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Activity (Last 7 Days)</Text>
          <View style={styles.heatmapContainer}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const sessions = activity.weeklyActivity?.[index] || 0;
              const intensity = sessions === 0 ? 0 : sessions <= 2 ? 1 : sessions <= 4 ? 2 : 3;
              
              return (
                <View key={day} style={styles.heatmapDay}>
                  <View style={[styles.heatmapBar, styles[`intensity${intensity}`]]} />
                  <Text style={styles.heatmapLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent Milestones */}
        {milestones && milestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎉 Recent Milestones</Text>
            {milestones.slice(-5).reverse().map((milestone, index) => (
              <View key={index} style={styles.milestoneRow}>
                <View style={styles.milestoneDot} />
                <View style={styles.milestoneContent}>
                  <Text style={styles.milestoneDate}>{milestone.date}</Text>
                  <Text style={styles.milestoneDescription}>
                    {milestone.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Insights & Recommendations */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Recommendations</Text>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <Text style={styles.insightIcon}>{insight.icon}</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                  {insight.action && (
                    <Text style={styles.insightAction}>→ {insight.action}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
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
  backText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  content: {
    flex: 1,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.earthBrown,
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyActions: {
    gap: 10,
  },
  emptyButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.accentYellow,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primaryGreen,
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 4,
    borderColor: COLORS.pureWhite,
  },
  levelNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 5,
  },
  xpText: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  xpProgressContainer: {
    padding: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: COLORS.accentYellow,
  },
  xpProgressBar: {
    height: 12,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primaryGreen,
  },
  xpProgressText: {
    fontSize: 12,
    color: COLORS.earthBrown,
    textAlign: 'center',
  },
  overviewRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  overviewIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: COLORS.earthBrown,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 15,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: COLORS.accentYellow,
    padding: 12,
    borderRadius: 10,
  },
  skillInfo: {
    width: 140,
  },
  skillName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 3,
  },
  skillLevel: {
    fontSize: 12,
    color: COLORS.earthBrown,
  },
  skillProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  skillProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primaryGreen,
  },
  skillXP: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    width: 60,
    textAlign: 'right',
  },
  performanceCard: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  heatmapContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  heatmapDay: {
    alignItems: 'center',
  },
  heatmapBar: {
    width: 30,
    height: 60,
    borderRadius: 6,
    marginBottom: 8,
  },
  intensity0: {
    backgroundColor: '#E0E0E0',
  },
  intensity1: {
    backgroundColor: `${COLORS.skyBlue}80`,
  },
  intensity2: {
    backgroundColor: COLORS.primaryGreen,
  },
  intensity3: {
    backgroundColor: '#2D7A3E',
  },
  heatmapLabel: {
    fontSize: 10,
    color: COLORS.earthBrown,
  },
  milestoneRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  milestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primaryGreen,
    marginTop: 4,
    marginRight: 12,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneDate: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginBottom: 3,
  },
  milestoneDescription: {
    fontSize: 14,
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightMessage: {
    fontSize: 14,
    color: COLORS.deepBlack,
    marginBottom: 5,
    lineHeight: 20,
  },
  insightAction: {
    fontSize: 12,
    color: COLORS.primaryGreen,
    fontWeight: 'bold',
  },
});
