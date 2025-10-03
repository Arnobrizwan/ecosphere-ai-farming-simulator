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
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

const RARITY_COLORS = {
  common: COLORS.earthBrown,
  rare: COLORS.skyBlue,
  epic: '#FF8C00',
  legendary: '#FFD700'
};

export default function AchievementPopup({ visible, achievement, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Animate popup
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
            duration: 300,
            useNativeDriver: true,
          })
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            })
          ])
        )
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      sparkleAnim.setValue(0);
    }
  }, [visible, achievement]);

  if (!achievement) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Sparkle Effects */}
        <Animated.View
          style={[
            styles.sparkleContainer,
            { opacity: sparkleAnim }
          ]}
        >
          {[...Array(12)].map((_, i) => (
            <Text
              key={i}
              style={[
                styles.sparkle,
                {
                  top: `${20 + (i * 7)}%`,
                  left: `${10 + (i * 7)}%`,
                }
              ]}
            >
              ✨
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
          {/* Header */}
          <Text style={styles.header}>🎉 Achievement Unlocked! 🎉</Text>

          {/* Badge Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{achievement.icon}</Text>
          </View>

          {/* Achievement Name */}
          <Text style={styles.name}>{achievement.name}</Text>

          {/* Description */}
          <Text style={styles.description}>{achievement.description}</Text>

          {/* Rarity Badge */}
          <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[achievement.rarity] }]}>
            <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
          </View>

          {/* Rewards */}
          <View style={styles.rewardsContainer}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardIcon}>⚡</Text>
              <Text style={styles.rewardText}>+{achievement.rewards.xp} XP</Text>
            </View>
            {achievement.rewards.coins > 0 && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardIcon}>💰</Text>
                <Text style={styles.rewardText}>+{achievement.rewards.coins} Coins</Text>
              </View>
            )}
            {achievement.rewards.title && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardIcon}>🏷️</Text>
                <Text style={styles.rewardText}>{achievement.rewards.title}</Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 20,
  },
  content: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 30,
    width: width * 0.85,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 20,
    textAlign: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accentYellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  icon: {
    fontSize: 56,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: COLORS.earthBrown,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  rarityBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  rarityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  rewardsContainer: {
    width: '100%',
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    gap: 10,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  button: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
