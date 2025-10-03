import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const RARITY_COLORS = {
  common: COLORS.pureWhite,
  rare: COLORS.skyBlue,
  epic: COLORS.accentYellow,
  legendary: COLORS.primaryGreen
};

const RARITY_LABELS = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY'
};

export default function BadgeCard({ achievement, earned, onPress }) {
  const backgroundColor = RARITY_COLORS[achievement.rarity] || COLORS.pureWhite;
  const isSecret = achievement.secretBadge && !earned;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor },
        earned && styles.cardEarned,
        !earned && styles.cardLocked
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Lock Overlay for locked achievements */}
      {!earned && !isSecret && (
        <View style={styles.lockOverlay}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}

      {/* Secret Badge Display */}
      {isSecret ? (
        <>
          <Text style={styles.secretIcon}>❓</Text>
          <Text style={styles.secretText}>Secret Achievement</Text>
          <Text style={styles.secretHint}>Complete hidden objective</Text>
        </>
      ) : (
        <>
          {/* Badge Icon */}
          <Text style={[styles.icon, !earned && styles.iconLocked]}>
            {achievement.icon}
          </Text>

          {/* Badge Name */}
          <Text style={[styles.name, !earned && styles.nameLocked]}>
            {achievement.name}
          </Text>

          {/* Description */}
          <Text style={[styles.description, !earned && styles.descriptionLocked]}>
            {achievement.description}
          </Text>

          {/* Rarity and Rewards */}
          <View style={styles.footer}>
            <View style={[styles.rarityBadge, { backgroundColor: getRarityBadgeColor(achievement.rarity) }]}>
              <Text style={styles.rarityText}>{RARITY_LABELS[achievement.rarity]}</Text>
            </View>
            <Text style={styles.xpText}>+{achievement.rewards.xp} XP</Text>
          </View>

          {/* Earned Date */}
          {earned && earned.earnedAt && (
            <Text style={styles.earnedDate}>
              Earned: {new Date(earned.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}

          {/* Glow Effect for Earned */}
          {earned && (
            <View style={styles.glowEffect} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

function getRarityBadgeColor(rarity) {
  switch (rarity) {
    case 'common':
      return COLORS.earthBrown;
    case 'rare':
      return COLORS.skyBlue;
    case 'epic':
      return '#FF8C00';
    case 'legendary':
      return '#FFD700';
    default:
      return COLORS.earthBrown;
  }
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 220,
    borderRadius: 12,
    padding: 12,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    position: 'relative',
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardEarned: {
    shadowColor: COLORS.primaryGreen,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardLocked: {
    opacity: 0.7,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lockIcon: {
    fontSize: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  iconLocked: {
    opacity: 0.5,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
    marginBottom: 6,
  },
  nameLocked: {
    color: COLORS.earthBrown,
  },
  description: {
    fontSize: 11,
    color: COLORS.earthBrown,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 14,
  },
  descriptionLocked: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 'auto',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  xpText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  earnedDate: {
    fontSize: 10,
    color: COLORS.earthBrown,
    marginTop: 6,
    textAlign: 'center',
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    opacity: 0.5,
  },
  secretIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  secretText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
    marginBottom: 6,
  },
  secretHint: {
    fontSize: 11,
    color: COLORS.earthBrown,
    textAlign: 'center',
  },
});
