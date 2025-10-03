import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * Device Status Panel - Shows device info when player interacts
 */
const DeviceStatusPanel = ({ 
  device, 
  visible, 
  onClose,
  onReplaceBattery,
  onCalibrate,
  onViewHistory 
}) => {
  if (!visible || !device) return null;

  const getStatusText = () => {
    switch (device.status) {
      case 'normal': return '✓ Normal';
      case 'warning': return '⚠️ Warning';
      case 'critical': return '🔴 Critical';
      case 'offline': return '⚫ Offline';
      default: return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (device.status) {
      case 'normal': return COLORS.primaryGreen;
      case 'warning': return '#FF9800';
      case 'critical': return '#FF5722';
      case 'offline': return '#808080';
      default: return '#999';
    }
  };

  const getBatteryColor = () => {
    if (device.battery > 60) return COLORS.primaryGreen;
    if (device.battery > 20) return '#FF9800';
    return '#FF5722';
  };

  const formatReading = () => {
    if (!device.lastReading) return 'No data';
    
    switch (device.type) {
      case 'soilMoisture':
        return `${Math.round(device.lastReading)}% moisture`;
      case 'weather':
        return `${Math.round(device.lastReading.temp)}°C, ${Math.round(device.lastReading.humidity)}% humidity`;
      case 'irrigation':
        return device.isActive ? 'Active' : 'Standby';
      default:
        return JSON.stringify(device.lastReading);
    }
  };

  const getTimeSinceUpdate = () => {
    const elapsed = Date.now() - device.lastUpdate;
    const minutes = Math.floor(elapsed / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.deviceIcon}>{device.icon}</Text>
          <View style={styles.headerText}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceType}>{device.type}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Current Reading */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Reading</Text>
            <Text style={styles.readingValue}>{formatReading()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>

          {/* Battery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Battery</Text>
            <View style={styles.batteryContainer}>
              <View style={styles.batteryBar}>
                <View 
                  style={[
                    styles.batteryFill, 
                    { 
                      width: `${device.battery}%`,
                      backgroundColor: getBatteryColor()
                    }
                  ]} 
                />
              </View>
              <Text style={styles.batteryText}>{Math.round(device.battery)}%</Text>
            </View>
            {device.battery < 20 && (
              <Text style={styles.warningText}>⚠️ Low battery - replace soon</Text>
            )}
          </View>

          {/* Device Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Range:</Text>
              <Text style={styles.infoValue}>{device.range}m</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Accuracy:</Text>
              <Text style={styles.infoValue}>{device.accuracy}%</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Update:</Text>
              <Text style={styles.infoValue}>{getTimeSinceUpdate()}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            {device.battery < 100 && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={onReplaceBattery}
              >
                <Text style={styles.actionButtonText}>🔋 Replace Battery (5 coins)</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onCalibrate}
            >
              <Text style={styles.actionButtonText}>⚙️ Calibrate Sensor</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onViewHistory}
            >
              <Text style={styles.actionButtonText}>📊 View History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryGreen,
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  deviceType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.deepBlack,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  readingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.pureWhite,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batteryBar: {
    flex: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 12,
  },
  batteryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
    minWidth: 45,
  },
  warningText: {
    fontSize: 12,
    color: '#FF5722',
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  actionButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.pureWhite,
    textAlign: 'center',
  },
});

export default DeviceStatusPanel;
