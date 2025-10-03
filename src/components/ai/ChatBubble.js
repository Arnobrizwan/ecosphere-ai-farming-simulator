import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';

const ChatBubble = ({ message, onFeedback }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const isUser = message.role === 'user';
  const hasFeedback = message.feedback && message.feedback.rating;

  const handleFeedback = (rating) => {
    setShowFeedback(false);
    if (onFeedback) {
      onFeedback(message.id, rating);
    }
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.aiHeader}>
            <Text style={styles.aiAvatar}>🤖</Text>
            <Text style={styles.aiLabel}>AI Tutor</Text>
          </View>
        )}
        
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
        
        {message.cached && (
          <Text style={styles.cachedLabel}>📦 Offline Mode</Text>
        )}
        
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        
        {!isUser && !hasFeedback && (
          <View style={styles.feedbackContainer}>
            <TouchableOpacity 
              style={styles.feedbackButton}
              onPress={() => handleFeedback(1)}
            >
              <Text style={styles.feedbackIcon}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.feedbackButton}
              onPress={() => handleFeedback(-1)}
            >
              <Text style={styles.feedbackIcon}>👎</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {hasFeedback && (
          <Text style={styles.feedbackGiven}>
            {message.feedback.rating > 0 ? '✓ Helpful' : '✗ Not helpful'}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: COLORS.skyBlue,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.pureWhite,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiAvatar: {
    fontSize: 20,
    marginRight: 8,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.pureWhite,
  },
  aiText: {
    color: COLORS.deepBlack,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  cachedLabel: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 6,
    fontStyle: 'italic',
  },
  feedbackContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  feedbackButton: {
    padding: 4,
  },
  feedbackIcon: {
    fontSize: 18,
  },
  feedbackGiven: {
    fontSize: 11,
    color: COLORS.primaryGreen,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default ChatBubble;
