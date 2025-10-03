import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

const GRID_COLUMNS = 3;
const TILE_COUNT = GRID_COLUMNS * GRID_COLUMNS;
const TARGET_TILES = 5;
const TILE_SIZE = Math.min(110, (Dimensions.get('window').width - 48) / GRID_COLUMNS);

const STAGE_DETAILS = {
  untouched: { label: 'Grass', color: '#31442b', icon: '🌿' },
  tilled: { label: 'Tilled', color: '#8B5A2B', icon: '⛏️' },
  planted: { label: 'Seeded', color: '#2e7d32', icon: '🌱' },
  watered: { label: 'Watered', color: '#1b5e20', icon: '💧' },
  growing: { label: 'Growing', color: '#3fa34d', icon: '🌾' },
  ready: { label: 'Ready', color: '#f4a261', icon: '🥕' },
  harvested: { label: 'Resting', color: '#6b8e23', icon: '🧺' },
};

const TOOLBAR = [
  { id: 'till', label: 'Till', icon: '⛏️', description: 'Loosen soil so it can breathe.' },
  { id: 'plant', label: 'Plant', icon: '🌱', description: 'Sow seeds on tilled soil.' },
  { id: 'water', label: 'Water', icon: '💧', description: 'Irrigate newly planted seeds.' },
  { id: 'harvest', label: 'Harvest', icon: '🧺', description: 'Collect ripe crops.' },
];

const TOOL_COSTS = {
  till: { energy: 1 },
  plant: { energy: 1, seeds: 1 },
  water: { energy: 1, water: 1 },
  harvest: { energy: 1 },
};

const TOOL_POINTS = {
  till: 50,
  plant: 70,
  water: 60,
  harvest: 150,
};

const createInitialTiles = () =>
  Array.from({ length: TILE_COUNT }, (_, index) => ({
    id: index,
    stage: 'untouched',
    milestones: {
      tilled: false,
      planted: false,
      watered: false,
      harvested: false,
    },
  }));

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

export const CampaignLevel1Screen = ({ navigation }) => {
  const [tiles, setTiles] = useState(createInitialTiles);
  const [selectedTool, setSelectedTool] = useState('till');
  const [resources, setResources] = useState({ energy: 18, seeds: 9, water: 10 });
  const [score, setScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Tap a plot to begin preparing the field.');
  const [eventLog, setEventLog] = useState([
    'Mission Brief: Prepare five plots, plant seeds, irrigate, and harvest a starter crop.',
  ]);
  const [progress, setProgress] = useState({ prepared: 0, planted: 0, irrigated: 0, harvested: 0 });
  const [levelComplete, setLevelComplete] = useState(false);
  const [levelData, setLevelData] = useState(null);

  const startTimeRef = useRef(Date.now());
  const timersRef = useRef({});

  useEffect(() => {
    startTimeRef.current = Date.now();
    return () => {
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLog = (entry) => {
    setEventLog((prev) => [entry, ...prev].slice(0, 6));
  };

  const clearAllTimers = () => {
    Object.values(timersRef.current).forEach((timerArray) => {
      timerArray.forEach((timer) => clearTimeout(timer));
    });
    timersRef.current = {};
  };

  const clearTimersForTile = (tileId) => {
    if (timersRef.current[tileId]) {
      timersRef.current[tileId].forEach((timer) => clearTimeout(timer));
      delete timersRef.current[tileId];
    }
  };

  const scheduleGrowth = (tileId) => {
    clearTimersForTile(tileId);

    const sproutTimeout = setTimeout(() => {
      setTiles((prevTiles) =>
        prevTiles.map((tile) => {
          if (tile.id !== tileId || tile.stage !== 'watered') {
            return tile;
          }
          updateLog(`Plot ${tileId + 1}: seedlings emerged!`);
          return { ...tile, stage: 'growing' };
        }),
      );
    }, 2200);

    const readyTimeout = setTimeout(() => {
      setTiles((prevTiles) =>
        prevTiles.map((tile) => {
          if (tile.id !== tileId || (tile.stage !== 'watered' && tile.stage !== 'growing')) {
            return tile;
          }
          updateLog(`Plot ${tileId + 1}: crop is ready for harvest.`);
          return { ...tile, stage: 'ready' };
        }),
      );
    }, 4500);

    timersRef.current[tileId] = [sproutTimeout, readyTimeout];
  };

  const computeProgress = (tileList) => {
    return tileList.reduce(
      (accumulator, tile) => {
        if (tile.milestones.tilled) accumulator.prepared += 1;
        if (tile.milestones.planted) accumulator.planted += 1;
        if (tile.milestones.watered) accumulator.irrigated += 1;
        if (tile.milestones.harvested) accumulator.harvested += 1;
        return accumulator;
      },
      { prepared: 0, planted: 0, irrigated: 0, harvested: 0 },
    );
  };

  const attemptAction = (tile, tool) => {
    switch (tool) {
      case 'till':
        if (tile.stage === 'untouched') {
          return {
            updatedTile: {
              ...tile,
              stage: 'tilled',
              milestones: { ...tile.milestones, tilled: true },
            },
            feedback: 'Soil prepared for seeds.',
            log: `Plot ${tile.id + 1}: tilled and ready.`,
            points: TOOL_POINTS.till,
          };
        }
        if (tile.stage === 'harvested') {
          return {
            updatedTile: {
              ...tile,
              stage: 'tilled',
              milestones: { ...tile.milestones, tilled: true },
            },
            feedback: 'Field reset and ready for a new cycle.',
            log: `Plot ${tile.id + 1}: soil loosened for the next planting.`,
            points: TOOL_POINTS.till,
          };
        }
        return null;
      case 'plant':
        if (tile.stage === 'tilled') {
          return {
            updatedTile: {
              ...tile,
              stage: 'planted',
              milestones: { ...tile.milestones, planted: true },
            },
            feedback: 'Seed planted successfully.',
            log: `Plot ${tile.id + 1}: seeds planted.`,
            points: TOOL_POINTS.plant,
          };
        }
        return null;
      case 'water':
        if (tile.stage === 'planted') {
          return {
            updatedTile: {
              ...tile,
              stage: 'watered',
              milestones: { ...tile.milestones, watered: true },
            },
            feedback: 'Moisture levels optimal.',
            log: `Plot ${tile.id + 1}: irrigation complete.`,
            points: TOOL_POINTS.water,
            scheduleGrowth: true,
          };
        }
        return null;
      case 'harvest':
        if (tile.stage === 'ready') {
          return {
            updatedTile: {
              ...tile,
              stage: 'harvested',
              milestones: { ...tile.milestones, harvested: true },
            },
            feedback: 'Harvest collected! Warehouse stocked.',
            log: `Plot ${tile.id + 1}: harvest delivered to storage.`,
            points: TOOL_POINTS.harvest,
            clearGrowth: true,
          };
        }
        return null;
      default:
        return null;
    }
  };

  const handleTilePress = (tile) => {
    if (levelComplete) {
      setStatusMessage('Mission already complete. Use the buttons below to continue.');
      return;
    }

    const cost = TOOL_COSTS[selectedTool];
    const lackingResource = Object.entries(cost).find(([resource, amount]) => resources[resource] < amount);

    if (lackingResource) {
      const [resource] = lackingResource;
      const readable = resource === 'seeds' ? 'seeds' : resource;
      setStatusMessage(`Not enough ${readable} for that action.`);
      updateLog(`Action halted: insufficient ${readable}.`);
      return;
    }

    const result = attemptAction(tile, selectedTool);

    if (!result) {
      setStatusMessage('That action cannot be applied to this plot right now.');
      return;
    }

    setTiles((prevTiles) =>
      prevTiles.map((current) => {
        if (current.id !== tile.id) {
          return current;
        }
        return result.updatedTile;
      }),
    );

    setResources((prev) => ({
      energy: prev.energy - (cost.energy ?? 0),
      seeds: prev.seeds - (cost.seeds ?? 0),
      water: prev.water - (cost.water ?? 0),
    }));

    setScore((prev) => prev + result.points);
    setStatusMessage(result.feedback);
    updateLog(result.log);

    if (result.scheduleGrowth) {
      scheduleGrowth(tile.id);
    }

    if (result.clearGrowth) {
      clearTimersForTile(tile.id);
    }
  };

  const missionObjectives = useMemo(
    () => [
      {
        id: 'prep',
        label: 'Prepare five plots for planting',
        current: progress.prepared,
        target: TARGET_TILES,
      },
      {
        id: 'plant',
        label: 'Sow seeds on five prepared plots',
        current: progress.planted,
        target: TARGET_TILES,
      },
      {
        id: 'water',
        label: 'Irrigate five planted plots',
        current: progress.irrigated,
        target: TARGET_TILES,
      },
      {
        id: 'harvest',
        label: 'Deliver five successful harvests',
        current: progress.harvested,
        target: TARGET_TILES,
      },
    ],
    [progress],
  );

  useEffect(() => {
    const currentProgress = computeProgress(tiles);
    setProgress(currentProgress);

    if (!levelComplete && currentProgress.harvested >= TARGET_TILES) {
      clearAllTimers();
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const energyBonus = Math.max(0, resources.energy * 10);
      const finalScore = score + energyBonus;
      const starRating = resources.energy >= 10 ? 3 : resources.energy >= 6 ? 2 : 1;

      const completionSummary = {
        score: Math.round(finalScore),
        stars: starRating,
        yield: currentProgress.harvested * 420,
        timeElapsed: Math.max(1, Math.round(elapsedSeconds)),
        tilesHarvested: currentProgress.harvested,
        energyLeft: resources.energy,
        waterLeft: resources.water,
        seedsLeft: resources.seeds,
      };

      setLevelData(completionSummary);
      setLevelComplete(true);
      updateLog('Mission accomplished! The community celebrates your first campaign harvest.');
      setStatusMessage('Mission complete. Review your results or replay to improve your score.');
    }
  }, [tiles, levelComplete, resources, score]);

  const resetLevel = () => {
    clearAllTimers();
    setTiles(createInitialTiles());
    setSelectedTool('till');
    setResources({ energy: 18, seeds: 9, water: 10 });
    setScore(0);
    setStatusMessage('Tap a plot to begin preparing the field.');
    setEventLog([
      'Mission Brief: Prepare five plots, plant seeds, irrigate, and harvest a starter crop.',
    ]);
    setProgress({ prepared: 0, planted: 0, irrigated: 0, harvested: 0 });
    setLevelComplete(false);
    setLevelData(null);
    startTimeRef.current = Date.now();
  };

  const renderStars = (count) => '⭐'.repeat(count).padEnd(3, '☆');

  if (levelComplete && levelData) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonLabel}>Back to Campaign</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.completionWrapper}>
          <Text style={styles.completionTitle}>🎉 Mission Complete!</Text>
          <Text style={styles.completionSubtitle}>
            You cultivated a healthy harvest for the community.
          </Text>

          <View style={styles.completionStatsCard}>
            <Text style={styles.statLine}>Score: {levelData.score.toLocaleString()}</Text>
            <Text style={styles.statLine}>Rating: {renderStars(levelData.stars)}</Text>
            <Text style={styles.statLine}>
              Yield Delivered: {levelData.yield.toLocaleString()} kg
            </Text>
            <Text style={styles.statLine}>Time: {formatTime(levelData.timeElapsed)}</Text>
            <Text style={styles.statLine}>Energy Remaining: {levelData.energyLeft}</Text>
          </View>

          <View style={styles.progressBreakdown}>
            {missionObjectives.map((objective) => (
              <Text key={objective.id} style={styles.breakdownLine}>
                {objective.label}: {Math.min(objective.current, objective.target)}/{objective.target}
              </Text>
            ))}
          </View>

          <View style={styles.completionButtonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('CampaignMode')}
            >
              <Text style={styles.primaryButtonText}>Continue Campaign</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={resetLevel}>
              <Text style={styles.primaryButtonText}>Replay Mission</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonIcon}>←</Text>
          <Text style={styles.backButtonLabel}>Back to Campaign</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.contentWrapper}>
        <View style={styles.headerSection}>
          <Text style={styles.levelTitle}>Campaign Level 1 · First Harvest</Text>
          <Text style={styles.levelSubtitle}>
            Complete the core farming loop: prepare soil, sow seeds, irrigate carefully, then harvest for the
            cooperative.
          </Text>
        </View>

        <View style={styles.dashboardRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Score</Text>
            <Text style={styles.metricValue}>{score.toLocaleString()}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Energy</Text>
            <Text style={styles.metricValue}>{resources.energy}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Seeds</Text>
            <Text style={styles.metricValue}>{resources.seeds}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Water</Text>
            <Text style={styles.metricValue}>{resources.water}</Text>
          </View>
        </View>

        <View style={styles.objectivesCard}>
          <Text style={styles.sectionTitle}>Mission Objectives</Text>
          {missionObjectives.map((objective) => {
            const complete = objective.current >= objective.target;
            return (
              <View key={objective.id} style={styles.objectiveRow}>
                <Text style={styles.objectiveStatus}>{complete ? '✅' : '⬜️'}</Text>
                <Text style={styles.objectiveText}>
                  {objective.label} ({Math.min(objective.current, objective.target)}/{objective.target})
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.fieldWrapper}>
          {tiles.map((tile) => {
            const stageInfo = STAGE_DETAILS[tile.stage];
            return (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, { backgroundColor: stageInfo.color, width: TILE_SIZE, height: TILE_SIZE }]}
                onPress={() => handleTilePress(tile)}
                activeOpacity={0.8}
              >
                <Text style={styles.tileIcon}>{stageInfo.icon}</Text>
                <Text style={styles.tileLabel}>{stageInfo.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Field Status</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>

        <View style={styles.logCard}>
          <Text style={styles.sectionTitle}>Operations Log</Text>
          {eventLog.map((entry, index) => (
            <Text key={`${entry}-${index}`} style={styles.logEntry}>
              • {entry}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View style={styles.toolbar}>
        {TOOLBAR.map((tool) => {
          const selected = selectedTool === tool.id;
          return (
            <TouchableOpacity
              key={tool.id}
              style={[styles.toolButton, selected && styles.toolButtonActive]}
              onPress={() => {
                setSelectedTool(tool.id);
                setStatusMessage(tool.description);
              }}
            >
              <Text style={styles.toolIcon}>{tool.icon}</Text>
              <Text style={styles.toolLabel}>{tool.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1a12',
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#102418',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 125, 50, 0.3)',
  },
  backButtonIcon: {
    color: '#e8f5e9',
    fontSize: 18,
    marginRight: 6,
  },
  backButtonLabel: {
    color: '#e8f5e9',
    fontSize: 14,
    fontWeight: '600',
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  headerSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e8f5e9',
    marginBottom: 6,
  },
  levelSubtitle: {
    fontSize: 16,
    color: '#b0c9b2',
    lineHeight: 22,
  },
  dashboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#a5d6a7',
    fontSize: 14,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  objectivesCard: {
    backgroundColor: 'rgba(33, 150, 83, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c8e6c9',
    marginBottom: 12,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  objectiveStatus: {
    fontSize: 18,
    marginRight: 10,
  },
  objectiveText: {
    flex: 1,
    color: '#dcedc8',
    fontSize: 15,
  },
  fieldWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 35, 24, 0.9)',
    marginBottom: 20,
  },
  tile: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    margin: 6,
  },
  tileIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  tileLabel: {
    color: '#f1f8e9',
    fontWeight: '600',
    fontSize: 13,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statusMessage: {
    color: '#e0f2f1',
    fontSize: 15,
    lineHeight: 20,
  },
  logCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  logEntry: {
    color: '#cfd8dc',
    fontSize: 14,
    marginBottom: 6,
  },
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#102418',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toolButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toolButtonActive: {
    backgroundColor: '#2e7d32',
  },
  toolIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  toolLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  completionWrapper: {
    padding: 24,
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e8f5e9',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#b0c9b2',
    textAlign: 'center',
    marginBottom: 24,
  },
  completionStatsCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  statLine: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 8,
  },
  progressBreakdown: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  breakdownLine: {
    color: '#dcedc8',
    fontSize: 15,
    marginBottom: 6,
  },
  completionButtonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#388e3c',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1e88e5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CampaignLevel1Screen;
