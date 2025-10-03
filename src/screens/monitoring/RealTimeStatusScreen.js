/**
 * UC49 - Real-time Status Monitoring Screen
 * Live device/weather/ops status
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
import { getRealTimeStatus, acknowledgeAlert } from '../../services/monitoring/realTimeStatus.service';
import { authService } from '../../services/auth.service';

export default function RealTimeStatusScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const currentUser = authService.getCurrentUser();

  const loadStatus = async () => {
    try {
      const result = await getRealTimeStatus(currentUser?.uid, 'default_farm');
      if (result.success) {
        setStatus(result);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getTileColor = (tileStatus) => {
    switch (tileStatus) {
      case 'critical': return '#FEE2E2';
      case 'warning': return '#FEF3C7';
      default: return '#F0FDF4';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Real-time Status</Text>
        <Text style={styles.subtitle}>
          {status?.connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        ) : (
          <>
            {/* Critical Alerts */}
            {status?.criticalAlerts && status.criticalAlerts.length > 0 && (
              <View style={styles.alertsSection}>
                <Text style={styles.sectionTitle}>🚨 Critical Alerts</Text>
                {status.criticalAlerts.map((alert, idx) => (
                  <View key={idx} style={styles.criticalAlert}>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <TouchableOpacity
                      style={styles.alertButton}
                      onPress={() => navigation.navigate(alert.route)}
                    >
                      <Text style={styles.alertButtonText}>{alert.action}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Status Tiles */}
            <View style={styles.tilesSection}>
              <Text style={styles.sectionTitle}>📊 System Status</Text>
              {status?.tiles?.map((tile, idx) => (
                <View key={idx} style={[styles.tile, { backgroundColor: getTileColor(tile.status) }]}>
                  <View style={styles.tileHeader}>
                    <Text style={styles.tileIcon}>{tile.icon}</Text>
                    <Text style={styles.tileTitle}>{tile.title}</Text>
                  </View>
                  <View style={styles.tileBody}>
                    {Object.entries(tile.data).map(([key, value]) => (
                      <Text key={key} style={styles.tileData}>
                        {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                      </Text>
                    ))}
                  </View>
                  {tile.alert && <Text style={styles.tileAlert}>⚠️ {tile.alert}</Text>}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: COLORS.primaryGreen, padding: 20, paddingTop: 60 },
  backText: { color: COLORS.pureWhite, fontSize: 16, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.pureWhite, marginBottom: 5 },
  subtitle: { fontSize: 12, color: '#E0F2F1' },
  content: { flex: 1, padding: 15 },
  alertsSection: { marginBottom: 20, backgroundColor: COLORS.pureWhite, padding: 15, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryGreen, marginBottom: 10 },
  criticalAlert: { backgroundColor: '#FEE2E2', padding: 15, borderRadius: 12, marginBottom: 10 },
  alertMessage: { fontSize: 14, color: '#991B1B', marginBottom: 10 },
  alertButton: { backgroundColor: '#DC2626', padding: 10, borderRadius: 6 },
  alertButtonText: { color: COLORS.pureWhite, textAlign: 'center', fontWeight: '600' },
  tilesSection: { backgroundColor: COLORS.pureWhite, padding: 15, borderRadius: 12 },
  tile: { padding: 15, borderRadius: 12, marginBottom: 15 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tileIcon: { fontSize: 24, marginRight: 10 },
  tileTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepBlack },
  tileBody: { marginBottom: 10 },
  tileData: { fontSize: 12, color: COLORS.earthBrown, marginBottom: 3 },
  tileAlert: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
});
