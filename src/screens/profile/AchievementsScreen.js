import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { AchievementService } from '../../services/achievement.service';
import BadgeCard from '../../components/BadgeCard';
import AchievementPopup from '../../components/AchievementPopup';

const TABS = ['All', 'Earned', 'Locked', 'Secret'];
const CATEGORIES = ['All', 'Milestone', 'Mastery', 'Challenge'];

export default function AchievementsScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [userAchievements, setUserAchievements] = useState(null);
  const [filteredAchievements, setFilteredAchievements] = useState([]);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    filterAchievements();
  }, [activeTab, activeCategory, userAchievements]);

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
      await loadAchievements(user.uid);
    }
  };

  const loadAchievements = async (uid) => {
    try {
      const data = await AchievementService.getUserAchievements(uid);
      setUserAchievements(data);
      setLoading(false);
    } catch (error) {
      console.log('Load achievements error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAchievements(userId);
    setRefreshing(false);
  };

  const filterAchievements = () => {
    if (!userAchievements) return;

    let achievements = AchievementService.getAchievements();
    const earnedIds = userAchievements.earned.map(e => e.achievementId);

    // Filter by tab
    if (activeTab === 'Earned') {
      achievements = achievements.filter(a => earnedIds.includes(a.id));
    } else if (activeTab === 'Locked') {
      achievements = achievements.filter(a => !earnedIds.includes(a.id) && !a.secretBadge);
    } else if (activeTab === 'Secret') {
      achievements = achievements.filter(a => a.secretBadge);
    }

    // Filter by category
    if (activeCategory !== 'All') {
      achievements = achievements.filter(a => 
        a.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    setFilteredAchievements(achievements);
  };

  const handleBadgePress = (achievement) => {
    const earned = userAchievements.earned.find(e => e.achievementId === achievement.id);
    if (earned || !achievement.secretBadge) {
      setSelectedAchievement(achievement);
      setShowPopup(true);
    }
  };

  const getStats = () => {
    if (!userAchievements) return { total: 0, earned: 0, completion: 0 };

    const allAchievements = AchievementService.getAchievements();
    const earned = userAchievements.earned.length;
    const total = allAchievements.length;
    const completion = Math.round((earned / total) * 100);

    return { total, earned, completion };
  };

  const renderBadge = ({ item }) => {
    const earned = userAchievements.earned.find(e => e.achievementId === item.id);
    return (
      <BadgeCard
        achievement={item}
        earned={earned}
        onPress={() => handleBadgePress(item)}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </View>
    );
  }

  const stats = getStats();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Achievements</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Header */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.earned}/{stats.total}</Text>
              <Text style={styles.summaryLabel}>Achievements</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.completion}%</Text>
              <Text style={styles.summaryLabel}>Completion</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{userAchievements.totalXPFromAchievements}</Text>
              <Text style={styles.summaryLabel}>Total XP</Text>
            </View>
          </View>

          <View style={styles.rarityRow}>
            <View style={styles.rarityItem}>
              <Text style={styles.rarityIcon}>⚪</Text>
              <Text style={styles.rarityCount}>{stats.earned - userAchievements.rareCount - userAchievements.epicCount - userAchievements.legendaryCount}</Text>
            </View>
            <View style={styles.rarityItem}>
              <Text style={styles.rarityIcon}>🔵</Text>
              <Text style={styles.rarityCount}>{userAchievements.rareCount}</Text>
            </View>
            <View style={styles.rarityItem}>
              <Text style={styles.rarityIcon}>🟣</Text>
              <Text style={styles.rarityCount}>{userAchievements.epicCount}</Text>
            </View>
            <View style={styles.rarityItem}>
              <Text style={styles.rarityIcon}>🟡</Text>
              <Text style={styles.rarityCount}>{userAchievements.legendaryCount}</Text>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                activeCategory === category && styles.categoryChipActive
              ]}
              onPress={() => setActiveCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category && styles.categoryTextActive
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Achievements Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={filteredAchievements}
            renderItem={renderBadge}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No achievements found</Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Achievement Popup */}
      <AchievementPopup
        visible={showPopup}
        achievement={selectedAchievement}
        onClose={() => {
          setShowPopup(false);
          setSelectedAchievement(null);
        }}
      />
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
  summaryCard: {
    backgroundColor: COLORS.accentYellow,
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.earthBrown,
  },
  rarityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: COLORS.primaryGreen,
  },
  rarityItem: {
    alignItems: 'center',
  },
  rarityIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  rarityCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.accentYellow,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  tabTextActive: {
    color: COLORS.pureWhite,
  },
  categoryScroll: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.accentYellow,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  categoryTextActive: {
    color: COLORS.pureWhite,
  },
  gridContainer: {
    paddingHorizontal: 7,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.earthBrown,
  },
});
