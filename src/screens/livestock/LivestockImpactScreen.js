/**
 * UC62 - Livestock Environmental Impact Screen
 * Carbon footprint, land use efficiency, sustainability metrics
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { calculateLivestockImpact } from '../../services/satellite/livestockDataAggregator';

export default function LivestockImpactScreen({ route, navigation }) {
  const { farmId } = route.params;
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      try {
        const result = await calculateLivestockImpact(farmId);
        setImpact(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    calculate();
  }, [farmId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Environmental Impact</Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        ) : impact ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌍 Carbon Footprint</Text>
              <View style={styles.card}>
                <Text style={styles.bigValue}>{(impact.carbonFootprint.totalAnnualKgCO2e / 1000).toFixed(1)} tons CO₂e/year</Text>
                <Text style={styles.subtext}>Methane: {(impact.carbonFootprint.methaneKgCO2e / 1000).toFixed(1)} tons</Text>
                <Text style={styles.subtext}>N₂O: {(impact.carbonFootprint.nitrousOxideKgCO2e / 1000).toFixed(1)} tons</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌾 Land Use</Text>
              <View style={styles.card}>
                <Text style={styles.label}>Pasture Area: {impact.landUse.totalPastureHa} ha</Text>
                <Text style={styles.label}>Stocking Rate: {impact.landUse.stockingRate.toFixed(2)}</Text>
                <Text style={[styles.badge, { backgroundColor: impact.landUse.sustainabilityScore === 'optimal' ? '#10B981' : '#F59E0B' }]}>
                  {impact.landUse.sustainabilityScore.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Recommendations</Text>
              {impact.recommendations.map((rec, idx) => (
                <Text key={idx} style={styles.recText}>• {rec}</Text>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: COLORS.primaryGreen, padding: 20, paddingTop: 60 },
  backText: { color: COLORS.pureWhite, fontSize: 16, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.pureWhite },
  content: { flex: 1 },
  section: { margin: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryGreen, marginBottom: 10 },
  card: { backgroundColor: COLORS.pureWhite, padding: 15, borderRadius: 12 },
  bigValue: { fontSize: 28, fontWeight: 'bold', color: '#991B1B', marginBottom: 10 },
  subtext: { fontSize: 14, color: '#6B7280', marginBottom: 5 },
  label: { fontSize: 14, color: COLORS.deepBlack, marginBottom: 8 },
  badge: { padding: 8, borderRadius: 6, alignSelf: 'flex-start', marginTop: 10 },
  recText: { fontSize: 14, color: COLORS.earthBrown, marginBottom: 8, backgroundColor: COLORS.pureWhite, padding: 10, borderRadius: 8 },
});
