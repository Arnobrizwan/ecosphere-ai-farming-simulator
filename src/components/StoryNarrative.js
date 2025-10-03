import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

/**
 * StoryNarrative Component
 * Displays story segments with click-through progression
 */
export default function StoryNarrative({ visible, onClose, storySegments, characterName, characterAvatar }) {
  const [currentSegment, setCurrentSegment] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  const handleNext = () => {
    if (currentSegment < storySegments.length - 1) {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentSegment(currentSegment + 1);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Story complete
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!storySegments || storySegments.length === 0) {
    return null;
  }

  const progress = ((currentSegment + 1) / storySegments.length) * 100;
  const isLastSegment = currentSegment === storySegments.length - 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.narrativeContainer}>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>

          {/* Character Info */}
          <View style={styles.characterHeader}>
            <Text style={styles.characterAvatar}>{characterAvatar}</Text>
            <Text style={styles.characterName}>{characterName}</Text>
          </View>

          {/* Story Text */}
          <Animated.View style={[styles.storyContent, { opacity: fadeAnim }]}>
            <Text style={styles.storyText}>{storySegments[currentSegment]}</Text>
          </Animated.View>

          {/* Navigation */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {isLastSegment ? 'Start Mission' : 'Continue →'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Page Indicator */}
          <Text style={styles.pageIndicator}>
            {currentSegment + 1} / {storySegments.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  narrativeContainer: {
    width: width * 0.9,
    maxWidth: 600,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 2,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  characterAvatar: {
    fontSize: 40,
    marginRight: 12,
  },
  characterName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.pureWhite,
  },
  storyContent: {
    minHeight: 180,
    marginBottom: 24,
  },
  storyText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#E5E7EB',
    fontWeight: '400',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.pureWhite,
  },
  pageIndicator: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
});
