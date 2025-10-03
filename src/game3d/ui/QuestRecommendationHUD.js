import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * Quest Recommendation HUD - Shows AI recommendations as actionable quests
 */
const QuestRecommendationHUD = ({ 
  recommendations = [],
  onAccept,
  onDefer,
  onDismiss,
  onExplain,
  visible = true
}) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!visible || recommendations.length === 0) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return '#FF0000';
      case 'HIGH': return '#FFA500';
      case 'MEDIUM': return '#FFFF00';
      case 'LOW': return '#87CEEB';
      default: return '#999';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🔵';
      default: return '⚪';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Recommended Actions ({recommendations.length})</Text>
      </View>
      
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            expanded={expandedId === rec.id}
            onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
            onAccept={() => onAccept && onAccept(rec)}
            onDefer={() => onDefer && onDefer(rec)}
            onDismiss={() => onDismiss && onDismiss(rec)}
            onExplain={() => onExplain && onExplain(rec)}
            priorityColor={getPriorityColor(rec.priority)}
            priorityIcon={getPriorityIcon(rec.priority)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const RecommendationCard = ({
  recommendation,
  expanded,
  onToggle,
  onAccept,
  onDefer,
  onDismiss,
  onExplain,
  priorityColor,
  priorityIcon
}) => {
  const getTypeIcon = () => {
    const icons = {
      irrigation: '💧',
      harvest: '🌾',
      disease_prevention: '🛡️',
      crop_rescue: '🚨',
      efficiency: '⚡',
      expansion: '📈',
      strategy: '🎯',
      preparation: '⚠️'
    };
    return icons[recommendation.type] || '❓';
  };

  return (
    <TouchableOpacity
      style={[styles.card, expanded && styles.cardExpanded]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {/* Priority Badge */}
      <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
        <Text style={styles.priorityText}>{priorityIcon} {recommendation.priority}</Text>
      </View>

      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{recommendation.title}</Text>
          <Text style={styles.cardDescription}>{recommendation.description}</Text>
        </View>
      </View>

      {/* Impact/Benefit */}
      {recommendation.impact && (
        <View style={styles.impactContainer}>
          <Text style={styles.impactText}>💡 {recommendation.impact}</Text>
        </View>
      )}

      {/* Deadline */}
      {recommendation.deadline && (
        <View style={styles.deadlineContainer}>
          <Text style={styles.deadlineText}>
            ⏰ Complete within {recommendation.deadline}h
          </Text>
        </View>
      )}

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions Required:</Text>
            {recommendation.actions.map((action, idx) => (
              <View key={idx} style={styles.actionItem}>
                <Text style={styles.actionBullet}>•</Text>
                <Text style={styles.actionText}>
                  {action.type.replace(/_/g, ' ').toUpperCase()}
                  {action.plots && ` - Plots: ${Array.isArray(action.plots) ? action.plots.join(', ') : action.plots}`}
                </Text>
              </View>
            ))}
          </View>

          {/* Reward */}
          {recommendation.reward && (
            <View style={styles.rewardSection}>
              <Text style={styles.sectionTitle}>Rewards:</Text>
              <View style={styles.rewardItems}>
                {recommendation.reward.xp && (
                  <View style={styles.rewardItem}>
                    <Text style={styles.rewardText}>+{recommendation.reward.xp} XP</Text>
                  </View>
                )}
                {recommendation.reward.coins && (
                  <View style={styles.rewardItem}>
                    <Text style={styles.rewardText}>+{recommendation.reward.coins} Coins</Text>
                  </View>
                )}
                {recommendation.reward.coinsSaved && (
                  <View style={styles.rewardItem}>
                    <Text style={styles.rewardText}>Save {recommendation.reward.coinsSaved} Coins</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <Text style={styles.buttonText}>✓ Accept Quest</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.explainButton]}
              onPress={onExplain}
            >
              <Text style={styles.buttonText}>? Explain Why</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.deferButton]}
              onPress={onDefer}
            >
              <Text style={styles.buttonText}>⏰ Defer 24h</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dismissButton]}
              onPress={onDismiss}
            >
              <Text style={styles.buttonText}>✕ Dismiss</Text>
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
    left: 16,
    width: 320,
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
  list: {
    maxHeight: 500,
  },
  card: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardExpanded: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.pureWhite,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#CCC',
    lineHeight: 18,
  },
  impactContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(52, 168, 83, 0.2)',
    borderRadius: 6,
  },
  impactText: {
    fontSize: 11,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  deadlineContainer: {
    marginTop: 6,
  },
  deadlineText: {
    fontSize: 11,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionsSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  actionBullet: {
    fontSize: 12,
    color: COLORS.primaryGreen,
    marginRight: 6,
  },
  actionText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.pureWhite,
  },
  rewardSection: {
    marginBottom: 12,
  },
  rewardItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rewardItem: {
    backgroundColor: 'rgba(52, 168, 83, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rewardText: {
    fontSize: 11,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.primaryGreen,
  },
  explainButton: {
    backgroundColor: '#356899',
  },
  deferButton: {
    backgroundColor: '#FF9800',
  },
  dismissButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.pureWhite,
  },
});

export default QuestRecommendationHUD;
