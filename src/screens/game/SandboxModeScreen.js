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
import StoryNarrative from '../../components/StoryNarrative';

// NASA Data Services
import { fetchSMAPSoilMoisture } from '../../services/nasa/smapService';
import { fetchIMERGPrecipitation } from '../../services/nasa/imergService';
import { getDailyPoint } from '../../services/power.service';

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
  const [showStoryNarrative, setShowStoryNarrative] = useState(false);
  const [storySegments, setStorySegments] = useState([]);
  const [nasaData, setNasaData] = useState(null);
  const [loadingNasaData, setLoadingNasaData] = useState(false);
  const [gameplayActive, setGameplayActive] = useState(false);

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
    if (!selectedScenario) return;

    // Parse story into segments
    const segments = parseStoryIntoSegments(selectedScenario.story);
    
    // Add objectives as additional story segments
    const objectiveText = "Your objectives:\n" + 
      selectedScenario.objectives.map((obj, idx) => `${idx + 1}. ${obj.text}`).join('\n');
    segments.push(objectiveText);

    // Add NASA data info
    if (selectedScenario.nasaData) {
      segments.push(
        "NASA Satellite Data Available:\n" +
        (selectedScenario.nasaData.smap ? "🛰️ SMAP - Soil Moisture\n" : "") +
        (selectedScenario.nasaData.rainfall ? "🌧️ IMERG - Rainfall\n" : "") +
        (selectedScenario.nasaData.ndvi ? "🌿 NDVI - Vegetation Health\n" : "") +
        (selectedScenario.nasaData.temperature ? "🌡️ LST - Land Surface Temperature" : "")
      );
    }

    // Close modal and show narrative
    setShowScenarioModal(false);
    setStorySegments(segments);
    setShowStoryNarrative(true);
  };

  const parseStoryIntoSegments = (story) => {
    // Split by sentences, keeping punctuation
    const sentences = story.match(/[^.!?]+[.!?]+/g) || [story];
    
    // Group every 2-3 sentences into a segment
    const segments = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const segment = sentences.slice(i, i + 2).join(' ').trim();
      if (segment) segments.push(segment);
    }
    
    return segments.length > 0 ? segments : [story];
  };

  const handleStoryComplete = async () => {
    setShowStoryNarrative(false);
    setLoadingNasaData(true);

    try {
      // Fetch real NASA data for the scenario
      const location = selectedScenario.location || { lat: 23.81, lon: 90.41 };
      const today = new Date().toISOString().split('T')[0];

      const nasaDataPromises = [];

      // Fetch SMAP soil moisture if needed (with fallback)
      if (selectedScenario.nasaData?.smap) {
        nasaDataPromises.push(
          fetchSMAPSoilMoisture(location.lat, location.lon, today).catch((err) => {
            console.warn('[Sandbox] SMAP unavailable, using fallback data:', err.message);
            return {
              soilMoisture: 0.25 + Math.random() * 0.15, // 25-40% (realistic range)
              date: today,
              location: { latitude: location.lat, longitude: location.lon },
              unit: 'cm³/cm³',
              source: 'Simulated SMAP Data',
            };
          })
        );
      }

      // Fetch IMERG precipitation if needed (with fallback)
      if (selectedScenario.nasaData?.rainfall) {
        nasaDataPromises.push(
          fetchIMERGPrecipitation(location.lat, location.lon, today).catch((err) => {
            console.warn('[Sandbox] IMERG unavailable, using fallback data:', err.message);
            return {
              precipitationRate: Math.random() * 15, // 0-15 mm/day
              dailyAccumulation: Math.random() * 15,
              probability: Math.random() * 100,
              precipitationType: 'rain',
              date: today,
              source: 'Simulated IMERG Data',
            };
          })
        );
      }

      // Fetch POWER climate data if needed
      if (selectedScenario.nasaData?.temperature) {
        const startDate = today.replace(/-/g, '');
        const endDate = startDate;
        nasaDataPromises.push(
          getDailyPoint({
            latitude: location.lat,
            longitude: location.lon,
            start: startDate,
            end: endDate,
            parameters: ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN'],
          }).catch((err) => ({
            type: 'power',
            error: err.message,
          }))
        );
      }

      // Fetch all NASA data
      const results = await Promise.all(nasaDataPromises);

      // Process results
      const processedData = {};
      results.forEach((result) => {
        if (result.error) {
          console.warn(`[Sandbox] ${result.type} error:`, result.error);
        } else if (result.soilMoisture !== undefined) {
          // SMAP soil moisture
          processedData.soilMoisture = result;
        } else if (result.precipitationRate !== undefined) {
          // IMERG precipitation
          processedData.precipitation = result;
        } else if (result.parameters) {
          // POWER climate data
          processedData.climate = result;
        }
      });

      setNasaData(processedData);
      setLoadingNasaData(false);
      setGameplayActive(true);

      // Show mission started with real data
      const soilMoisture = processedData.soilMoisture?.soilMoisture
        ? `🛰️ Soil Moisture: ${(processedData.soilMoisture.soilMoisture * 100).toFixed(1)}%\n`
        : '';
      const precipitation = processedData.precipitation?.precipitationRate
        ? `🌧️ Precipitation: ${processedData.precipitation.precipitationRate.toFixed(1)} mm/day\n`
        : '';

      // Extract temperature from POWER parameters array (with null check)
      const temp = processedData.climate?.parameters?.T2M?.[0]?.value;
      const temperature = temp !== null && temp !== undefined ? `🌡️ Temperature: ${temp.toFixed(1)}°C\n` : '';

      Alert.alert(
        '🚀 Mission Started',
        `${selectedScenario.title}\n\n✅ NASA Data Loaded:\n${soilMoisture}${precipitation}${temperature}\nUse the data to complete your objectives!`,
        [{ text: 'Start Mission', onPress: () => console.log('Mission gameplay active') }]
      );
    } catch (error) {
      setLoadingNasaData(false);
      console.error('[Sandbox] NASA data fetch error:', error);
      Alert.alert(
        '⚠️ Data Loading Failed',
        `Could not load all NASA data: ${error.message}\n\nContinuing with scenario objectives...`,
        [{ text: 'Continue', onPress: () => setGameplayActive(true) }]
      );
    }
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

      {/* Story Narrative */}
      {selectedScenario && (
        <StoryNarrative
          visible={showStoryNarrative}
          onClose={handleStoryComplete}
          storySegments={storySegments}
          characterName={CHARACTERS[selectedScenario.character]?.name || 'Narrator'}
          characterAvatar={CHARACTERS[selectedScenario.character]?.avatar || '👤'}
        />
      )}

      {/* Loading NASA Data Overlay */}
      {loadingNasaData && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingIcon}>🛰️</Text>
            <Text style={styles.loadingTitle}>Loading NASA Data...</Text>
            <Text style={styles.loadingText}>
              Fetching real-time satellite data{'\n'}SMAP • IMERG • POWER
            </Text>
          </View>
        </View>
      )}

      {/* NASA Data Dashboard */}
      {gameplayActive && nasaData && (
        <View style={styles.nasaDataOverlay}>
          <View style={styles.nasaDataCard}>
            <View style={styles.nasaDataHeader}>
              <Text style={styles.nasaDataTitle}>🛰️ Live NASA Data</Text>
              <TouchableOpacity
                onPress={() => {
                  setGameplayActive(false);
                  setNasaData(null);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.nasaDataContent}>
              {nasaData.soilMoisture && (
                <View style={styles.nasaDataItem}>
                  <Text style={styles.nasaDataLabel}>💧 Soil Moisture</Text>
                  <Text style={styles.nasaDataValue}>
                    {(nasaData.soilMoisture.soilMoisture * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.nasaDataSource}>
                    {nasaData.soilMoisture.source || 'SMAP SPL3SMP_E'}
                  </Text>
                </View>
              )}

              {nasaData.precipitation && (
                <View style={styles.nasaDataItem}>
                  <Text style={styles.nasaDataLabel}>🌧️ Precipitation</Text>
                  <Text style={styles.nasaDataValue}>
                    {nasaData.precipitation.precipitationRate.toFixed(2)} mm/day
                  </Text>
                  <Text style={styles.nasaDataSource}>
                    {nasaData.precipitation.source || 'IMERG GPM_3IMERGDF'}
                  </Text>
                </View>
              )}

              {nasaData.climate?.parameters && (
                <>
                  {nasaData.climate.parameters.T2M?.[0]?.value !== null &&
                    nasaData.climate.parameters.T2M?.[0]?.value !== undefined && (
                      <View style={styles.nasaDataItem}>
                        <Text style={styles.nasaDataLabel}>🌡️ Temperature</Text>
                        <Text style={styles.nasaDataValue}>
                          {nasaData.climate.parameters.T2M[0].value.toFixed(1)}°C
                        </Text>
                        <Text style={styles.nasaDataSource}>NASA POWER</Text>
                      </View>
                    )}

                  {nasaData.climate.parameters.ALLSKY_SFC_SW_DWN?.[0]?.value !== null &&
                    nasaData.climate.parameters.ALLSKY_SFC_SW_DWN?.[0]?.value !== undefined && (
                      <View style={styles.nasaDataItem}>
                        <Text style={styles.nasaDataLabel}>☀️ Solar Radiation</Text>
                        <Text style={styles.nasaDataValue}>
                          {nasaData.climate.parameters.ALLSKY_SFC_SW_DWN[0].value.toFixed(1)} MJ/m²
                        </Text>
                        <Text style={styles.nasaDataSource}>NASA POWER</Text>
                      </View>
                    )}
                </>
              )}

              {selectedScenario && selectedScenario.objectives && (
                <View style={styles.objectivesSection}>
                  <Text style={styles.objectivesTitle}>📋 Mission Objectives</Text>
                  {selectedScenario.objectives.map((obj, idx) => (
                    <Text key={idx} style={styles.objectiveItem}>
                      • {obj}
                    </Text>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.viewFullDataButton}
                onPress={() => {
                  Alert.alert(
                    '🛰️ Full NASA Data',
                    JSON.stringify(nasaData, null, 2),
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.viewFullDataButtonText}>View Raw Data</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.earthBrown,
    textAlign: 'center',
    lineHeight: 22,
  },
  nasaDataOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  nasaDataCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  nasaDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.skyBlue,
  },
  nasaDataTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  nasaDataContent: {
    padding: 20,
  },
  nasaDataItem: {
    backgroundColor: COLORS.skyBlue,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  nasaDataLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 6,
  },
  nasaDataValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 4,
  },
  nasaDataSource: {
    fontSize: 12,
    color: COLORS.earthBrown,
    fontStyle: 'italic',
  },
  objectivesSection: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  objectivesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  objectiveItem: {
    fontSize: 14,
    color: COLORS.deepBlack,
    marginBottom: 6,
    lineHeight: 20,
  },
  viewFullDataButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  viewFullDataButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
});
