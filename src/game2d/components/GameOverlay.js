import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameStateContext';
import { getSceneConfig } from '../scenes';
import FarmBoard from './FarmBoard';

function formatRelativeTime(isoString) {
  if (!isoString) {
    return 'first visit';
  }

  const timestamp = Date.parse(isoString);
  if (Number.isNaN(timestamp)) {
    return 'first visit';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

const GameOverlay = ({ routeName }) => {
  const { state, toggleOverlay, markTaskComplete } = useGameState();
  const insets = useSafeAreaInsets();
  const isActive = state.activeScene === routeName;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const sceneConfig = useMemo(() => getSceneConfig(routeName, state), [routeName, state]);
  const sceneStats = state.sceneStats[routeName] || { visits: 0 };
  const completedForScene = state.completedTasks[routeName] || [];

  if (!isActive) {
    return null;
  }

  const isExpanded = state.overlayExpanded;
  const overlayWidth = Math.min(340, windowWidth * 0.9);
  const overlayMaxHeight = Math.min(440, windowHeight * 0.75);

  return (
    <View pointerEvents="box-none" style={styles.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          {
            maxWidth: overlayWidth,
            maxHeight: overlayMaxHeight,
            right: 12 + insets.right,
            bottom: 12 + Math.max(insets.bottom, 6),
            paddingBottom: 12 + insets.bottom * 0.35,
            paddingTop: 10 + insets.top * 0.1,
          },
          isExpanded ? styles.expanded : styles.collapsed,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggleOverlay}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {isExpanded ? 'Hide 2D Farm' : 'Show 2D Farm HUD'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View pointerEvents="auto">
            <Text style={styles.sceneTitle}>{sceneConfig.title}</Text>
            <Text style={styles.sceneSubtitle}>{sceneConfig.subtitle}</Text>

            <View style={styles.sceneMetaRow}>
              <Text style={styles.sceneMetaText}>Visits: {sceneStats.visits}</Text>
              <Text style={styles.sceneMetaText}>Last: {formatRelativeTime(sceneStats.lastVisitedAt)}</Text>
            </View>

            <FarmBoard grid={sceneConfig.grid} />

            {sceneConfig.narrative && (
              <Text style={styles.narrative}>{sceneConfig.narrative}</Text>
            )}

            <View style={styles.metricsRow}>
              {sceneConfig.metrics.map((metric) => {
                const toneStyle =
                  metric.tone === 'good'
                    ? styles.metricGood
                    : metric.tone === 'warn'
                    ? styles.metricWarn
                    : metric.tone === 'critical'
                    ? styles.metricCritical
                    : styles.metricNeutral;
                return (
                  <View key={metric.key} style={[styles.metricCard, toneStyle]}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.tasksContainer}>
              <Text style={styles.tasksTitle}>Scene Objectives</Text>
              {sceneConfig.tasks.map((task, index) => {
                const taskId = task.id || `${routeName}-task-${index}`;
                const completed = completedForScene.includes(taskId);
                return (
                  <TouchableOpacity
                    key={taskId}
                    activeOpacity={0.8}
                    onPress={() => markTaskComplete(routeName, taskId)}
                    style={[styles.taskRow, completed && styles.taskRowCompleted]}
                  >
                    <View style={[styles.taskBullet, completed && styles.taskBulletCompleted]} />
                    <View style={styles.taskCopy}>
                      <Text style={[styles.taskLabel, completed && styles.taskLabelCompleted]}>{task.label}</Text>
                      {task.detail && (
                        <Text style={[styles.taskDetail, completed && styles.taskDetailCompleted]}>
                          {task.detail}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.taskStatus, completed && styles.taskStatusCompleted]}>
                      {completed ? 'Done' : 'Todo'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
    zIndex: 40,
  },
  expanded: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  collapsed: {
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  toggleButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    marginBottom: 6,
  },
  toggleText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  sceneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  sceneSubtitle: {
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.86)',
    marginTop: 2,
  },
  sceneMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sceneMetaText: {
    fontSize: 11,
    color: 'rgba(226, 232, 240, 0.7)',
  },
  narrative: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(248, 250, 252, 0.88)',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -4,
  },
  metricCard: {
    width: '48%',
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },
  metricValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: 'rgba(22, 163, 74, 0.65)',
  },
  metricWarn: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: 'rgba(202, 138, 4, 0.65)',
  },
  metricCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: 'rgba(220, 38, 38, 0.7)',
  },
  metricNeutral: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: 'rgba(37, 99, 235, 0.55)',
  },
  tasksContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  tasksTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    marginBottom: 6,
    minHeight: 52,
  },
  taskRowCompleted: {
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
  },
  taskBullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(248, 250, 252, 0.7)',
    marginRight: 10,
  },
  taskBulletCompleted: {
    backgroundColor: '#16A34A',
  },
  taskCopy: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  taskLabelCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(248, 250, 252, 0.68)',
  },
  taskDetail: {
    fontSize: 11,
    color: 'rgba(226, 232, 240, 0.78)',
    marginTop: 2,
  },
  taskDetailCompleted: {
    color: 'rgba(226, 232, 240, 0.6)',
  },
  taskStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    marginLeft: 8,
  },
  taskStatusCompleted: {
    color: '#22C55E',
  },
});

export default GameOverlay;
