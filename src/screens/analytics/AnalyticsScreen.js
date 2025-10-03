/**
 * UC46 - Performance Metrics Analytics Screen
 * Explore metrics across seasons/plots
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { analyzeMetrics, saveAnalyticsView } from '../../services/analytics/performanceMetrics.service';
import { authService } from '../../services/auth.service';

export default function AnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedDimensions, setSelectedDimensions] = useState(['season', 'plot']);
  const currentUser = authService.getCurrentUser();

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeMetrics(currentUser?.uid, {
        dimensions: selectedDimensions,
        metrics: ['yield', 'water', 'cost'],
        timeRange: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });
      if (result.success) {
        setAnalysis(result);
      }
    } catch (error) {
      console.error('Failed to analyze:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity style={styles.analyzeButton} onPress={runAnalysis}>
          <Text style={styles.analyzeText}>Run Analysis</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color={COLORS.primaryGreen} />}

        {analysis && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Comparisons</Text>
              {analysis.comparisons?.map((comp, idx) => (
                <View key={idx} style={styles.comparisonCard}>
                  <Text style={styles.comparisonText}>{comp.message}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Charts</Text>
              {analysis.charts?.map((chart, idx) => (
                <View key={idx} style={styles.chartCard}>
                  <Text style={styles.chartTitle}>{chart.title}</Text>
                  <Text style={styles.chartType}>Type: {chart.type}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.pureWhite },
  header: { backgroundColor: COLORS.primaryGreen, padding: 20, paddingTop: 60 },
  backText: { color: COLORS.pureWhite, fontSize: 16, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.pureWhite },
  content: { flex: 1, padding: 15 },
  analyzeButton: { backgroundColor: COLORS.primaryGreen, padding: 15, borderRadius: 8, marginBottom: 20 },
  analyzeText: { color: COLORS.pureWhite, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryGreen, marginBottom: 10 },
  comparisonCard: { backgroundColor: '#F0FDF4', padding: 15, borderRadius: 12, marginBottom: 10 },
  comparisonText: { fontSize: 14, color: COLORS.earthBrown },
  chartCard: { backgroundColor: '#FEF3C7', padding: 15, borderRadius: 12, marginBottom: 10 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepBlack, marginBottom: 5 },
  chartType: { fontSize: 12, color: COLORS.earthBrown },
});
