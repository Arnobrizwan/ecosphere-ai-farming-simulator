import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function LockedFeatureOverlay({
  visible,
  feature,
  eligibility,
  onClose,
  onUnlock
}) {
  if (!feature || !eligibility) return null;

  const { results, details, canUnlock, progress } = eligibility;

  const renderRequirement = (label, met, current, required) => (
    <View style={styles.requirementRow}>
      <Text style={[styles.requirementIcon, met ? styles.metIcon : styles.unmetIcon]}>
        {met ? '✓' : '✗'}
      </Text>
      <View style={styles.requirementContent}>
        <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
          {label}
        </Text>
        {!met && current !== undefined && required !== undefined && (
          <Text style={styles.requirementProgress}>
            {current}/{required}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Lock Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>

            {/* Feature Info */}
            <Text style={styles.featureName}>{feature.displayName}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>

            {/* Benefit */}
            <View style={styles.benefitBox}>
              <Text style={styles.benefitIcon}>✨</Text>
              <Text style={styles.benefitText}>{feature.benefitText}</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Overall Progress</Text>
                <Text style={styles.progressPercentage}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>

            {/* Requirements Checklist */}
            <View style={styles.requirementsSection}>
              <Text style={styles.sectionTitle}>Requirements:</Text>

              {renderRequirement(
                `Reach Level ${feature.requirements.minLevel}`,
                results.levelMet,
                details.level.current,
                details.level.required
              )}

              {renderRequirement(
                `Earn ${feature.requirements.minXP} XP`,
                results.xpMet,
                details.xp.current,
                details.xp.required
              )}

              {feature.requirements.tutorialsCompleted.length > 0 && renderRequirement(
                `Complete ${feature.requirements.tutorialsCompleted.length} Tutorial${feature.requirements.tutorialsCompleted.length > 1 ? 's' : ''}`,
                results.tutorialsMet,
                details.tutorials.completed,
                details.tutorials.required
              )}

              {feature.requirements.missionsCompleted.length > 0 && renderRequirement(
                `Complete ${feature.requirements.missionsCompleted.length} Mission${feature.requirements.missionsCompleted.length > 1 ? 's' : ''}`,
                results.missionsMet,
                details.missions.completed,
                details.missions.required
              )}

              {feature.requirements.quizzesPassed.length > 0 && renderRequirement(
                `Pass ${feature.requirements.quizzesPassed.length} Quiz${feature.requirements.quizzesPassed.length > 1 ? 'zes' : ''}`,
                results.quizzesMet,
                details.quizzes.passed,
                details.quizzes.required
              )}

              {feature.requirements.daysActive > 0 && renderRequirement(
                `Active for ${feature.requirements.daysActive} days`,
                results.daysActiveMet,
                details.daysActive.current,
                details.daysActive.required
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              {canUnlock ? (
                <TouchableOpacity
                  style={styles.unlockButton}
                  onPress={onUnlock}
                >
                  <Text style={styles.unlockButtonText}>🎉 Unlock Now</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.lockedMessage}>
                  <Text style={styles.lockedMessageText}>
                    Complete the requirements above to unlock this feature
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 25,
    width: width * 0.9,
    maxHeight: '80%',
    borderWidth: 3,
    borderColor: COLORS.accentYellow,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockIcon: {
    fontSize: 64,
  },
  featureName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
    marginBottom: 10,
  },
  featureDescription: {
    fontSize: 16,
    color: COLORS.earthBrown,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  benefitBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  progressBar: {
    height: 12,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primaryGreen,
  },
  requirementsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 15,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.accentYellow,
    padding: 12,
    borderRadius: 10,
  },
  requirementIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  metIcon: {
    color: COLORS.primaryGreen,
  },
  unmetIcon: {
    color: COLORS.earthBrown,
  },
  requirementContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    flex: 1,
  },
  requirementTextMet: {
    textDecorationLine: 'line-through',
    color: COLORS.earthBrown,
  },
  requirementProgress: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  actions: {
    gap: 10,
  },
  unlockButton: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  lockedMessage: {
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.earthBrown,
  },
  lockedMessageText: {
    fontSize: 14,
    color: COLORS.earthBrown,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: COLORS.earthBrown,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
