import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * Game-style dialogue box for AI Tutor character
 * Appears at bottom of screen like RPG dialogue
 */
const TutorDialogueBox = ({ 
  visible, 
  message, 
  tutorName = 'AgriBot',
  options = [],
  onOptionSelect,
  onClose,
  autoAdvance = false,
  autoAdvanceDelay = 5000
}) => {
  const [slideAnim] = useState(new Animated.Value(300));
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();

      // Typewriter effect
      if (message) {
        setIsTyping(true);
        setDisplayedText('');
        let index = 0;
        const interval = setInterval(() => {
          if (index < message.length) {
            setDisplayedText(message.substring(0, index + 1));
            index++;
          } else {
            setIsTyping(false);
            clearInterval(interval);
          }
        }, 30);

        return () => clearInterval(interval);
      }
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible, message]);

  useEffect(() => {
    if (visible && autoAdvance && !isTyping && displayedText === message) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoAdvanceDelay);
      return () => clearTimeout(timer);
    }
  }, [visible, autoAdvance, isTyping, displayedText, message]);

  if (!visible && slideAnim._value === 300) return null;

  const handleOptionPress = (option, index) => {
    if (onOptionSelect) {
      onOptionSelect(option, index);
    }
  };

  const handleSkipTyping = () => {
    if (isTyping) {
      setDisplayedText(message);
      setIsTyping(false);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Dialogue Box */}
      <View style={styles.dialogueBox}>
        {/* Header with tutor name */}
        <View style={styles.header}>
          <Text style={styles.tutorIcon}>🤖</Text>
          <Text style={styles.tutorName}>{tutorName}</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Message Content */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={handleSkipTyping}
          style={styles.messageContainer}
        >
          <Text style={styles.messageText}>{displayedText}</Text>
          {isTyping && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotDelay1]} />
              <View style={[styles.typingDot, styles.typingDotDelay2]} />
            </View>
          )}
        </TouchableOpacity>

        {/* Action Buttons */}
        {!isTyping && options.length > 0 && (
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  index === 0 && styles.optionButtonPrimary
                ]}
                onPress={() => handleOptionPress(option, index)}
              >
                <Text style={[
                  styles.optionText,
                  index === 0 && styles.optionTextPrimary
                ]}>
                  {option.label || option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Continue Indicator */}
        {!isTyping && options.length === 0 && (
          <View style={styles.continueIndicator}>
            <Text style={styles.continueText}>Tap to continue ▼</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 1000,
  },
  dialogueBox: {
    backgroundColor: 'rgba(35, 39, 47, 0.95)',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryGreen,
  },
  tutorIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  tutorName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.pureWhite,
    fontWeight: 'bold',
  },
  messageContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 80,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.pureWhite,
  },
  typingIndicator: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryGreen,
    opacity: 0.5,
  },
  typingDotDelay1: {
    opacity: 0.7,
  },
  typingDotDelay2: {
    opacity: 0.9,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  optionButtonPrimary: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.pureWhite,
  },
  optionTextPrimary: {
    color: COLORS.pureWhite,
  },
  continueIndicator: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  continueText: {
    fontSize: 12,
    color: COLORS.accentYellow,
    fontStyle: 'italic',
  },
});

export default TutorDialogueBox;
