/**
 * UC39 - Planting Guide Screen
 * Crop-specific planting windows with NASA data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import PlantingGuideService from '../../services/operations/plantingGuide.service';
import { authService } from '../../services/auth.service';

export default function PlantingGuideScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('rice');
  const currentUser = authService.getCurrentUser();

  const crops = ['rice', 'wheat', 'vegetables', 'jute'];

  const loadGuide = async () => {
    setLoading(true);
    try {
      const service = new PlantingGuideService(currentUser?.uid);
      const result = await service.getPlantingGuide({
        cropType: selectedCrop,
        location: { latitude: 23.81, longitude: 90.41 }, // Dhaka default
      });
      setGuide(result);
    } catch (error) {
      console.error('Failed to load planting guide:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuide();
  }, [selectedCrop]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Planting Guide</Text>
        <Text style={styles.subtitle}>NASA-powered recommendations</Text>
      </View>

      {/* Crop Selector */}
      <View style={styles.cropSelector}>
        {crops.map(crop => (
          <TouchableOpacity
            key={crop}
            style={[styles.cropButton, selectedCrop === crop && styles.cropButtonActive]}
            onPress={() => setSelectedCrop(crop)}
          >
            <Text style={[styles.cropText, selectedCrop === crop && styles.cropTextActive]}>
              {crop.charAt(0).toUpperCase() + crop.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryGreen} />
            <Text style={styles.loadingText}>Loading NASA data...</Text>
          </View>
        ) : guide ? (
          <>
            {/* Planting Windows */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌱 Planting Windows</Text>
              {guide.plantingWindows?.map((window, index) => (
                <View key={index} style={styles.windowCard}>
                  <View style={styles.windowHeader}>
                    <Text style={styles.windowSeason}>{window.season}</Text>
                    <View style={[
                      styles.statusBadge,
                      window.currentStatus === 'ready' ? styles.statusReady : styles.statusWait
                    ]}>
                      <Text style={styles.statusText}>
                        {window.currentStatus === 'ready' ? 'Ready to Plant' : 'Wait'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.windowDate}>
                    {window.startDate} → {window.endDate}
                  </Text>
                  <Text style={styles.windowDetail}>
                    Harvest: {window.harvestDate}
                  </Text>
                  <Text style={styles.windowDetail}>
                    Target NDVI: {window.ndviThreshold}
                  </Text>
                  <Text style={styles.windowReason}>💡 {window.reason}</Text>
                </View>
              ))}
            </View>

            {/* Climate Data */}
            {guide.climateData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌦️ Climate Data (NASA POWER)</Text>
                <View style={styles.climateCard}>
                  <View style={styles.climateRow}>
                    <Text style={styles.climateLabel}>Avg Temperature:</Text>
                    <Text style={styles.climateValue}>
                      {guide.climateData.avgTemp.toFixed(1)}°C
                    </Text>
                  </View>
                  <View style={styles.climateRow}>
                    <Text style={styles.climateLabel}>Avg Rainfall:</Text>
                    <Text style={styles.climateValue}>
                      {guide.climateData.avgRainfall.toFixed(1)} mm
                    </Text>
                  </View>
                  <View style={styles.climateRow}>
                    <Text style={styles.climateLabel}>Max Temp:</Text>
                    <Text style={styles.climateValue}>
                      {guide.climateData.maxTemp.toFixed(1)}°C
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Best Practices */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Best Practices</Text>
              {guide.bestPractices?.map((practice, index) => (
                <View key={index} style={styles.practiceItem}>
                  <Text style={styles.practiceText}>• {practice}</Text>
                </View>
              ))}
            </View>

            {/* Input Requirements */}
            {guide.inputs && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📦 Input Requirements</Text>
                <View style={styles.inputCard}>
                  {guide.inputs.seeds && (
                    <Text style={styles.inputText}>
                      Seeds: {guide.inputs.seeds.quantity} {guide.inputs.seeds.unit}
                    </Text>
                  )}
                  {guide.inputs.fertilizers?.map((fert, idx) => (
                    <Text key={idx} style={styles.inputText}>
                      {fert.type}: {fert.quantity} {fert.unit} ({fert.timing})
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>No guide available</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
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
  cropSelector: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#F5F5F5',
  },
  cropButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: COLORS.pureWhite,
    alignItems: 'center',
  },
  cropButtonActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  cropText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.earthBrown,
  },
  cropTextActive: {
    color: COLORS.pureWhite,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.earthBrown,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 15,
  },
  windowCard: {
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  windowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  windowSeason: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075985',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusReady: {
    backgroundColor: '#10B981',
  },
  statusWait: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  windowDate: {
    fontSize: 14,
    color: '#0369A1',
    marginBottom: 5,
  },
  windowDetail: {
    fontSize: 13,
    color: '#0C4A6E',
    marginBottom: 3,
  },
  windowReason: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 5,
  },
  climateCard: {
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 12,
  },
  climateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  climateLabel: {
    fontSize: 14,
    color: '#78350F',
    fontWeight: '600',
  },
  climateValue: {
    fontSize: 14,
    color: '#92400E',
  },
  practiceItem: {
    marginBottom: 8,
  },
  practiceText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    lineHeight: 20,
  },
  inputCard: {
    backgroundColor: '#ECFDF5',
    padding: 15,
    borderRadius: 12,
  },
  inputText: {
    fontSize: 14,
    color: '#065F46',
    marginBottom: 5,
  },
  emptyText: {
    padding: 40,
    textAlign: 'center',
    color: '#9CA3AF',
  },
});
