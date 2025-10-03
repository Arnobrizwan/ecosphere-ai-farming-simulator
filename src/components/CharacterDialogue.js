import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { COLORS } from '../constants/colors';
import { CHARACTERS } from '../data/characters';

/**
 * Character Dialogue Component
 * Displays character avatar with speech bubble for campaign missions
 */
export default function CharacterDialogue({
  characterId,
  dialogue,
  emotion = 'neutral',
  onContinue,
  showContinueButton = true
}) {
  const character = CHARACTERS[characterId];

  if (!character) {
    return null;
  }

  // Get emotion-specific styling
  const emotionColors = {
    happy: COLORS.accentYellow,
    sad: '#6B7280',
    excited: '#F59E0B',
    angry: '#EF4444',
    surprised: '#8B5CF6',
    neutral: COLORS.primaryGreen,
    nostalgic: '#6366F1',
    proud: COLORS.primaryGreen,
    concerned_hopeful: '#F59E0B',
    teaching: COLORS.skyBlue,
    enthusiastic: '#EC4899',
    professional: COLORS.earthBrown,
    celebrating: COLORS.accentYellow,
    strategic: '#6366F1',
    emotional_proud: '#10B981',
    competitive_friendly: '#F97316',
  };

  const borderColor = emotionColors[emotion] || COLORS.primaryGreen;

  return (
    <View style={styles.container}>
      {/* Character Avatar */}
      <View style={[styles.avatarContainer, { borderColor }]}>
        <Text style={styles.avatar}>{character.avatar}</Text>
      </View>

      {/* Dialogue Box */}
      <View style={[styles.dialogueBox, { borderColor }]}>
        {/* Character Name & Role */}
        <View style={styles.header}>
          <Text style={styles.characterName}>{character.name}</Text>
          <Text style={styles.characterRole}>{character.role}</Text>
        </View>

        {/* Dialogue Text */}
        <Text style={styles.dialogueText}>{dialogue}</Text>

        {/* Continue Button */}
        {showContinueButton && (
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: borderColor }]}
            onPress={onContinue}
          >
            <Text style={styles.continueButtonText}>Continue →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    marginHorizontal: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.pureWhite,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    fontSize: 32,
  },
  dialogueBox: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 8,
    borderWidth: 2,
    padding: 12,
  },
  header: {
    marginBottom: 8,
  },
  characterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  characterRole: {
    fontSize: 12,
    color: COLORS.earthBrown,
    fontStyle: 'italic',
  },
  dialogueText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    lineHeight: 20,
    marginBottom: 10,
  },
  continueButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  continueButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
