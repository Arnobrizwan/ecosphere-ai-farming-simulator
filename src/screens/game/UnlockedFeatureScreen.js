import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

export default function UnlockedFeatureScreen({
  visible,
  feature,
  bonusXP = 50,
  onExplore,
  onClose
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate unlock
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        ]),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  if (!feature) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti Effect */}
        <Animated.View
          style={[
            styles.confettiContainer,
            {
              opacity: confettiAnim,
              transform: [{
                translateY: confettiAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 100]
                })
              }]
            }
          ]}
        >
          {[...Array(20)].map((_, i) => (
            <Text key={i} style={[styles.confetti, { left: `${(i * 5) % 100}%` }]}>
              {['🎉', '✨', '🌟', '⭐'][i % 4]}
            </Text>
          ))}
        </Animated.View>

        {/* Main Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Unlock Animation */}
          <View style={styles.iconContainer}>
            <Text style={styles.unlockIcon}>🔓</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Feature Unlocked!</Text>

          {/* Feature Icon and Name */}
          <View style={styles.featureContainer}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <Text style={styles.featureName}>{feature.displayName}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{feature.description}</Text>

          {/* Benefit */}
          <View style={styles.benefitBox}>
            <Text style={styles.benefitText}>{feature.benefitText}</Text>
          </View>

          {/* Bonus XP Badge */}
          <View style={styles.bonusXPBadge}>
            <Text style={styles.bonusXPText}>+{bonusXP} XP Bonus!</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={onExplore}
            >
              <Text style={styles.exploreButtonText}>🚀 Explore Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={onClose}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  confetti: {
    fontSize: 24,
    position: 'absolute',
  },
  content: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 30,
    width: width * 0.9,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.primaryGreen,
  },
  iconContainer: {
    marginBottom: 20,
  },
  unlockIcon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  featureName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.earthBrown,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  benefitBox: {
    backgroundColor: COLORS.accentYellow,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
  },
  bonusXPBadge: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 25,
  },
  bonusXPText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  exploreButton: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  exploreButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  laterButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    color: COLORS.earthBrown,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
