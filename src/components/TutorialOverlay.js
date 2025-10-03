import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal
} from 'react-native';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

export default function TutorialOverlay({
  visible,
  step,
  onNext,
  onSkip,
  targetPosition = { x: width / 2, y: height / 2, width: 100, height: 50 }
}) {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      // Pulse animation for "tap here" indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  if (!visible || !step) return null;

  const speechBubblePosition = {
    top: targetPosition.y + targetPosition.height + 20,
    left: Math.max(20, Math.min(width - 320, targetPosition.x - 150))
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        {/* Dimmed background */}
        <View style={styles.dimBackground} />

        {/* Highlighted area (cutout effect) */}
        <View
          style={[
            styles.highlight,
            {
              top: targetPosition.y - 10,
              left: targetPosition.x - 10,
              width: targetPosition.width + 20,
              height: targetPosition.height + 20,
            }
          ]}
        >
          <View style={styles.highlightBorder} />
        </View>

        {/* Pulse animation on target */}
        <Animated.View
          style={[
            styles.pulseIndicator,
            {
              top: targetPosition.y + targetPosition.height / 2 - 30,
              left: targetPosition.x + targetPosition.width / 2 - 30,
              transform: [{ scale: pulseAnim }],
            }
          ]}
        >
          <Text style={styles.tapIcon}>👆</Text>
        </Animated.View>

        {/* Speech bubble */}
        <View style={[styles.speechBubble, speechBubblePosition]}>
          <View style={styles.speechBubbleArrow} />
          <Text style={styles.speechBubbleTitle}>{step.title}</Text>
          <Text style={styles.speechBubbleText}>{step.description}</Text>
          
          {step.hint && (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>💡 {step.hint}</Text>
            </View>
          )}

          <View style={styles.speechBubbleActions}>
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            {step.action === 'observe' && (
              <TouchableOpacity style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Next →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {Array.from({ length: step.totalSteps || 5 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === (step.stepNumber - 1) && styles.dotActive
              ]}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  highlightBorder: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.accentYellow,
  },
  pulseIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapIcon: {
    fontSize: 40,
  },
  speechBubble: {
    position: 'absolute',
    width: 300,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 15,
    padding: 15,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  speechBubbleArrow: {
    position: 'absolute',
    top: -10,
    left: 140,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.pureWhite,
  },
  speechBubbleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 8,
  },
  speechBubbleText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    lineHeight: 20,
    marginBottom: 10,
  },
  hintBox: {
    backgroundColor: COLORS.accentYellow,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.earthBrown,
  },
  speechBubbleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  skipButton: {
    flex: 1,
    backgroundColor: COLORS.earthBrown,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressDots: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.pureWhite,
    opacity: 0.3,
  },
  dotActive: {
    opacity: 1,
    backgroundColor: COLORS.primaryGreen,
    width: 24,
  },
});
