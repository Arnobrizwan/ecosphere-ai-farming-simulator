/**
 * UC56 - Pasture Health Monitoring Screen
 * Displays NDVI, biomass, drought status, and grazing recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { getCompletePastureAssessment } from '../../services/satellite/livestockDataAggregator';
import { authService } from '../../services/auth.service';

export default function PastureHealthScreen({ route, navigation }) {
  const { pastureId } = route.params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);

  const runAssessment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const result = await getCompletePastureAssessment(pastureId, startDate, endDate);
      setAssessment(result);
    } catch (err) {
      console.error('Assessment failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    runAssessment();
  }, [pastureId]);

  const onRefresh = () => {
    setRefreshing(true);
    runAssessment();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pasture Health Monitor</Text>
        <Text style={styles.subtitle}>NASA Satellite Analysis</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={runAssessment}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && !assessment && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryGreen} />
            <Text style={styles.loadingText}>Analyzing pasture with NASA data...</Text>
            <Text style={styles.loadingSubtext}>This may take 2-10 minutes</Text>
          </View>
        )}

        {assessment && (
          <>
            {/* Overall Score */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Overall Pasture Health</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(assessment.overallScore) }]}>
                {assessment.overallScore}/100
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assessment.health.status) }]}>
                <Text style={styles.statusText}>{assessment.health.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Key Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>NDVI</Text>
                  <Text style={styles.metricValue}>{assessment.ndvi.current.toFixed(3)}</Text>
                  <Text style={styles.metricSubtext}>
                    {assessment.ndvi.trend > 0 ? '↗' : '↘'} {Math.abs(assessment.ndvi.trend).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Biomass</Text>
                  <Text style={styles.metricValue}>{assessment.ndvi.biomassKgPerHa}</Text>
                  <Text style={styles.metricSubtext}>kg/ha</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Soil Moisture</Text>
                  <Text style={styles.metricValue}>{(assessment.drought.avgSoilMoisture * 100).toFixed(1)}%</Text>
                  <Text style={styles.metricSubtext}>{assessment.drought.level}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Temperature</Text>
                  <Text style={styles.metricValue}>{assessment.weather.avgTemp.toFixed(1)}°C</Text>
                  <Text style={styles.metricSubtext}>avg</Text>
                </View>
              </View>
            </View>

            {/* Alerts */}
            {assessment.health.alerts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚠️ Alerts</Text>
                {assessment.health.alerts.map((alert, index) => (
                  <View key={index} style={styles.alertCard}>
                    <Text style={styles.alertText}>{alert}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Grazing Management */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🐄 Grazing Management</Text>
              <View style={styles.grazingCard}>
                <View style={styles.grazingRow}>
                  <Text style={styles.grazingLabel}>Available Feed:</Text>
                  <Text style={styles.grazingValue}>{assessment.grazing.availableFeed} kg</Text>
                </View>
                <View style={styles.grazingRow}>
                  <Text style={styles.grazingLabel}>Usable Feed:</Text>
                  <Text style={styles.grazingValue}>{assessment.grazing.usableFeed} kg</Text>
                </View>
                <View style={styles.grazingRow}>
                  <Text style={styles.grazingLabel}>Grazing Days Left:</Text>
                  <Text style={[styles.grazingValue, styles.highlight]}>
                    {assessment.grazing.grazingDays} days
                  </Text>
                </View>
                <View style={styles.grazingRow}>
                  <Text style={styles.grazingLabel}>Recommended Rest:</Text>
                  <Text style={styles.grazingValue}>{assessment.grazing.recommendedRestDays} days</Text>
                </View>
                <View style={styles.grazingRow}>
                  <Text style={styles.grazingLabel}>Next Rotation:</Text>
                  <Text style={styles.grazingValue}>
                    {new Date(assessment.grazing.nextRotationDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.grazingRow}>
                  <Text style={styles.grazingLabel}>Stocking Rate:</Text>
                  <Text style={styles.grazingValue}>{assessment.grazing.stockingRate} AU/ha</Text>
                </View>
              </View>
              <View style={styles.recommendationBadge}>
                <Text style={styles.recommendationText}>{assessment.grazing.recommendation}</Text>
              </View>
            </View>

            {/* Drought Status */}
            {assessment.drought.level !== 'none' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💧 Drought Analysis</Text>
                <View style={styles.droughtCard}>
                  <Text style={styles.droughtLevel}>
                    {assessment.drought.level.toUpperCase()} Drought
                  </Text>
                  <Text style={styles.droughtText}>
                    Severity Level: {assessment.drought.severity}/5
                  </Text>
                  {assessment.irrigation.needsIrrigation && (
                    <View style={styles.irrigationAlert}>
                      <Text style={styles.irrigationText}>
                        💦 Irrigation Recommended: {assessment.irrigation.waterDepthMm}mm
                      </Text>
                      <Text style={styles.irrigationSubtext}>
                        Total water needed: {Math.round(assessment.irrigation.waterNeeded / 1000)} m³
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Recommendations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Recommendations</Text>
              {assessment.health.recommendations.slice(0, 5).map((rec, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <Text style={styles.recommendationItem}>• {rec}</Text>
                </View>
              ))}
            </View>

            {/* Data Sources */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛰️ Data Sources</Text>
              <View style={styles.sourcesCard}>
                <Text style={styles.sourceText}>NDVI: {assessment.dataSources.ndvi}</Text>
                <Text style={styles.sourceText}>Soil Moisture: {assessment.dataSources.soilMoisture}</Text>
                <Text style={styles.sourceText}>Weather: {assessment.dataSources.weather}</Text>
                <Text style={styles.sourceSubtext}>
                  Last updated: {new Date(assessment.assessmentDate).toLocaleString()}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {!loading && !assessment && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No assessment data available</Text>
          <TouchableOpacity style={styles.runButton} onPress={runAssessment}>
            <Text style={styles.runButtonText}>Run Assessment</Text>
          </TouchableOpacity>
        </View>
      )}
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.earthBrown,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: '#9CA3AF',
  },
  errorCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
  },
  scoreCard: {
    margin: 15,
    padding: 20,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    margin: 15,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 3,
  },
  metricSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  alertCard: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertText: {
    color: '#92400E',
    fontSize: 14,
  },
  grazingCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  grazingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  grazingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  grazingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  highlight: {
    color: COLORS.primaryGreen,
    fontSize: 16,
  },
  recommendationBadge: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  recommendationText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
  },
  droughtCard: {
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 12,
  },
  droughtLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
  },
  droughtText: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 5,
  },
  irrigationAlert: {
    backgroundColor: '#DBEAFE',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  irrigationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 3,
  },
  irrigationSubtext: {
    fontSize: 12,
    color: '#1E3A8A',
  },
  recommendationCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 14,
    color: COLORS.earthBrown,
    lineHeight: 20,
  },
  sourcesCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
  },
  sourceText: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 5,
  },
  sourceSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  runButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  runButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
