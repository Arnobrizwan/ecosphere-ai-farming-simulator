import { rtdb } from '../firebase.config';
import {
  ref,
  onValue,
  off,
  update,
  push,
  set,
  serverTimestamp,
  get,
  child
} from 'firebase/database';

const DEFAULT_FARM_ID = 'demoFarm';

const formatDeviceSnapshot = (snapshot) => {
  const value = snapshot.val() || {};
  return Object.entries(value).map(([deviceId, payload]) => ({
    id: deviceId,
    ...payload,
  }));
};

const sortAlerts = (rawAlerts = {}, deviceMeta = {}) => {
  return Object.entries(rawAlerts)
    .map(([alertId, alert]) => ({
      id: alertId,
      deviceId: deviceMeta.id,
      deviceName: deviceMeta.name,
      status: deviceMeta.status,
      ...alert,
    }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const iotRealtimeService = {
  listenToFarmDevices: (farmId = DEFAULT_FARM_ID, onDevices, onError) => {
    const devicesRef = ref(rtdb, `iot/farms/${farmId}/devices`);

    const callback = (snapshot) => {
      const devices = formatDeviceSnapshot(snapshot);
      onDevices(devices);
    };

    const unsubscribe = onValue(devicesRef, callback, (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('IoT device listener error', error);
      }
    });

    return () => {
      off(devicesRef, 'value', callback);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  },

  listenToDeviceTelemetry: (farmId = DEFAULT_FARM_ID, deviceId, onTelemetry, onError) => {
    const telemetryRef = ref(rtdb, `iot/farms/${farmId}/devices/${deviceId}/telemetry`);

    const callback = (snapshot) => {
      const value = snapshot.val() || {};
      onTelemetry(value);
    };

    const unsubscribe = onValue(telemetryRef, callback, (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('IoT telemetry listener error', error);
      }
    });

    return () => {
      off(telemetryRef, 'value', callback);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  },

  getDeviceAlerts: async (farmId = DEFAULT_FARM_ID, deviceId) => {
    const alertsRef = ref(rtdb, `iot/farms/${farmId}/devices/${deviceId}/alerts`);
    const snapshot = await get(alertsRef);
    const deviceDataSnap = await get(child(ref(rtdb), `iot/farms/${farmId}/devices/${deviceId}`));
    const deviceMeta = deviceDataSnap.exists() ? { id: deviceId, ...deviceDataSnap.val() } : { id: deviceId };
    return sortAlerts(snapshot.val() || {}, deviceMeta);
  },

  acknowledgeAlert: async (farmId = DEFAULT_FARM_ID, deviceId, alertId, userId) => {
    const alertRef = ref(rtdb, `iot/farms/${farmId}/devices/${deviceId}/alerts/${alertId}`);
    await update(alertRef, {
      acknowledged: true,
      acknowledgedAt: Date.now(),
      acknowledgedBy: userId || 'unknown',
    });
  },

  createMaintenanceTicket: async (farmId = DEFAULT_FARM_ID, deviceId, details) => {
    const ticketsRef = ref(rtdb, `iot/farms/${farmId}/tickets`);
    const ticketRef = push(ticketsRef);
    const payload = {
      deviceId,
      status: 'open',
      createdAt: serverTimestamp(),
      priority: details?.priority || 'medium',
      description: details?.description || 'Maintenance check requested via IoT monitor',
      createdBy: details?.createdBy || 'system',
    };
    await set(ticketRef, payload);
    return ticketRef.key;
  },

  seedDemoFarmData: async (farmId = DEFAULT_FARM_ID) => {
    const farmRef = ref(rtdb, `iot/farms/${farmId}`);
    const snapshot = await get(farmRef);
    if (snapshot.exists()) {
      return { skipped: true, message: 'Farm data already exists; skipping seed.' };
    }

    const now = Date.now();
    const devices = {
      moistureSensor01: {
        name: 'Soil Sensor North Field',
        type: 'soilMoisture',
        icon: '🌱',
        status: 'warning',
        battery: 42,
        lastUpdate: now - 2 * 60 * 1000,
        telemetry: {
          lastReading: 28,
          unit: '%',
          history: [45, 40, 35, 30, 28],
        },
        alerts: {
          alert001: {
            message: 'Moisture dropped below threshold',
            timestamp: now - 90 * 1000,
            severity: 'warning',
            acknowledged: false,
          },
        },
      },
      weatherStationA: {
        name: 'Weather Tower',
        type: 'weather',
        icon: '🌤️',
        status: 'normal',
        battery: 88,
        lastUpdate: now - 30 * 1000,
        telemetry: {
          temperature: 29.4,
          humidity: 64,
          windSpeed: 3.1,
          rainfall: 0.3,
        },
      },
      irrigationControllerWest: {
        name: 'Irrigation Controller (West)',
        type: 'irrigation',
        icon: '🚰',
        status: 'critical',
        battery: 100,
        lastUpdate: now - 5 * 60 * 1000,
        telemetry: {
          activeZones: 2,
          totalZones: 6,
          flowRate: 18,
        },
        alerts: {
          alert002: {
            message: 'Valve 4 failed to open',
            severity: 'critical',
            timestamp: now - 4 * 60 * 1000,
            acknowledged: false,
          },
        },
      },
    };

    await set(farmRef, { devices });
    return { seeded: true };
  },

  aggregateAlerts: (devices = []) => {
    return devices.flatMap((device) => {
      if (!device.alerts) return [];
      return sortAlerts(device.alerts, device);
    });
  },
};

export default iotRealtimeService;
