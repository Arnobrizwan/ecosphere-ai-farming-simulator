import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { useGameState } from '../../game2d/GameStateContext';

const { width } = Dimensions.get('window');

/**
 * Unified Game Dashboard
 * Central hub for all game modes, farm management, livestock, and progress
 */
export default function UnifiedGameDashboard({ navigation }) {
  const [userId, setUserId] = useState('');
  const { gameState } = useGameState();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
    }
  }, []);

  const dashboardSections = [
    {
      id: 'farm',
      title: '🚜 Farm Management',
      subtitle: 'Manage your interactive farm',
      color: COLORS.primaryGreen,
      items: [
        {
          id: 'interactive_farm',
          title: '2D Interactive Farm',
          icon: '🌾',
          description: 'Plant, water, and harvest crops',
          route: 'InteractiveFarm',
          stats: {
            fields: gameState.fields?.length || 6,
            crops: Object.keys(gameState.inventory || {}).length,
          },
        },
        {
          id: 'livestock',
          title: 'Livestock Management',
          icon: '🐄',
          description: 'Manage cattle, chickens, and more',
          route: 'LivestockDashboard',
          stats: {
            animals: 12,
            health: '95%',
          },
        },
        {
          id: 'resources',
          title: 'Resources',
          icon: '💰',
          description: 'Credits, water, and materials',
          route: 'Resources',
          stats: {
            credits: gameState.credits || 1000,
            water: gameState.water || 100,
          },
        },
      ],
    },
    {
      id: 'game_modes',
      title: '🎮 Game Modes',
      subtitle: 'Play and learn',
      color: COLORS.accentYellow,
      items: [
        {
          id: 'campaign',
          title: 'Campaign Mode',
          icon: '📖',
          description: 'Story-driven missions with characters',
          route: 'CampaignMode',
          stats: {
            chapter: '1',
            progress: '25%',
          },
        },
        {
          id: 'sandbox',
          title: 'Story Sandbox',
          icon: '🔬',
          description: '12 NASA-powered scenarios',
          route: 'SandboxMode',
          stats: {
            scenarios: 12,
            completed: 0,
          },
        },
        {
          id: 'challenges',
          title: 'Challenges',
          icon: '🏆',
          description: 'Compete with other farmers',
          route: 'Challenges',
          stats: {
            active: 3,
            rank: '#247',
          },
        },
      ],
    },
    {
      id: 'data',
      title: '🛰️ NASA Data & Insights',
      subtitle: 'Real satellite data',
      color: COLORS.skyBlue,
      items: [
        {
          id: 'satellite',
          title: 'Satellite Data',
          icon: '🌍',
          description: 'SMAP, MODIS, Landsat',
          route: 'SatelliteData',
        },
        {
          id: 'weather',
          title: 'Weather Alerts',
          icon: '🌦️',
          description: 'Real-time weather monitoring',
          route: 'WeatherAlerts',
        },
        {
          id: 'crop_health',
          title: 'Crop Health',
          icon: '🌱',
          description: 'AI-powered health analysis',
          route: 'CropHealth',
        },
      ],
    },
    {
      id: 'learning',
      title: '🎓 Learning & Progress',
      subtitle: 'Track your achievements',
      color: COLORS.earthBrown,
      items: [
        {
          id: 'achievements',
          title: 'Achievements',
          icon: '🏅',
          description: 'Badges and milestones',
          route: 'Achievements',
          stats: {
            earned: 8,
            total: 25,
          },
        },
        {
          id: 'tutorials',
          title: 'Tutorials',
          icon: '📚',
          description: 'Learn farming techniques',
          route: 'Tutorials',
        },
        {
          id: 'quizzes',
          title: 'Quizzes',
          icon: '❓',
          description: 'Test your knowledge',
          route: 'Quizzes',
        },
      ],
    },
  ];

  const renderItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => navigation.navigate(item.route)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{item.icon}</Text>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </View>

      {item.stats && (
        <View style={styles.statsContainer}>
          {Object.entries(item.stats).map(([key, value]) => (
            <View key={key} style={styles.statItem}>
              <Text style={styles.statLabel}>{key}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSection = (section) => (
    <View key={section.id} style={styles.section}>
      <View style={[styles.sectionHeader, { borderLeftColor: section.color }]}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
      </View>

      <View style={styles.cardsGrid}>
        {section.items.map(renderItem)}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌾 EcoSphere Farming</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatLabel}>XP</Text>
            <Text style={styles.headerStatValue}>{gameState.xp || 0}</Text>
          </View>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatLabel}>Level</Text>
            <Text style={styles.headerStatValue}>{gameState.level || 1}</Text>
          </View>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatLabel}>Coins</Text>
            <Text style={styles.headerStatValue}>
              {gameState.credits || 1000}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>🌾</Text>
          <Text style={styles.quickStatValue}>
            {gameState.fields?.filter((f) => f.crop).length || 0}/6
          </Text>
          <Text style={styles.quickStatLabel}>Fields Active</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>🐄</Text>
          <Text style={styles.quickStatValue}>12</Text>
          <Text style={styles.quickStatLabel}>Livestock</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>💧</Text>
          <Text style={styles.quickStatValue}>{gameState.water || 100}L</Text>
          <Text style={styles.quickStatLabel}>Water</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>🏆</Text>
          <Text style={styles.quickStatValue}>8</Text>
          <Text style={styles.quickStatLabel}>Achievements</Text>
        </View>
      </View>

      {/* Sections */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {dashboardSections.map(renderSection)}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

UnifiedGameDashboard.showGameOverlay = false;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.skyBlue,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 15,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatLabel: {
    fontSize: 12,
    color: COLORS.accentYellow,
    marginBottom: 4,
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: COLORS.pureWhite,
  },
  quickStatCard: {
    alignItems: 'center',
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.earthBrown,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.pureWhite,
    borderLeftWidth: 5,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginTop: 2,
  },
  cardsGrid: {
    paddingHorizontal: 15,
  },
  card: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.accentYellow,
    gap: 15,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.earthBrown,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginTop: 2,
  },
});
