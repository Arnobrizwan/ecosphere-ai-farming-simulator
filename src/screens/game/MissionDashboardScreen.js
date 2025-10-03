import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

/**
 * Mission Dashboard Screen
 * Shows NASA data and mission objectives in a dedicated screen
 */
export default function MissionDashboardScreen({ route, navigation }) {
  const { scenario, nasaData } = route.params;

  const handleViewRawData = () => {
    Alert.alert(
      '🛰️ Raw NASA Data',
      JSON.stringify(nasaData, null, 2),
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛰️ Mission Dashboard</Text>
        <Text style={styles.scenarioTitle}>{scenario.title}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* NASA Data Cards */}
        {nasaData.soilMoisture && (
          <View style={styles.dataCard}>
            <Text style={styles.dataLabel}>💧 Soil Moisture</Text>
            <Text style={styles.dataValue}>
              {(nasaData.soilMoisture.soilMoisture * 100).toFixed(1)}%
            </Text>
            <Text style={styles.dataSource}>
              {nasaData.soilMoisture.source || 'SMAP SPL3SMP_E'}
            </Text>
          </View>
        )}

        {nasaData.precipitation && (
          <View style={styles.dataCard}>
            <Text style={styles.dataLabel}>🌧️ Precipitation</Text>
            <Text style={styles.dataValue}>
              {nasaData.precipitation.precipitationRate.toFixed(2)} mm/day
            </Text>
            <Text style={styles.dataSource}>
              {nasaData.precipitation.source || 'IMERG GPM_3IMERGDF'}
            </Text>
          </View>
        )}

        {nasaData.climate?.parameters && (
          <>
            {nasaData.climate.parameters.T2M?.[0]?.value !== null &&
              nasaData.climate.parameters.T2M?.[0]?.value !== undefined && (
                <View style={styles.dataCard}>
                  <Text style={styles.dataLabel}>🌡️ Temperature</Text>
                  <Text style={styles.dataValue}>
                    {nasaData.climate.parameters.T2M[0].value.toFixed(1)}°C
                  </Text>
                  <Text style={styles.dataSource}>NASA POWER</Text>
                </View>
              )}

            {nasaData.climate.parameters.ALLSKY_SFC_SW_DWN?.[0]?.value !== null &&
              nasaData.climate.parameters.ALLSKY_SFC_SW_DWN?.[0]?.value !== undefined && (
                <View style={styles.dataCard}>
                  <Text style={styles.dataLabel}>☀️ Solar Radiation</Text>
                  <Text style={styles.dataValue}>
                    {nasaData.climate.parameters.ALLSKY_SFC_SW_DWN[0].value.toFixed(1)} MJ/m²
                  </Text>
                  <Text style={styles.dataSource}>NASA POWER</Text>
                </View>
              )}
          </>
        )}

        {nasaData.ndvi && (
          <View style={styles.dataCard}>
            <Text style={styles.dataLabel}>🌿 MODIS NDVI (Processed)</Text>
            <Text style={styles.dataValue}>{nasaData.ndvi.ndvi?.toFixed?.(3) || '—'}</Text>
            <Text style={styles.dataSource}>{nasaData.ndvi.source || 'MOD13Q1'}</Text>
          </View>
        )}

        {nasaData.landsat && (
          <View style={styles.dataCard}>
            <Text style={styles.dataLabel}>🛰️ Landsat Vegetation Health</Text>
            <Text style={styles.dataSource}>{nasaData.landsat.source}</Text>
            {nasaData.landsat.observations > 0 ? (
              <View style={styles.landsatTrendContainer}>
                {nasaData.landsat.trend.slice(0, 3).map((obs, index) => (
                  <View key={obs.date || index} style={styles.landsatTrendRow}>
                    <Text style={styles.landsatTrendDate}>{obs.date?.slice(0, 10) || '—'}</Text>
                    <Text style={styles.landsatTrendValue}>
                      NDVI {obs.ndvi?.toFixed?.(3) ?? '—'}
                    </Text>
                    <Text style={styles.landsatTrendTag}>{obs.landCover || 'N/A'}</Text>
                  </View>
                ))}
                <Text style={styles.landsatTrendFootnote}>
                  Cloud cover: {nasaData.landsat.trend[0]?.cloudCover?.toFixed?.(1) ?? '—'}%
                </Text>
              </View>
            ) : (
              <Text style={styles.landsatTrendFootnote}>
                No recent Landsat passes. Showing simulated values until satellite coverage resumes.
              </Text>
            )}
          </View>
        )}

        {/* Mission Objectives */}
        {scenario.objectives && (
          <View style={styles.objectivesSection}>
            <Text style={styles.objectivesTitle}>📋 Mission Objectives</Text>
            {scenario.objectives.map((obj, idx) => (
              <Text key={idx} style={styles.objectiveItem}>
                • {obj.text || obj}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.rawDataButton}
          onPress={handleViewRawData}
        >
          <Text style={styles.rawDataButtonText}>View Raw Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => {
            Alert.alert(
              '🎉 Mission Complete!',
              'Great job using NASA satellite data to make informed farming decisions!',
              [
                { text: 'Try Another', onPress: () => navigation.goBack() },
                { text: 'Main Menu', onPress: () => navigation.navigate('Home') }
              ]
            );
          }}
        >
          <Text style={styles.completeButtonText}>🏆 Complete Mission</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGreen,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 8,
  },
  scenarioTitle: {
    fontSize: 18,
    color: COLORS.pureWhite,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dataCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 4,
  },
  dataSource: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  landsatTrendContainer: {
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  landsatTrendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  landsatTrendDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  landsatTrendValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  landsatTrendTag: {
    fontSize: 11,
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  landsatTrendFootnote: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 6,
    fontStyle: 'italic',
  },
  objectivesSection: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  objectivesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  objectiveItem: {
    fontSize: 16,
    color: COLORS.deepBlack,
    marginBottom: 8,
    lineHeight: 22,
  },
  rawDataButton: {
    backgroundColor: COLORS.textSecondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  rawDataButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  completeButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
});
