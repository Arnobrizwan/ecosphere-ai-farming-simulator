/**
 * UC40 - Weather Alerts Screen
 * Push/SMS alerts for weather risks using NASA POWER
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { getActiveAlerts, subscribeToAlerts, acknowledgeAlert } from '../../services/operations/weatherAlerts.service';
import { authService } from '../../services/auth.service';

export default function WeatherAlertsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [subscriptions, setSubscriptions] = useState({
    extreme_heat: true,
    heavy_rain: true,
    drought: true,
  });
  const currentUser = authService.getCurrentUser();

  const loadAlerts = async () => {
    try {
      const result = await getActiveAlerts(currentUser?.uid);
      setAlerts(result.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(currentUser?.uid, alertId);
      loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleSubscribe = async () => {
    try {
      await subscribeToAlerts(currentUser?.uid, {
        location: { latitude: 23.81, longitude: 90.41 },
        channels: ['app', 'push'],
        alertTypes: Object.keys(subscriptions).filter(key => subscriptions[key]),
      });
      alert('Alert preferences saved!');
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Weather Alerts</Text>
        <Text style={styles.subtitle}>NASA POWER 7-day forecast</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Active Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Active Alerts ({alerts.length})</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          ) : alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <View key={index} style={[styles.alertCard, { borderLeftColor: getSeverityColor(alert.severity) }]}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertType}>{alert.type.replace(/_/g, ' ').toUpperCase()}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                    <Text style={styles.severityText}>{alert.severity}</Text>
                  </View>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertRecommendation}>💡 {alert.recommendation}</Text>
                <View style={styles.alertFooter}>
                  <Text style={styles.alertDate}>
                    {new Date(alert.timestamp).toLocaleDateString()}
                  </Text>
                  {!alert.acknowledged && (
                    <TouchableOpacity
                      style={styles.ackButton}
                      onPress={() => handleAcknowledge(alert.id)}
                    >
                      <Text style={styles.ackText}>Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No active alerts</Text>
              <Text style={styles.emptySubtext}>Weather conditions are favorable</Text>
            </View>
          )}
        </View>

        {/* Alert Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Alert Preferences</Text>
          
          {Object.entries(subscriptions).map(([type, enabled]) => (
            <View key={type} style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>
                {type.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Switch
                value={enabled}
                onValueChange={(value) => setSubscriptions({ ...subscriptions, [type]: value })}
                trackColor={{ false: '#D1D5DB', true: COLORS.primaryGreen }}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.saveButton} onPress={handleSubscribe}>
            <Text style={styles.saveText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>

        {/* Alert Types Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Alert Types</Text>
          <View style={styles.guideCard}>
            <Text style={styles.guideItem}>🔥 Extreme Heat: &gt;40°C</Text>
            <Text style={styles.guideItem}>☀️ Heat Wave: &gt;35°C for 3 days</Text>
            <Text style={styles.guideItem}>🌧️ Heavy Rain: &gt;50mm/day</Text>
            <Text style={styles.guideItem}>💧 Drought: &lt;2mm/day avg (7 days)</Text>
            <Text style={styles.guideItem}>🌊 Flood Risk: &gt;100mm total</Text>
            <Text style={styles.guideItem}>❄️ Frost: &lt;5°C</Text>
          </View>
        </View>
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
  content: {
    flex: 1,
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
  alertCard: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 8,
  },
  alertRecommendation: {
    fontSize: 13,
    color: '#059669',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ackButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ackText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.earthBrown,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  saveButton: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  saveText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  guideCard: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
  },
  guideItem: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 8,
  },
});
