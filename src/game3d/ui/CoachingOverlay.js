import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * Coaching Overlay - Contextual advice display that adapts to player behavior
 * Appears as a subtle side panel with coach avatar and personalized messages
 */
const CoachingOverlay = ({ 
  advice, 
  visible, 
  onDismiss,
  onActionSelected 
}) => {
  const [slideAnim] = useState(new Animated.Value(400));
  const [autoDismissTimer, setAutoDismissTimer] = useState(null);

  useEffect(() => {
    if (visible && advice) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();

      // Auto-dismiss after 10 seconds unless player interacts
      const timer = setTimeout(() => {
        handleDismiss();
      }, 10000);
      setAutoDismissTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible, advice]);

  const handleDismiss = () => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
    }
    if (onDismiss) onDismiss();
  };

  const handleAction = (action) => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
    }
    if (onActionSelected) onActionSelected(action);
  };

  if (!advice) return null;

  const getToneColor = () => {
    switch (advice.tone) {
      case 'encouraging': return COLORS.primaryGreen;
      case 'gentle_reminder': return '#FF9800';
      case 'instructive': return '#356899';
      case 'empathetic': return '#9C27B0';
      case 'excited': return '#F9F6B8';
      default: return COLORS.primaryGreen;
    }
  };

  const getToneIcon = () => {
    switch (advice.tone) {
      case 'encouraging': return '💪';
      case 'gentle_reminder': return '💡';
      case 'instructive': return '📚';
      case 'empathetic': return '🤗';
      case 'excited': return '🎉';
      case 'friendly': return '😊';
      default: return '🤖';
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateX: slideAnim }] }
      ]}
    >
      <View style={[styles.panel, { borderLeftColor: getToneColor() }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.coachAvatar}>
            <Text style={styles.avatarIcon}>🤖</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.coachName}>AgriBot Coach</Text>
            <Text style={styles.coachSubtitle}>Your Personal Mentor</Text>
          </View>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tone Indicator */}
        <View style={[styles.toneIndicator, { backgroundColor: getToneColor() }]}>
          <Text style={styles.toneIcon}>{getToneIcon()}</Text>
          <Text style={styles.toneText}>{advice.tone.replace(/_/g, ' ')}</Text>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{advice.message}</Text>
        </View>

        {/* Reward Display */}
        {advice.reward && (
          <View style={styles.rewardContainer}>
            {advice.reward.xp && (
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardText}>+{advice.reward.xp} XP</Text>
              </View>
            )}
            {advice.reward.skillPoint && (
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardText}>
                  +1 {advice.reward.skillPoint.replace(/_/g, ' ')}
                </Text>
              </View>
            )}
            {advice.reward.bonus && (
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardText}>+{advice.reward.bonus} Bonus</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {advice.action && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: getToneColor() }]}
            onPress={() => handleAction(advice.action)}
          >
            <Text style={styles.actionButtonText}>
              {this.getActionLabel(advice.action)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Multiple Options */}
        {advice.options && advice.options.length > 0 && (
          <View style={styles.optionsContainer}>
            {advice.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleAction(option.action)}
              >
                <Text style={styles.optionButtonText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Learn More Link */}
        {advice.learnMore && (
          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={() => handleAction(advice.learnMore)}
          >
            <Text style={styles.learnMoreText}>📖 Learn More</Text>
          </TouchableOpacity>
        )}

        {/* Minimize Button */}
        <TouchableOpacity
          style={styles.minimizeButton}
          onPress={handleDismiss}
        >
          <Text style={styles.minimizeText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Helper method to get action label
CoachingOverlay.prototype.getActionLabel = function(action) {
  const labels = {
    show_smap_data: '📡 Show SMAP Data',
    show_smap_tutorial: '📚 SMAP Tutorial',
    setup_health_monitoring: '🔬 Setup Monitoring',
    show_ndvi_tutorial: '📊 NDVI Tutorial',
    show_hint: '💡 Show Hint',
    save_progress_exit: '💾 Save & Exit',
    load_simplified_mission: '🎮 Easier Version',
    retry_mission: '🔄 Try Again',
    exit_to_dashboard: '🏠 Dashboard',
    yield_optimization_guide: '📈 Optimization Guide',
    show_timeline_analysis: '📅 Timeline Analysis'
  };
  return labels[action] || 'Continue';
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    right: 0,
    width: 320,
    zIndex: 999,
  },
  panel: {
    backgroundColor: 'rgba(35, 39, 47, 0.95)',
    borderRadius: 12,
    borderLeftWidth: 4,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarIcon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  coachName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  coachSubtitle: {
    fontSize: 11,
    color: '#999',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.pureWhite,
    fontWeight: 'bold',
  },
  toneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 6,
  },
  toneIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  toneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    textTransform: 'capitalize',
  },
  messageContainer: {
    padding: 16,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.pureWhite,
  },
  rewardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  rewardBadge: {
    backgroundColor: 'rgba(52, 168, 83, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryGreen,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  actionButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.pureWhite,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionButtonText: {
    fontSize: 13,
    color: COLORS.pureWhite,
    textAlign: 'center',
  },
  learnMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  learnMoreText: {
    fontSize: 12,
    color: '#87CEEB',
    textDecorationLine: 'underline',
  },
  minimizeButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  minimizeText: {
    fontSize: 12,
    color: '#999',
  },
});

export default CoachingOverlay;
