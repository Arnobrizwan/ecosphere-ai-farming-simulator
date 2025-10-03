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
import { getLatestNDVI, predictSoilMoisture, analyzeSoilMoistureTrend } from '../../services/ml/soilMoisturePredictor';
import { getVegetationTrend } from '../../services/nasa/landsatService';

/**
 * Story-Driven Sandbox Mode with NASA Data
 * 12 real-world farmer scenarios using satellite data
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
    
    // Show NASA data info alert
    if (selectedScenario.nasaData) {
      Alert.alert(
        '🛰️ NASA Data Integration',
        'This scenario uses real satellite data:\n\n' +
        (selectedScenario.nasaData.smap ? "💧 SMAP - Soil Moisture\n" : "") +
        (selectedScenario.nasaData.rainfall ? "🌧️ IMERG - Rainfall\n" : "") +
        (selectedScenario.nasaData.ndvi ? "🌿 NDVI - Vegetation Health\n" : "") +
        (selectedScenario.nasaData.temperature ? "🌡️ LST - Land Surface Temperature" : ""),
        [
          { text: 'Skip Story', onPress: () => {
            setShowScenarioModal(false);
            handleStoryComplete();
          }},
          { text: 'Watch Story', onPress: () => {
            setShowScenarioModal(false);
            setStorySegments(segments);
            setShowStoryNarrative(true);
          }}
        ]
      );
    } else {
      // Close modal and show narrative
      setShowScenarioModal(false);
      setStorySegments(segments);
      setShowStoryNarrative(true);
    }
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
    console.log('[Sandbox] Story completed, starting NASA data fetch...');
    setShowStoryNarrative(false);
    setLoadingNasaData(true);

    try {
      // Fetch real NASA data for the scenario
      const location = selectedScenario.location || { lat: 23.81, lon: 90.41 };
      const today = new Date().toISOString().split('T')[0];
      
      console.log('[Sandbox] Location:', location, 'Date:', today);

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

      // Fetch ML predictions and NDVI
      try {
        console.log('[Sandbox] Fetching ML predictions...');
        
        // Get latest NDVI from processed data
        const ndviData = await getLatestNDVI();
        processedData.ndvi = ndviData;
        
        // Get soil moisture trend analysis
        const trendAnalysis = await analyzeSoilMoistureTrend();
        processedData.trend = trendAnalysis;

        // Landsat vegetation trend (last 60 days)
        const landsatEnd = new Date();
        const landsatStart = new Date();
        landsatStart.setDate(landsatEnd.getDate() - 60);

        const landsatTrend = await getVegetationTrend(
          location.lat,
          location.lon,
          landsatStart.toISOString().split('T')[0],
          landsatEnd.toISOString().split('T')[0]
        ).catch((err) => {
          console.warn('[Sandbox] Landsat trend unavailable, using fallback:', err.message);
          return {
            observations: 0,
            trend: [],
            source: 'Simulated Landsat Data'
          };
        });
        processedData.landsat = landsatTrend;
        
        // Predict soil moisture using ML model
        const currentPrecip = processedData.precipitation?.dailyAccumulation || 10;
        const prediction = await predictSoilMoisture({
          precipitation: currentPrecip,
          dayOfYear: new Date().getDate(),
          month: new Date().getMonth() + 1,
          precip7dSum: currentPrecip * 7, // Approximate
          ndvi: ndviData.ndvi,
        });
        processedData.mlPrediction = prediction;
        
        console.log('[Sandbox] ML data loaded:', {
          ndvi: ndviData.ndvi,
          trend: trendAnalysis.trend,
          prediction: prediction.soilMoisture,
          landsatObservations: landsatTrend?.observations || 0,
        });
        
      } catch (mlError) {
        console.warn('[Sandbox] ML prediction failed:', mlError);
      }

      setNasaData(processedData);
      setLoadingNasaData(false);
      setGameplayActive(true);

      // Show mission started with real data
      const soilMoisture = processedData.soilMoisture?.soilMoisture
        ? `🛰️ Soil Moisture: ${(processedData.soilMoisture.soilMoisture * 100).toFixed(1)}% (${processedData.soilMoisture.source})\n`
        : '';
      const precipitation = processedData.precipitation?.precipitationRate
        ? `🌧️ Precipitation: ${processedData.precipitation.precipitationRate.toFixed(1)} mm/day (${processedData.precipitation.source})\n`
        : '';

      // Extract temperature from POWER parameters array (with null check)
      const temp = processedData.climate?.parameters?.T2M?.[0]?.value;
      const temperature = temp !== null && temp !== undefined ? `🌡️ Temperature: ${temp.toFixed(1)}°C\n` : '';

      // Add ML predictions
      const ndvi = processedData.ndvi?.ndvi
        ? `🌿 NDVI: ${processedData.ndvi.ndvi.toFixed(2)} (${processedData.ndvi.source})\n`
        : '';
      const mlPrediction = processedData.mlPrediction?.soilMoisture
        ? `🤖 ML Prediction: ${(processedData.mlPrediction.soilMoisture * 100).toFixed(1)}% soil moisture\n`
        : '';
      const trend = processedData.trend?.trend
        ? `📈 Trend: ${processedData.trend.trend} (${processedData.trend.recommendation})\n`
        : '';
      const landsatSummary = processedData.landsat?.observations
        ? `🛰️ Landsat NDVI: ${processedData.landsat.trend[0]?.ndvi?.toFixed?.(2) || processedData.ndvi?.ndvi?.toFixed?.(2) || '—'} (${processedData.landsat.source})\n`
        : processedData.landsat?.source
          ? `🛰️ Landsat: ${processedData.landsat.source}\n`
          : '';

      Alert.alert(
        '🚀 Mission Started',
        `${selectedScenario.title}\n\n✅ Data Loaded:\n${soilMoisture}${precipitation}${temperature}${ndvi}${landsatSummary}${mlPrediction}${trend}\nUse the data to complete your objectives!`,
        [{ 
          text: 'Start Mission', 
          onPress: () => {
            console.log('Mission gameplay active');
            // Navigate to a dedicated mission screen instead of overlay
            navigation.navigate('MissionDashboard', {
              scenario: selectedScenario,
              nasaData: processedData
            });
          }
        }]
      );
    } catch (error) {
      setLoadingNasaData(false);
      console.error('[Sandbox] NASA data fetch error:', error);
      Alert.alert(
        '⚠️ Data Loading Failed',
        `Could not load all NASA data: ${error.message}\n\nContinuing with scenario objectives...`,
        [{ text: 'Continue', onPress: () => {
          // Navigate to MissionDashboard even with limited data
          navigation.navigate('MissionDashboard', {
            scenario: selectedScenario,
            nasaData: { error: error.message, fallbackMode: true }
          });
        }}]
      );
    }
  };

  const handleBackToScenarios = () => {
    console.log('[Sandbox] Back to scenarios pressed');
    setShowStoryNarrative(false);
    setSelectedScenario(null);
    setNasaData(null);
    setLoadingNasaData(false);
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
          onBack={handleBackToScenarios}
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
            <Text style={styles.loadingTitle}>Fetching NASA Satellites...</Text>
            <Text style={styles.loadingSubtitle}>
              Contacting SMAP, Landsat, MODIS, and IMERG services for real-time farm data.
            </Text>
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
  nasaDataOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nasaDataContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nasaDataItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  landsatTrendRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  landsatTrendDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  landsatTrendValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  landsatTrendTag: {
    fontSize: 11,
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  landsatTrendFootnote: {
    fontSize: 11,
    fontStyle: 'italic',
    flexWrap: 'wrap',
  },
  objectivesSection: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  nasaDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  nasaDataTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  nasaDataLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  nasaDataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  nasaDataSource: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flexWrap: 'wrap',
  },
  viewFullDataButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  viewFullDataButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
});
