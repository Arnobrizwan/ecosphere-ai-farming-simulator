import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { auth } from '../../services/firebase.config';
import { recommendationService } from '../../services/ai/recommendation.service';

const AdviceCard = ({ advice }) => (
  <View style={styles.adviceCard}>
    <Text style={styles.adviceHeadline}>{advice.headline}</Text>
    <Text style={styles.adviceMessage}>{advice.message}</Text>

    {Array.isArray(advice.contextHighlights) && advice.contextHighlights.length > 0 && (
      <View style={styles.adviceSection}>
        <Text style={styles.sectionTitle}>Context Highlights</Text>
        {advice.contextHighlights.map((line, index) => (
          <Text key={index} style={styles.sectionItem}>• {line}</Text>
        ))}
      </View>
    )}

    {Array.isArray(advice.suggestions) && advice.suggestions.length > 0 && (
      <View style={styles.adviceSection}>
        <Text style={styles.sectionTitle}>Suggested Next Actions</Text>
        {advice.suggestions.map((line, index) => (
          <Text key={index} style={styles.sectionItem}>• {line}</Text>
        ))}
      </View>
    )}
  </View>
);

const PersonalAdviceScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState(null);
  const [context, setContext] = useState(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState(null);
  const [adviceLogId, setAdviceLogId] = useState(null);

  const user = auth.currentUser;
  const farmId = route?.params?.farmId;

  const loadAdvice = useCallback(async () => {
    if (!user?.uid) {
      setError('Sign in required to get personalized advice.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await recommendationService.getAdvice(user.uid, farmId);
      setAdvice(response.advice);
      setContext(response.context || null);
      setSource(response.source);
      const logId = await recommendationService.logAdvice(user.uid, response.advice);
      setAdviceLogId(logId);
    } catch (err) {
      console.error('Failed to load advice', err);
      setError(err.message || 'Unable to load advice.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, farmId]);

  useEffect(() => {
    loadAdvice();
  }, [loadAdvice]);

  const handleFeedback = async (rating) => {
    if (!user?.uid || !adviceLogId) return;
    try {
      await recommendationService.submitAdviceFeedback(user.uid, adviceLogId, { rating });
      Alert.alert('Thanks!', 'Your feedback helps improve future advice.');
    } catch (err) {
      console.error('Failed to submit feedback', err);
      Alert.alert('Error', err.message || 'Unable to submit feedback.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Personalized Advice</Text>
          {source ? (
            <Text style={styles.headerSubtitle}>
              Source: {source === 'gemini' ? 'Gemini (live)' : 'Fallback sample'}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.retryButton} onPress={loadAdvice}>
          <Text style={styles.retryButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          <Text style={styles.mutedText}>Gathering your latest farm insights…</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollArea}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {context && (
            <View style={styles.contextCard}>
              <Text style={styles.contextTitle}>Profile Snapshot</Text>
              <Text style={styles.contextLine}>Role: {context.profile.userRole}</Text>
              <Text style={styles.contextLine}>Experience: {context.profile.experienceLevel}</Text>
              <Text style={styles.contextLine}>Location: {context.profile.location}</Text>
              <Text style={styles.contextLine}>Crops: {context.profile.crops.join(', ')}</Text>
              <Text style={styles.contextLine}>Current Activity: {context.profile.currentActivity}</Text>
            </View>
          )}

          {advice ? (
            <AdviceCard advice={advice} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🤖</Text>
              <Text style={styles.emptyTitle}>No advice available</Text>
              <Text style={styles.emptySubtitle}>Try refreshing after updating your farm data.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {!loading && advice ? (
        <View style={styles.feedbackBar}>
          <Text style={styles.feedbackPrompt}>Was this advice helpful?</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity style={styles.feedbackButton} onPress={() => handleFeedback('positive')}>
              <Text style={styles.feedbackIcon}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.feedbackButton} onPress={() => handleFeedback('negative')}>
              <Text style={styles.feedbackIcon}>👎</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.primaryGreen,
  },
  backButton: {
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 22,
  },
  headerTitle: {
    color: COLORS.pureWhite,
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.pureWhite,
    opacity: 0.8,
    marginTop: 2,
  },
  retryButton: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  scrollArea: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mutedText: {
    color: '#90A4AE',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 16,
  },
  contextCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: COLORS.deepBlack,
  },
  contextLine: {
    color: '#455A64',
    lineHeight: 20,
  },
  adviceCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
  },
  adviceHeadline: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.deepBlack,
    marginBottom: 8,
  },
  adviceMessage: {
    color: '#37474F',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
  },
  adviceSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionItem: {
    color: '#2F3A3D',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  emptySubtitle: {
    color: '#78909C',
    textAlign: 'center',
  },
  feedbackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: COLORS.pureWhite,
  },
  feedbackPrompt: {
    color: '#37474F',
    fontWeight: '600',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackIcon: {
    fontSize: 22,
  },
});

export default PersonalAdviceScreen;
