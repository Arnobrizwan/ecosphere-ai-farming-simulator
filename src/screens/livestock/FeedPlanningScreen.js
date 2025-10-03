/**
 * UC58 - Feed Planning Screen
 * Weather-adjusted feed requirements using NASA POWER data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { generateFeedPlan } from '../../services/satellite/livestockDataAggregator';
import { db } from '../../services/firebase.config';

export default function FeedPlanningScreen({ route, navigation }) {
  const { farmId } = route.params;
  const [loading, setLoading] = useState(false);
  const [feedPlan, setFeedPlan] = useState(null);
  const [periodDays, setPeriodDays] = useState('30');
  const [error, setError] = useState(null);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const days = parseInt(periodDays) || 30;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const plan = await generateFeedPlan(farmId, startDate, endDate);
      setFeedPlan(plan);
    } catch (err) {
      console.error('Feed plan generation failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Feed Planning</Text>
        <Text style={styles.subtitle}>Weather-Adjusted Requirements</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Planning Period</Text>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Number of days:</Text>
            <TextInput
              style={styles.input}
              value={periodDays}
              onChangeText={setPeriodDays}
              keyboardType="number-pad"
              placeholder="30"
            />
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generatePlan}
              disabled={loading}
            >
              <Text style={styles.generateButtonText}>
                {loading ? 'Generating...' : 'Generate Feed Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryGreen} />
            <Text style={styles.loadingText}>Fetching NASA weather data...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {feedPlan && (
          <>
            {/* Livestock Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🐄 Livestock Summary</Text>
              <View style={styles.livestockCard}>
                <View style={styles.livestockRow}>
                  <Text style={styles.livestockLabel}>Cattle:</Text>
                  <Text style={styles.livestockValue}>{feedPlan.livestock.cattle}</Text>
                </View>
                <View style={styles.livestockRow}>
                  <Text style={styles.livestockLabel}>Sheep:</Text>
                  <Text style={styles.livestockValue}>{feedPlan.livestock.sheep}</Text>
                </View>
                <View style={styles.livestockRow}>
                  <Text style={styles.livestockLabel}>Goats:</Text>
                  <Text style={styles.livestockValue}>{feedPlan.livestock.goats}</Text>
                </View>
                <View style={[styles.livestockRow, styles.totalRow]}>
                  <Text style={styles.livestockLabelBold}>Total Animals:</Text>
                  <Text style={styles.livestockValueBold}>{feedPlan.livestock.total}</Text>
                </View>
              </View>
            </View>

            {/* Feed Requirements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌾 Feed Requirements</Text>
              <View style={styles.feedCard}>
                <View style={styles.feedMetric}>
                  <Text style={styles.feedLabel}>Baseline Daily Feed</Text>
                  <Text style={styles.feedValue}>{feedPlan.feed.baselineDailyKg} kg/day</Text>
                </View>
                <View style={styles.feedMetric}>
                  <Text style={styles.feedLabel}>Weather-Adjusted Daily Feed</Text>
                  <Text style={[styles.feedValue, styles.highlight]}>
                    {feedPlan.feed.adjustedDailyKg} kg/day
                  </Text>
                  <Text style={styles.adjustmentText}>
                    ({(feedPlan.feed.adjustmentFactor * 100 - 100).toFixed(0) > 0 ? '+' : ''}
                    {(feedPlan.feed.adjustmentFactor * 100 - 100).toFixed(0)}%)
                  </Text>
                </View>
                <View style={styles.feedMetric}>
                  <Text style={styles.feedLabel}>Total for {feedPlan.period.days} Days</Text>
                  <Text style={styles.feedValueLarge}>{feedPlan.feed.totalPeriodKg} kg</Text>
                </View>
              </View>
              <View style={styles.reasonCard}>
                <Text style={styles.reasonText}>💡 {feedPlan.feed.adjustmentReason}</Text>
              </View>
            </View>

            {/* Weather Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌦️ Weather Conditions</Text>
              <View style={styles.weatherCard}>
                <View style={styles.weatherRow}>
                  <Text style={styles.weatherLabel}>Avg Temperature:</Text>
                  <Text style={styles.weatherValue}>
                    {feedPlan.weather.avgTemp?.toFixed(1) || 'N/A'}°C
                  </Text>
                </View>
                <View style={styles.weatherRow}>
                  <Text style={styles.weatherLabel}>Total Rainfall:</Text>
                  <Text style={styles.weatherValue}>
                    {feedPlan.weather.totalRainfall?.toFixed(1) || 'N/A'} mm
                  </Text>
                </View>
                <View style={styles.weatherRow}>
                  <Text style={styles.weatherLabel}>Avg Humidity:</Text>
                  <Text style={styles.weatherValue}>
                    {feedPlan.weather.avgHumidity?.toFixed(0) || 'N/A'}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Cost Estimate */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 Cost Estimate</Text>
              <View style={styles.costCard}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Daily Cost:</Text>
                  <Text style={styles.costValue}>
                    ${feedPlan.cost.dailyCost.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.costRow, styles.totalCostRow]}>
                  <Text style={styles.costLabelBold}>Total Cost ({feedPlan.period.days} days):</Text>
                  <Text style={styles.costValueBold}>
                    ${feedPlan.cost.totalCost.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // TODO: Implement save/export functionality
                  alert('Feed plan saved!');
                }}
              >
                <Text style={styles.actionButtonText}>💾 Save Feed Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  // TODO: Implement export to CSV
                  alert('Export functionality coming soon');
                }}
              >
                <Text style={styles.actionButtonTextSecondary}>📊 Export to CSV</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: COLORS.pureWhite,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0F2F1',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 12,
  },
  inputCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  generateButton: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  errorCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  livestockCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
  },
  livestockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 5,
  },
  livestockLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  livestockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  livestockLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  livestockValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  feedCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  feedMetric: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feedLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  feedValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  feedValueLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  highlight: {
    color: COLORS.primaryGreen,
  },
  adjustmentText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
  },
  reasonCard: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  weatherCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  weatherLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  costCard: {
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalCostRow: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#FDE047',
  },
  costLabel: {
    fontSize: 14,
    color: '#78350F',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  costLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#78350F',
  },
  costValueBold: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400E',
  },
  actionButton: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.pureWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  actionButtonTextSecondary: {
    color: COLORS.primaryGreen,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
