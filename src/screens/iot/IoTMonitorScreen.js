import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { iotRealtimeService } from '../../services/iot/deviceRealtime.service';

const StatusBadge = ({ status }) => {
  const { label, color } = useMemo(() => {
    switch (status) {
      case 'normal':
        return { label: 'Normal', color: COLORS.primaryGreen };
      case 'warning':
        return { label: 'Warning', color: '#FF9800' };
      case 'critical':
        return { label: 'Critical', color: '#E53935' };
      case 'offline':
        return { label: 'Offline', color: '#757575' };
      default:
        return { label: 'Unknown', color: '#9E9E9E' };
    }
  }, [status]);

  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]}> 
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
};

const MetricsGrid = ({ device }) => {
  if (!device?.telemetry) {
    return <Text style={styles.mutedText}>No telemetry available yet.</Text>;
  }

  const items = Object.entries(device.telemetry).filter(([key]) => key !== 'history' && key !== 'lastReading');

  if (items.length === 0) {
    return <Text style={styles.mutedText}>Telemetry stream empty.</Text>;
  }

  return (
    <View style={styles.metricsGrid}>
      {items.map(([key, value]) => (
        <View key={key} style={styles.metricChip}>
          <Text style={styles.metricLabel}>{key}</Text>
          <Text style={styles.metricValue}>{typeof value === 'number' ? value.toFixed(1) : String(value)}</Text>
        </View>
      ))}
    </View>
  );
};

const AlertsList = ({ alerts, onAcknowledge }) => {
  if (!alerts.length) {
    return (
      <View style={styles.alertEmptyState}>
        <Text style={styles.alertEmptyEmoji}>✅</Text>
        <Text style={styles.alertEmptyTitle}>All devices nominal</Text>
        <Text style={styles.alertEmptySubtitle}>No outstanding alerts</Text>
      </View>
    );
  }

  return (
    <View style={styles.alertListContainer}>
      {alerts.map((alert) => (
        <View key={alert.id} style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertDevice}>{alert.deviceName || alert.deviceId}</Text>
            <Text style={styles.alertTimestamp}>{new Date(alert.timestamp || Date.now()).toLocaleTimeString()}</Text>
          </View>
          <Text style={styles.alertMessage}>{alert.message || 'Alert raised'}</Text>
          <View style={styles.alertActions}>
            <View style={[styles.alertSeverity, alertSeverityStyles(alert.severity)]}>
              <Text style={styles.alertSeverityText}>{(alert.severity || 'info').toUpperCase()}</Text>
            </View>
            {!alert.acknowledged && (
              <TouchableOpacity
                style={styles.alertAckButton}
                onPress={() => onAcknowledge(alert)}
              >
                <Text style={styles.alertAckText}>Acknowledge</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

const alertSeverityStyles = (severity = 'info') => {
  switch (severity) {
    case 'critical':
      return { backgroundColor: '#fdecea', borderColor: '#f44336', color: '#c62828' };
    case 'warning':
      return { backgroundColor: '#fff8e1', borderColor: '#ffa000', color: '#ff8f00' };
    default:
      return { backgroundColor: '#e8f5e9', borderColor: COLORS.primaryGreen, color: COLORS.primaryGreen };
  }
};

const useFarmIdentifier = (route) => {
  const user = authService.getCurrentUser();
  const profileFarmId = route?.params?.farmId;
  if (profileFarmId) return profileFarmId;
  if (user?.uid) return `farm_${user.uid}`;
  return 'demoFarm';
};

const DeviceCard = ({ device, onCreateTicket }) => {
  const lastUpdate = device.lastUpdate ? new Date(device.lastUpdate).toLocaleTimeString() : 'Unknown';
  const alerts = device.alerts ? Object.values(device.alerts).filter(a => !a.acknowledged) : [];

  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceIcon}>{device.icon || '📟'}</Text>
        <View style={styles.deviceHeaderTexts}>
          <Text style={styles.deviceName}>{device.name || device.id}</Text>
          <Text style={styles.deviceMeta}>{device.type || 'Unknown type'} • Last update {lastUpdate}</Text>
        </View>
        <StatusBadge status={device.status} />
      </View>

      <View style={styles.deviceBody}>
        <Text style={styles.sectionLabel}>Live Telemetry</Text>
        <MetricsGrid device={device} />

        <View style={styles.inlineMetrics}>
          <View>
            <Text style={styles.subtleLabel}>Battery</Text>
            <Text style={styles.inlineValue}>{device.battery != null ? `${Math.round(device.battery)}%` : '—'}</Text>
          </View>
          <View>
            <Text style={styles.subtleLabel}>Alerts</Text>
            <Text style={styles.inlineValue}>{alerts.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.deviceFooter}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => onCreateTicket(device)}
        >
          <Text style={styles.secondaryButtonText}>Create Maintenance Ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const IoTMonitorScreen = ({ navigation, route }) => {
  const farmId = useFarmIdentifier(route);
  const user = authService.getCurrentUser();

  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = iotRealtimeService.listenToFarmDevices(
      farmId,
      (deviceList) => {
        setDevices(deviceList);
        setAlerts(iotRealtimeService.aggregateAlerts(deviceList));
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to load devices');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [farmId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const snapshot = await iotRealtimeService.seedDemoFarmData(farmId);
      if (snapshot?.seeded) {
        console.log('Seeded demo IoT data for farm', farmId);
      }
    } catch (seedError) {
      console.log('Seed demo skipped:', seedError.message);
    } finally {
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alert) => {
    try {
      await iotRealtimeService.acknowledgeAlert(farmId, alert.deviceId, alert.id, user?.uid);
    } catch (ackError) {
      Alert.alert('Error', ackError.message || 'Failed to acknowledge alert');
    }
  };

  const createMaintenanceTicket = async (device) => {
    try {
      const ticketId = await iotRealtimeService.createMaintenanceTicket(farmId, device.id, {
        description: `Follow-up on ${device.name} (${device.status})`,
        priority: device.status === 'critical' ? 'high' : 'medium',
        createdBy: user?.uid || 'system',
      });
      Alert.alert('Ticket Created', `Ticket ${ticketId} recorded for ${device.name}.`);
    } catch (ticketError) {
      Alert.alert('Error', ticketError.message || 'Unable to create maintenance ticket');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>IoT Device Monitor</Text>
        <Text style={styles.headerSubtitle}>Farm ID: {farmId}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          <Text style={styles.mutedText}>Connecting to real-time device feed...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.sectionHeading}>Active Devices</Text>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DeviceCard device={item} onCreateTicket={createMaintenanceTicket} />
            )}
            ListEmptyComponent={<Text style={styles.mutedText}>No devices registered yet.</Text>}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 16 }}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>Alerts & Tickets</Text>
          <AlertsList alerts={alerts} onAcknowledge={acknowledgeAlert} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F8F5',
  },
  headerBar: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.primaryGreen,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: COLORS.pureWhite,
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.pureWhite,
    opacity: 0.8,
    marginTop: 4,
  },
  scrollArea: {
    flex: 1,
    padding: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  deviceCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  deviceHeaderTexts: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  deviceMeta: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
    fontSize: 12,
  },
  deviceBody: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#2E7D32',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  inlineMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtleLabel: {
    fontSize: 12,
    color: '#78909C',
    textTransform: 'uppercase',
  },
  inlineValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  deviceFooter: {
    marginTop: 16,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryGreen,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 20,
    height: 1,
    backgroundColor: '#CFD8DC',
  },
  alertListContainer: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertDevice: {
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#78909C',
  },
  alertMessage: {
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertSeverity: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  alertSeverityText: {
    fontWeight: '600',
    fontSize: 12,
  },
  alertAckButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  alertAckText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
  },
  alertEmptyState: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  alertEmptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  alertEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  alertEmptySubtitle: {
    fontSize: 14,
    color: '#78909C',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mutedText: {
    color: '#78909C',
    textAlign: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 12,
  },
});

export default IoTMonitorScreen;
