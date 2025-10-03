import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { STORY_SCENARIOS } from '../../data/storyScenarios';
import { CHARACTERS } from '../../data/characters';
import CharacterDialogue from '../../components/CharacterDialogue';

const { width } = Dimensions.get('window');

/**
 * Story-Driven Sandbox Mode with NASA Data
 * 12 real-world farming scenarios using satellite data
 */
export default function SandboxModeScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [completedScenarios, setCompletedScenarios] = useState([]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
    }
  }, []);

  const filteredScenarios = STORY_SCENARIOS.filter((scenario) => {
    if (filter === 'all') return true;
    if (filter === 'beginner') return scenario.difficulty === 'beginner';
    if (filter === 'intermediate') return scenario.difficulty === 'intermediate';
    if (filter === 'advanced') return scenario.difficulty === 'advanced' || scenario.difficulty === 'expert';
    if (filter === 'crisis') return scenario.crisis === true;
    return true;
  });

  const handleScenarioPress = (scenario) => {
    setSelectedScenario(scenario);
    setShowScenarioModal(true);
  };

  const handleStartScenario = () => {
    Alert.alert(
      '🚀 Starting Scenario',
      `${selectedScenario.title}\n\nThis will launch the scenario with real NASA satellite data integration.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            setShowScenarioModal(false);
            // Would navigate to actual gameplay
            Alert.alert('Coming Soon', 'Full NASA data integration in development!');
          }
        }
      ]
    );
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return '#10B981';
      case 'intermediate': return COLORS.accentYellow;
      case 'advanced': return '#F97316';
      case 'expert': return '#EF4444';
      default: return COLORS.primaryGreen;
    }
  };

  const renderScenarioCard = (scenario) => {
    const character = CHARACTERS[scenario.character];
    const isCompleted = completedScenarios.includes(scenario.id);

    return (
      <TouchableOpacity
        key={scenario.id}
        style={[
          styles.scenarioCard,
          isCompleted && styles.scenarioCardCompleted,
          scenario.urgent && styles.scenarioCardUrgent
        ]}
        onPress={() => handleScenarioPress(scenario)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.characterAvatar}>{character?.avatar}</Text>
          <View style={styles.headerText}>
            <Text style={styles.characterName}>{character?.name}</Text>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(scenario.difficulty) }
              ]}
            >
              <Text style={styles.difficultyText}>
                {scenario.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
          {scenario.crisis && (
            <View style={styles.crisisTag}>
              <Text style={styles.crisisText}>⚠️</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.scenarioTitle}>{scenario.title}</Text>

        {/* Story Preview */}
        <Text style={styles.scenarioStory} numberOfLines={2}>
          "{scenario.story}"
        </Text>

        {/* NASA Data Tags */}
        <View style={styles.nasaIndicators}>
          {scenario.nasaData.smap && (
            <View style={styles.nasaTag}>
              <Text style={styles.nasaTagText}>🛰️ SMAP</Text>
            </View>
          )}
          {scenario.nasaData.rainfall && (
            <View style={styles.nasaTag}>
              <Text style={styles.nasaTagText}>🌧️ IMERG</Text>
            </View>
          )}
          {scenario.nasaData.ndvi && (
            <View style={styles.nasaTag}>
              <Text style={styles.nasaTagText}>🌿 NDVI</Text>
            </View>
          )}
          {scenario.nasaData.temperature && (
            <View style={styles.nasaTag}>
              <Text style={styles.nasaTagText}>🌡️ LST</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.duration}>⏱️ {scenario.duration}</Text>
          <Text style={styles.rewards}>
            🏆 {scenario.rewards.xp} XP | 💰 {scenario.rewards.coins}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderScenarioModal = () => {
    if (!selectedScenario) return null;

    const character = CHARACTERS[selectedScenario.character];

    return (
      <Modal
        visible={showScenarioModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScenarioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={styles.modalTitle}>{selectedScenario.title}</Text>

              {/* Character Dialogue */}
              <CharacterDialogue
                characterId={selectedScenario.character}
                dialogue={selectedScenario.story}
                emotion="neutral"
                showContinueButton={false}
              />

              {/* NASA Data Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🛰️ NASA Satellite Data</Text>
                <View style={styles.dataGrid}>
                  {selectedScenario.nasaData.smap && (
                    <View style={styles.dataCard}>
                      <Text style={styles.dataIcon}>🛰️</Text>
                      <Text style={styles.dataLabel}>SMAP Soil Moisture</Text>
                      <Text style={styles.dataValue}>
                        {(selectedScenario.nasaData.smap.target * 100).toFixed(0)}%
                      </Text>
                    </View>
                  )}
                  {selectedScenario.nasaData.rainfall && (
                    <View style={styles.dataCard}>
                      <Text style={styles.dataIcon}>🌧️</Text>
                      <Text style={styles.dataLabel}>IMERG Rainfall</Text>
                      <Text style={styles.dataValue}>
                        {selectedScenario.nasaData.rainfall.target}mm
                      </Text>
                    </View>
                  )}
                  {selectedScenario.nasaData.temperature && (
                    <View style={styles.dataCard}>
                      <Text style={styles.dataIcon}>🌡️</Text>
                      <Text style={styles.dataLabel}>Temperature</Text>
                      <Text style={styles.dataValue}>
                        {selectedScenario.nasaData.temperature.target}°C
                      </Text>
                    </View>
                  )}
                  {selectedScenario.nasaData.ndvi && (
                    <View style={styles.dataCard}>
                      <Text style={styles.dataIcon}>🌿</Text>
                      <Text style={styles.dataLabel}>NDVI Target</Text>
                      <Text style={styles.dataValue}>
                        {selectedScenario.nasaData.ndvi.target.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Objectives */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 Mission Objectives</Text>
                {selectedScenario.objectives.map((obj, index) => (
                  <View key={obj.id} style={styles.objectiveRow}>
                    <Text style={styles.objectiveNumber}>{index + 1}.</Text>
                    <Text style={styles.objectiveText}>{obj.text}</Text>
                  </View>
                ))}
              </View>

              {/* Pro Tips */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
                {selectedScenario.tips.map((tip, index) => (
                  <Text key={index} style={styles.tipText}>
                    • {tip}
                  </Text>
                ))}
              </View>

              {/* Rewards */}
              <View style={styles.rewardsSection}>
                <Text style={styles.sectionTitle}>🏆 Rewards</Text>
                <View style={styles.rewardsGrid}>
                  <View style={styles.rewardCard}>
                    <Text style={styles.rewardIcon}>⭐</Text>
                    <Text style={styles.rewardAmount}>
                      {selectedScenario.rewards.xp} XP
                    </Text>
                  </View>
                  <View style={styles.rewardCard}>
                    <Text style={styles.rewardIcon}>💰</Text>
                    <Text style={styles.rewardAmount}>
                      {selectedScenario.rewards.coins} Coins
                    </Text>
                  </View>
                  <View style={styles.rewardCard}>
                    <Text style={styles.rewardIcon}>🏅</Text>
                    <Text style={styles.rewardAmountBadge}>
                      {selectedScenario.rewards.badge}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowScenarioModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStartScenario}
                >
                  <Text style={styles.startButtonText}>🚀 Start Mission</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

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
        <Text style={styles.headerTitle}>🔬 Sandbox Mode</Text>
        <Text style={styles.headerSubtitle}>
          Story-Driven Scenarios with Real NASA Data
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'beginner', 'intermediate', 'advanced', 'crisis'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f && styles.filterTabTextActive
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Scenarios Grid */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.scenarioCount}>
          {filteredScenarios.length} scenarios available
        </Text>

        {filteredScenarios.map(renderScenarioCard)}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Scenario Detail Modal */}
      {renderScenarioModal()}
    </View>
  );
}

SandboxModeScreen.showGameOverlay = false;

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
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.accentYellow,
    marginTop: 5,
  },
  filterContainer: {
    backgroundColor: COLORS.pureWhite,
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  filterTabText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: COLORS.pureWhite,
  },
  content: {
    flex: 1,
  },
  scenarioCount: {
    fontSize: 12,
    color: COLORS.earthBrown,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontWeight: '600',
  },
  scenarioCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 16,
    padding: 15,
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  scenarioCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  scenarioCardUrgent: {
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  characterAvatar: {
    fontSize: 36,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  characterName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.earthBrown,
    marginBottom: 4,
  },
  difficultyBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  crisisTag: {
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crisisText: {
    fontSize: 18,
  },
  scenarioTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
  },
  scenarioStory: {
    fontSize: 14,
    color: COLORS.earthBrown,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  nasaIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  nasaTag: {
    backgroundColor: COLORS.skyBlue,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  nasaTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  duration: {
    fontSize: 12,
    color: COLORS.earthBrown,
    fontWeight: '600',
  },
  rewards: {
    fontSize: 12,
    color: COLORS.primaryGreen,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 15,
  },
  modalContent: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 15,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dataCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  dataIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  dataLabel: {
    fontSize: 11,
    color: COLORS.earthBrown,
    marginBottom: 4,
    textAlign: 'center',
  },
  dataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  objectiveRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  objectiveNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginRight: 10,
  },
  objectiveText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.deepBlack,
    lineHeight: 20,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.earthBrown,
    marginBottom: 8,
    lineHeight: 20,
  },
  rewardsSection: {
    marginTop: 20,
  },
  rewardsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  rewardIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    textAlign: 'center',
  },
  rewardAmountBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  startButton: {
    flex: 2,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
});
