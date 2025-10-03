import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { getCompleteSatelliteData } from '../services/nasa/satelliteService';
import { COLORS } from '../constants/colors';

const DEFAULT_COORDS = {
  latitude: 40.7128,
  longitude: -74.006,
};

const buildDateRange = (days = 30) => {
  const end = new Date();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

export default function SatelliteDataScreen({ route }) {
  const farmId = route?.params?.farmId || 'demo-farm';
  const latitude = route?.params?.latitude ?? DEFAULT_COORDS.latitude;
  const longitude = route?.params?.longitude ?? DEFAULT_COORDS.longitude;

  const [{ startDate, endDate }] = useState(() => buildDateRange(30));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCompleteSatelliteData(
        farmId,
        latitude,
        longitude,
        startDate,
        endDate,
      );
      setData(result);
    } catch (err) {
      console.error('[SatelliteDataScreen] fetch error', err);
      setError(err?.message || 'Failed to fetch satellite data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Satellite Monitoring</Text>
      <Text style={styles.subtitle}>
        Fetch SMAP, MODIS NDVI, and Landsat scenes for farm verification.
      </Text>

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Farm ID:</Text>
        <Text style={styles.metaValue}>{farmId}</Text>

        <Text style={styles.metaLabel}>Coordinates:</Text>
        <Text style={styles.metaValue}>
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>

        <Text style={styles.metaLabel}>Date Range:</Text>
        <Text style={styles.metaValue}>
          {startDate} → {endDate}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleFetch} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Fetching…' : 'Fetch Satellite Data'}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color={COLORS.primaryGreen} style={styles.loader} />}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Unable to fetch data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : null}

      {data ? (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>SMAP Soil Moisture</Text>
          {data.soilMoisture?.length ? (
            data.soilMoisture.map((entry) => (
              <View key={entry.date} style={styles.listItem}>
                <Text style={styles.itemTitle}>{entry.date}</Text>
                <Text style={styles.itemValue}>{entry.soilMoisture.toFixed(3)} cm³/cm³</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyState}>No soil moisture records.</Text>
          )}

          <Text style={styles.sectionTitle}>MODIS NDVI</Text>
          <View style={styles.listItem}>
            <Text style={styles.itemTitle}>NDVI</Text>
            <Text style={styles.itemValue}>{data.ndvi?.ndvi ?? 'N/A'}</Text>
          </View>
          <Text style={styles.helperText}>{data.ndvi?.note}</Text>

          <Text style={styles.sectionTitle}>Landsat Scenes</Text>
          {data.landsatScenes?.length ? (
            data.landsatScenes.map((scene) => (
              <View key={scene.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{scene.title}</Text>
                <Text style={styles.itemValue}>{scene.cloudCover}% cloud cover</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyState}>No scenes with acceptable cloud cover.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F4F7F6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 8,
    marginBottom: 16,
  },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginTop: 8,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  button: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  errorBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C1C',
  },
  errorMessage: {
    color: '#B91C1C',
    marginTop: 4,
  },
  results: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  itemValue: {
    fontSize: 14,
    color: '#374151',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyState: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
