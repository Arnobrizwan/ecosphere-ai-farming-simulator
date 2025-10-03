import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { auth } from '../../services/firebase.config';
import { recommendationService } from '../../services/ai/recommendation.service';

const PriorityBadge = ({ priority }) => {
  const stylesByPriority = {
    CRITICAL: { backgroundColor: '#B71C1C' },
    HIGH: { backgroundColor: '#D84315' },
    MEDIUM: { backgroundColor: '#F9A825' },
    LOW: { backgroundColor: '#00695C' },
  };
  const label = priority || 'MEDIUM';

  return (
    <View style={[styles.priorityBadge, stylesByPriority[label] || stylesByPriority.MEDIUM]}>
      <Text style={styles.priorityBadgeText}>{label}</Text>
    </View>
  );
};

const RecommendationCard = ({ item, onDecision, disabled }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <PriorityBadge priority={item.priority} />
    </View>

    <Text style={styles.cardCategory}>{item.category?.toUpperCase()}</Text>
    <Text style={styles.cardRationale}>{item.rationale}</Text>

    {item.impact ? <Text style={styles.cardImpact}>Impact: {item.impact}</Text> : null}

    {Array.isArray(item.nextSteps) && item.nextSteps.length > 0 && (
      <View style={styles.stepsContainer}>
        <Text style={styles.stepsHeading}>Next Steps</Text>
        {item.nextSteps.map((step, index) => (
          <Text key={index} style={styles.stepItem}>• {step}</Text>
        ))}
      </View>
    )}

    <View style={styles.cardFooter}>
      <TouchableOpacity
        style={[styles.primaryButton, disabled && styles.disabledButton]}
        onPress={() => onDecision(item, 'accepted')}
        disabled={disabled}
      >
        <Text style={styles.primaryButtonText}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, disabled && styles.disabledButton]}
        onPress={() => onDecision(item, 'deferred')}
        disabled={disabled}
      >
        <Text style={styles.secondaryButtonText}>Decide Later</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const RecommendationsScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [context, setContext] = useState(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState(null);
  const [decisions, setDecisions] = useState({});

  const user = auth.currentUser;
  const farmId = route?.params?.farmId;

  const loadData = useCallback(async () => {
    if (!user?.uid) {
      setError('Sign in required to view recommendations.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await recommendationService.getRecommendations(user.uid, farmId);
      setRecommendations(response.recommendations || []);
      setContext(response.context || null);
      setSource(response.source);
    } catch (err) {
      console.error('Failed to load recommendations', err);
      setError(err.message || 'Unable to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, farmId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecision = async (item, decision) => {
    if (!user?.uid) return;
    try {
      setDecisions((prev) => ({ ...prev, [item.id]: 'pending' }));
      await recommendationService.logRecommendationDecision(user.uid, item, decision);
      setDecisions((prev) => ({ ...prev, [item.id]: decision }));
      Alert.alert('Recorded', `Recommendation ${decision === 'accepted' ? 'accepted' : 'saved for later'}.`);
    } catch (err) {
      console.error('Failed to log decision', err);
      Alert.alert('Error', err.message || 'Unable to log your decision.');
      setDecisions((prev) => ({ ...prev, [item.id]: undefined }));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderContext = () => {
    if (!context) return null;
    const { profile, tasks, telemetry } = context;

    return (
      <View style={styles.contextCard}>
        <Text style={styles.contextTitle}>Context Snapshot</Text>
        <Text style={styles.contextLine}>Role: {profile.userRole} • Experience: {profile.experienceLevel}</Text>
        <Text style={styles.contextLine}>Location: {profile.location}</Text>
        <Text style={styles.contextLine}>Crops: {profile.crops.join(', ')}</Text>
        <Text style={styles.contextLine}>Farm Size: {profile.farmSize} acres</Text>
        <Text style={styles.contextHeading}>Recent Smart Tasks</Text>
        <Text style={styles.contextLine}>{tasks?.length ? tasks.map((t) => `${t.name} (${t.status || 'scheduled'})`).join('\n') : 'No tasks recorded.'}</Text>
        <Text style={styles.contextHeading}>IoT Snapshot</Text>
        <Text style={styles.contextLine}>
          {telemetry?.length
            ? telemetry.map((d) => `${d.name}: ${d.status}${d.alerts ? ` • alerts ${d.alerts}` : ''}`).join('\n')
            : 'No devices reporting.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>AI Recommendations</Text>
          {source ? (
            <Text style={styles.headerSubtitle}>
              Source: {source === 'gemini' ? 'Gemini (live)' : 'Fallback sample'}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          <Text style={styles.mutedText}>Generating recommendations…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {renderContext()}

          {recommendations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🪴</Text>
              <Text style={styles.emptyTitle}>No recommendations right now</Text>
              <Text style={styles.emptySubtitle}>Check back after logging new data or running smart tasks.</Text>
            </View>
          ) : (
            recommendations.map((item) => (
              <RecommendationCard
                key={item.id}
                item={item}
                disabled={!!decisions[item.id] && decisions[item.id] !== 'pending'}
                onDecision={handleDecision}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F4',
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
    color: '#78909C',
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
  contextHeading: {
    marginTop: 12,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  contextLine: {
    color: '#455A64',
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.deepBlack,
    flex: 1,
    paddingRight: 12,
  },
  cardCategory: {
    color: '#00796B',
    fontWeight: '600',
    marginBottom: 8,
  },
  cardRationale: {
    color: '#37474F',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardImpact: {
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 8,
  },
  stepsContainer: {
    marginBottom: 14,
    backgroundColor: '#F0F8F5',
    borderRadius: 12,
    padding: 12,
  },
  stepsHeading: {
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 6,
  },
  stepItem: {
    color: '#2F3A3D',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primaryGreen,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primaryGreen,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priorityBadgeText: {
    color: COLORS.pureWhite,
    fontWeight: '700',
    fontSize: 12,
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
});

export default RecommendationsScreen;
