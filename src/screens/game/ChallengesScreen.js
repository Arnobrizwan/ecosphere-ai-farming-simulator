import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { db } from '../../services/firebase.config';
import { collection, addDoc, getDocs, query, where, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import InteractiveFarmGame from '../../game2d/components/InteractiveFarmGame';

/**
 * Challenges Mode - Compete with other farmers
 * Weekly challenges, leaderboards, and multiplayer competitions
 */

const ACTIVE_CHALLENGES = [
  {
    id: 'weekly_1',
    title: 'Maximum Yield Challenge',
    description: 'Achieve the highest crop yield in 30 days',
    type: 'weekly',
    difficulty: 'medium',
    timeLimit: 30, // days
    goal: 'Produce 1000+ kg of crops',
    prize: '500 coins + Golden Harvest Badge',
    endsIn: '4 days',
    participants: 1247,
    icon: '🌾'
  },
  {
    id: 'daily_1',
    title: 'Water Conservation',
    description: 'Minimize water usage while maintaining crop health',
    type: 'daily',
    difficulty: 'easy',
    timeLimit: 7, // days
    goal: 'Use less than 500L water, keep health >70%',
    prize: '100 coins',
    endsIn: '18 hours',
    participants: 843,
    icon: '💧'
  },
  {
    id: 'tournament_1',
    title: 'Sustainable Farming Tournament',
    description: 'Balance yield, cost, and environmental impact',
    type: 'tournament',
    difficulty: 'hard',
    timeLimit: 60, // days
    goal: 'Best overall sustainability score',
    prize: '2000 coins + Champion Trophy',
    endsIn: '12 days',
    participants: 2891,
    icon: '🏆'
  }
];

const LEADERBOARD_DATA = [
  { rank: 1, username: 'FarmMaster99', score: 9850, avatar: '👑' },
  { rank: 2, username: 'GreenThumb', score: 9720, avatar: '🌱' },
  { rank: 3, username: 'CropKing', score: 9650, avatar: '🎯' },
  { rank: 4, username: 'EcoFarmer', score: 9480, avatar: '🌍' },
  { rank: 5, username: 'HarvestQueen', score: 9320, avatar: '👸' },
  { rank: 6, username: 'You', score: 8975, avatar: '⭐', highlighted: true },
  { rank: 7, username: 'SoilScientist', score: 8820, avatar: '🔬' },
  { rank: 8, username: 'WaterWizard', score: 8750, avatar: '💧' },
  { rank: 9, username: 'PlantPro', score: 8690, avatar: '🌿' },
  { rank: 10, username: 'FarmHero', score: 8550, avatar: '🦸' }
];

export default function ChallengesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('challenges'); // 'challenges', 'leaderboard', 'play'
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [userStats, setUserStats] = useState({
    rank: 6,
    totalScore: 8975,
    challengesCompleted: 12,
    wins: 3
  });

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      // Load user challenge stats from Firestore
      // For now using mock data
    }
  };

  const handleJoinChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setShowChallengeModal(true);
  };

  const handleStartChallenge = () => {
    setShowChallengeModal(false);
    setShowGameModal(true);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#666';
    }
  };

  const renderChallengeCard = ({ item }) => (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={() => handleJoinChallenge(item)}
    >
      <View style={styles.challengeHeader}>
        <Text style={styles.challengeIcon}>{item.icon}</Text>
        <View style={styles.challengeInfo}>
          <Text style={styles.challengeTitle}>{item.title}</Text>
          <Text style={styles.challengeDescription}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.challengeMeta}>
        <View style={[styles.typeBadge, {
          backgroundColor: item.type === 'tournament' ? '#9C27B0' :
                          item.type === 'weekly' ? '#2196F3' : '#4CAF50'
        }]}>
          <Text style={styles.typeBadgeText}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
          <Text style={styles.difficultyText}>{item.difficulty.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.challengeDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>⏱️ Ends in:</Text>
          <Text style={styles.detailValue}>{item.endsIn}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>👥 Participants:</Text>
          <Text style={styles.detailValue}>{item.participants.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🎯 Goal:</Text>
          <Text style={styles.detailValue}>{item.goal}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🏅 Prize:</Text>
          <Text style={styles.prizeText}>{item.prize}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.joinButton}
        onPress={() => handleJoinChallenge(item)}
      >
        <Text style={styles.joinButtonText}>Join Challenge</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderLeaderboardItem = ({ item }) => (
    <View style={[
      styles.leaderboardRow,
      item.highlighted && styles.leaderboardRowHighlighted
    ]}>
      <Text style={styles.rank}>#{item.rank}</Text>
      <Text style={styles.avatar}>{item.avatar}</Text>
      <Text style={[styles.username, item.highlighted && styles.usernameHighlighted]}>
        {item.username}
      </Text>
      <Text style={[styles.score, item.highlighted && styles.scoreHighlighted]}>
        {item.score.toLocaleString()}
      </Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>🏆 Challenges</Text>
        <Text style={styles.headerSubtitle}>Compete with farmers worldwide</Text>
      </View>

      {/* User Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>#{userStats.rank}</Text>
          <Text style={styles.statLabel}>Global Rank</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats.totalScore}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats.challengesCompleted}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats.wins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.tabActive]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}>
            Challenges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'challenges' && (
        <FlatList
          data={ACTIVE_CHALLENGES}
          renderItem={renderChallengeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.challengesList}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>🎯 Active Challenges</Text>
          }
        />
      )}

      {activeTab === 'leaderboard' && (
        <View style={styles.leaderboardContainer}>
          <Text style={styles.sectionTitle}>🏆 Global Leaderboard</Text>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.leaderboardHeaderText}>Rank</Text>
            <Text style={styles.leaderboardHeaderText}>Player</Text>
            <Text style={styles.leaderboardHeaderText}>Score</Text>
          </View>
          <FlatList
            data={LEADERBOARD_DATA}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item) => item.rank.toString()}
          />
        </View>
      )}

      {/* Challenge Details Modal */}
      <Modal
        visible={showChallengeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowChallengeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedChallenge && (
              <>
                <Text style={styles.modalIcon}>{selectedChallenge.icon}</Text>
                <Text style={styles.modalTitle}>{selectedChallenge.title}</Text>
                <Text style={styles.modalDescription}>{selectedChallenge.description}</Text>

                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalLabel}>Time Limit:</Text>
                    <Text style={styles.modalValue}>{selectedChallenge.timeLimit} days</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalLabel}>Difficulty:</Text>
                    <Text style={[styles.modalValue, { color: getDifficultyColor(selectedChallenge.difficulty) }]}>
                      {selectedChallenge.difficulty.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalLabel}>Goal:</Text>
                    <Text style={styles.modalValue}>{selectedChallenge.goal}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalLabel}>Prize:</Text>
                    <Text style={styles.modalPrize}>{selectedChallenge.prize}</Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowChallengeModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalStartButton}
                    onPress={handleStartChallenge}
                  >
                    <Text style={styles.modalStartText}>Start Challenge</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Game Modal */}
      <Modal
        visible={showGameModal}
        animationType="slide"
        onRequestClose={() => setShowGameModal(false)}
      >
        <View style={styles.gameContainer}>
          <View style={styles.gameHeader}>
            <TouchableOpacity
              style={styles.gameCloseButton}
              onPress={() => {
                Alert.alert(
                  'Leave Challenge?',
                  'Your progress will not be saved.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Leave', onPress: () => setShowGameModal(false), style: 'destructive' }
                  ]
                );
              }}
            >
              <Text style={styles.gameCloseText}>✕ Exit</Text>
            </TouchableOpacity>
            {selectedChallenge && (
              <Text style={styles.gameChallengeTitle}>{selectedChallenge.title}</Text>
            )}
          </View>
          <InteractiveFarmGame mode="challenge" challengeId={selectedChallenge?.id} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#FF5722',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20
  },
  backButton: {
    marginBottom: 10
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)'
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#FF5722'
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#666'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0'
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center'
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF5722'
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  tabTextActive: {
    color: '#FF5722',
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    margin: 15
  },
  challengesList: {
    padding: 15
  },
  challengeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  challengeHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  challengeIcon: {
    fontSize: 40,
    marginRight: 12
  },
  challengeInfo: {
    flex: 1
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666'
  },
  challengeMeta: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  difficultyText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  challengeDetails: {
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  detailLabel: {
    fontSize: 13,
    color: '#666'
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  prizeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  joinButton: {
    backgroundColor: '#FF5722',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  leaderboardContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  leaderboardHeader: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0'
  },
  leaderboardHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666'
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  leaderboardRowHighlighted: {
    backgroundColor: '#FFF3E0'
  },
  rank: {
    width: 40,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
  avatar: {
    width: 40,
    fontSize: 20,
    textAlign: 'center'
  },
  username: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 10
  },
  usernameHighlighted: {
    fontWeight: 'bold'
  },
  score: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666'
  },
  scoreHighlighted: {
    color: '#FF5722',
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '80%'
  },
  modalIcon: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  modalDetails: {
    marginBottom: 20
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  modalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  modalPrize: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#757575',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalCancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalStartButton: {
    flex: 2,
    backgroundColor: '#FF5722',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalStartText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  gameContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  gameHeader: {
    backgroundColor: '#FF5722',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  gameCloseButton: {
    padding: 8
  },
  gameCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  gameChallengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center'
  }
});

ChallengesScreen.showGameOverlay = false;
