import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * Task Queue HUD - On-screen display of active tasks
 * Shows task progress, worker status, and allows interaction
 */
const TaskQueueHUD = ({ 
  tasks = [], 
  onTaskClick,
  onTaskPause,
  onTaskResume,
  onTaskCancel,
  visible = true 
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  if (!visible || tasks.length === 0) return null;

  const activeTasks = tasks.filter(t => 
    t.status === 'active' || t.status === 'scheduled' || t.status === 'paused' || t.status === 'waiting'
  );

  const handleTaskClick = (task) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(task.id);
      if (onTaskClick) onTaskClick(task);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Active Tasks ({activeTasks.length})</Text>
      </View>
      
      <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
        {activeTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            expanded={expandedTaskId === task.id}
            onPress={() => handleTaskClick(task)}
            onPause={() => onTaskPause && onTaskPause(task.id)}
            onResume={() => onTaskResume && onTaskResume(task.id)}
            onCancel={() => onTaskCancel && onTaskCancel(task.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const TaskCard = ({ task, expanded, onPress, onPause, onResume, onCancel }) => {
  const getStatusColor = () => {
    switch (task.status) {
      case 'active': return COLORS.primaryGreen;
      case 'scheduled': return COLORS.skyBlue;
      case 'paused': return '#FF9800';
      case 'waiting': return '#FF5722';
      default: return '#999';
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'active': return '▶️';
      case 'scheduled': return '⏰';
      case 'paused': return '⏸️';
      case 'waiting': return '⚠️';
      default: return '•';
    }
  };

  const getTimeDisplay = () => {
    if (task.status === 'scheduled' && task.nextExecutionTime) {
      const now = Date.now();
      const timeUntil = task.nextExecutionTime - now;
      
      if (timeUntil < 0) return 'Starting soon...';
      
      const hours = Math.floor(timeUntil / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `Starts in ${hours}h ${minutes}m`;
      }
      return `Starts in ${minutes}m`;
    }
    
    return null;
  };

  return (
    <TouchableOpacity 
      style={[styles.taskCard, expanded && styles.taskCardExpanded]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskIcon}>{task.icon}</Text>
        <View style={styles.taskInfo}>
          <Text style={styles.taskName}>{task.name}</Text>
          {task.status === 'active' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${task.progress || 0}%`, backgroundColor: getStatusColor() }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{Math.round(task.progress || 0)}%</Text>
            </View>
          )}
          {task.status === 'scheduled' && (
            <Text style={styles.timeText}>{getTimeDisplay()}</Text>
          )}
          {task.status === 'waiting' && (
            <Text style={styles.warningText}>
              ⚠️ Waiting: {task.waitReason || 'Low resources'}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        </View>
      </View>
      
      {task.assignedWorker && (
        <Text style={styles.workerText}>Worker Bot #{task.assignedWorker.id || '1'}</Text>
      )}
      
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Target Plots:</Text>
            <Text style={styles.detailValue}>
              {task.targetPlots?.length || 0} plots
            </Text>
          </View>
          
          {task.resourceRequirements && Object.keys(task.resourceRequirements).length > 0 && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailLabel}>Resources:</Text>
              <Text style={styles.detailValue}>
                {Object.entries(task.resourceRequirements)
                  .map(([key, val]) => `${key}: ${val}`)
                  .join(', ')}
              </Text>
            </View>
          )}
          
          {task.trigger && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailLabel}>Trigger:</Text>
              <Text style={styles.detailValue}>
                {task.trigger.type} {task.trigger.threshold ? `< ${task.trigger.threshold}` : ''}
              </Text>
            </View>
          )}
          
          <View style={styles.actionButtons}>
            {task.status === 'active' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.pauseButton]}
                onPress={onPause}
              >
                <Text style={styles.actionButtonText}>⏸️ Pause</Text>
              </TouchableOpacity>
            )}
            
            {task.status === 'paused' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.resumeButton]}
                onPress={onResume}
              >
                <Text style={styles.actionButtonText}>▶️ Resume</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.actionButtonText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 280,
    maxHeight: '70%',
    backgroundColor: 'rgba(35, 39, 47, 0.95)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryGreen,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  taskList: {
    maxHeight: 400,
  },
  taskCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskCardExpanded: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.pureWhite,
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.pureWhite,
    fontWeight: '600',
    minWidth: 35,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.skyBlue,
  },
  warningText: {
    fontSize: 11,
    color: '#FF5722',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusIcon: {
    fontSize: 16,
  },
  workerText: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    marginLeft: 32,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.pureWhite,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resumeButton: {
    backgroundColor: COLORS.primaryGreen,
  },
  cancelButton: {
    backgroundColor: '#FF5722',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.pureWhite,
  },
});

export default TaskQueueHUD;
