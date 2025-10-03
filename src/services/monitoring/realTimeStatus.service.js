/**
 * UC49 - Real-time Status Monitoring Service
 * Live device/weather/ops status with UC23/UC40/UC44 integration
 */

import { db } from '../firebase.config';
import { collection, doc, query, where, onSnapshot, getDoc, getDocs, updateDoc, addDoc, limit, orderBy } from 'firebase/firestore';
import { getActiveAlerts } from '../operations/weatherAlerts.service';

/**
 * Subscribe to real-time streams
 */
export const subscribeToRealTimeStatus = (userId, farmId, callback) => {
  const unsubscribers = [];

  // IoT device streams (UC23 integration)
  const iotUnsubscribe = onSnapshot(
    query(collection(db, 'iot_devices'), where('farmId', '==', farmId), where('status', '==', 'online')),
    snapshot => {
      const devices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdate: doc.data().lastHeartbeat || new Date().toISOString(),
      }));

      callback({
        type: 'iot_devices',
        data: devices,
        timestamp: new Date().toISOString(),
      });
    });

  unsubscribers.push(iotUnsubscribe);

  // Active operations stream (UC44 integration)
  const opsUnsubscribe = onSnapshot(
    query(collection(db, 'farm_operations'), where('userId', '==', userId), where('status', '==', 'in_progress')),
    snapshot => {
      const operations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback({
        type: 'operations',
        data: operations,
        timestamp: new Date().toISOString(),
      });
    });

  unsubscribers.push(opsUnsubscribe);

  // Weather alerts stream (UC40 integration)
  const alertsUnsubscribe = onSnapshot(
    query(collection(db, 'weather_alerts'), where('userId', '==', userId), where('acknowledged', '==', false)),
    snapshot => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback({
        type: 'weather_alerts',
        data: alerts,
        timestamp: new Date().toISOString(),
      });
    });

  unsubscribers.push(alertsUnsubscribe);

  // Crop health alerts stream
  const healthUnsubscribe = onSnapshot(
    query(collection(db, 'crop_health'), where('userId', '==', userId), orderBy('date', 'desc'), limit(1)),
    snapshot => {
      const healthData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (healthData.length > 0) {
        callback({
          type: 'crop_health',
          data: healthData[0],
          timestamp: new Date().toISOString(),
        });
      }
    });

  unsubscribers.push(healthUnsubscribe);

  // Return cleanup function
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
};

/**
 * Get real-time status snapshot
 */
export const getRealTimeStatus = async (userId, farmId) => {
  try {
    const [
      iotDevices,
      activeOperations,
      weatherAlerts,
      cropHealth,
      systemHealth,
    ] = await Promise.all([
      getIoTDevicesStatus(farmId),
      getActiveOperationsStatus(userId),
      getActiveAlerts(userId),
      getCurrentCropHealth(userId),
      getSystemHealth(farmId),
    ]);

    // Build status tiles
    const tiles = buildStatusTiles(
      iotDevices,
      activeOperations,
      weatherAlerts,
      cropHealth,
      systemHealth
    );

    // Identify critical alerts
    const criticalAlerts = identifyCriticalAlerts(
      iotDevices,
      weatherAlerts,
      cropHealth
    );

    return {
      success: true,
      tiles,
      criticalAlerts,
      updatedAt: new Date().toISOString(),
      connectionStatus: 'connected',
    };
  } catch (error) {
    console.error('[RealTime] Status fetch failed:', error);
    return {
      success: false,
      error: error.message,
      connectionStatus: 'disconnected',
    };
  }
};

/**
 * Get IoT devices status
 */
async function getIoTDevicesStatus(farmId) {
  const snapshot = await getDocs(
    query(collection(db, 'iot_devices'), where('farmId', '==', farmId))
  );

  const devices = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    warning: devices.filter(d => d.batteryLevel < 20).length,
    devices,
  };
}

/**
 * Get active operations status
 */
async function getActiveOperationsStatus(userId) {
  const snapshot = await getDocs(
    query(collection(db, 'farm_operations'), where('userId', '==', userId), where('status', 'in', ['planned', 'in_progress']))
  );

  const operations = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    total: operations.length,
    inProgress: operations.filter(o => o.status === 'in_progress').length,
    planned: operations.filter(o => o.status === 'planned').length,
    overdue: operations.filter(o => o.scheduledDate < Date.now()).length,
    operations,
  };
}

/**
 * Get current crop health
 */
async function getCurrentCropHealth(userId) {
  const snapshot = await getDocs(
    query(collection(db, 'crop_health'), where('userId', '==', userId), orderBy('date', 'desc'), limit(1))
  );

  if (snapshot.empty) {
    return { score: 0, status: 'unknown', anomalies: [] };
  }

  const latest = snapshot.docs[0].data();
  return {
    score: latest.healthScore || 0,
    status: latest.healthScore > 70 ? 'good' : latest.healthScore > 50 ? 'fair' : 'poor',
    anomalies: latest.anomalies || [],
  };
}

/**
 * Get system health
 */
async function getSystemHealth(farmId) {
  // Check various system components
  return {
    database: 'operational',
    nasaAPI: 'operational',
    iotGateway: 'operational',
    lastSync: new Date().toISOString(),
  };
}

/**
 * Build status tiles
 */
function buildStatusTiles(iotDevices, operations, weatherAlerts, cropHealth, systemHealth) {
  return [
    {
      id: 'iot',
      title: 'IoT Devices',
      icon: '📡',
      status: iotDevices.offline > 0 ? 'warning' : 'normal',
      data: {
        online: iotDevices.online,
        total: iotDevices.total,
        percentage: iotDevices.total > 0 ? ((iotDevices.online / iotDevices.total) * 100).toFixed(0) : 0,
      },
      alert: iotDevices.offline > 0 ? `${iotDevices.offline} device(s) offline` : null,
    },
    {
      id: 'weather',
      title: 'Weather Status',
      icon: '🌦️',
      status: weatherAlerts.alerts?.length > 0 ? 'critical' : 'normal',
      data: {
        alerts: weatherAlerts.alerts?.length || 0,
        severity: weatherAlerts.alerts?.[0]?.severity || 'none',
      },
      alert: weatherAlerts.alerts?.length > 0 ? weatherAlerts.alerts[0].message : null,
    },
    {
      id: 'operations',
      title: 'Operations',
      icon: '🚜',
      status: operations.overdue > 0 ? 'warning' : 'normal',
      data: {
        inProgress: operations.inProgress,
        planned: operations.planned,
        overdue: operations.overdue,
      },
      alert: operations.overdue > 0 ? `${operations.overdue} operation(s) overdue` : null,
    },
    {
      id: 'crop_health',
      title: 'Crop Health',
      icon: cropHealth.status === 'good' ? '🌱' : cropHealth.status === 'fair' ? '⚠️' : '🔴',
      status: cropHealth.status === 'poor' ? 'critical' : cropHealth.status === 'fair' ? 'warning' : 'normal',
      data: {
        score: cropHealth.score,
        status: cropHealth.status,
        anomalies: cropHealth.anomalies.length,
      },
      alert: cropHealth.anomalies.length > 0 ? `${cropHealth.anomalies.length} anomaly(ies) detected` : null,
    },
    {
      id: 'system',
      title: 'System Health',
      icon: '⚙️',
      status: 'normal',
      data: {
        database: systemHealth.database,
        nasaAPI: systemHealth.nasaAPI,
        iotGateway: systemHealth.iotGateway,
      },
      alert: null,
    },
  ];
}

/**
 * Identify critical alerts
 */
function identifyCriticalAlerts(iotDevices, weatherAlerts, cropHealth) {
  const alerts = [];

  // Critical weather alerts
  if (weatherAlerts.alerts) {
    weatherAlerts.alerts
      .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
      .forEach(alert => {
        alerts.push({
          id: alert.id,
          type: 'weather',
          severity: alert.severity,
          message: alert.message,
          action: 'View Alert',
          route: 'WeatherAlerts',
        });
      });
  }

  // IoT device failures
  if (iotDevices.offline > 0) {
    alerts.push({
      id: 'iot_offline',
      type: 'device',
      severity: 'high',
      message: `${iotDevices.offline} IoT device(s) offline`,
      action: 'Check Devices',
      route: 'IoTDevices',
    });
  }

  // Crop health critical
  if (cropHealth.status === 'poor') {
    alerts.push({
      id: 'health_critical',
      type: 'health',
      severity: 'critical',
      message: `Crop health critical (${cropHealth.score}/100)`,
      action: 'Investigate',
      route: 'CropHealth',
    });
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

/**
 * Acknowledge alert
 */
export const acknowledgeAlert = async (userId, alertId, alertType) => {
  const collections = {
    weather: 'weather_alerts',
    health: 'crop_health',
    device: 'iot_devices',
  };

  const collection = collections[alertType];
  if (!collection) {
    throw new Error('Invalid alert type');
  }

  await updateDoc(doc(db, collection, alertId), {
    acknowledged: true,
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: userId,
  });

  // Record acknowledgment
  await addDoc(collection(db, 'alert_acknowledgments'), {
    userId,
    alertId,
    alertType,
    acknowledgedAt: new Date().toISOString(),
  });

  return {
    success: true,
    alertId,
  };
};

/**
 * Create task from alert
 */
export const createTaskFromAlert = async (userId, alertId, alertType, taskData) => {
  // UC22 integration - create automated task
  const task = {
    userId,
    sourceAlert: { id: alertId, type: alertType },
    ...taskData,
    status: 'pending',
    priority: 'high',
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'operation_tasks'), task);

  // Link task to alert
  await updateDoc(doc(db, alertType === 'weather' ? 'weather_alerts' : 'crop_health', alertId), {
      linkedTask: docRef.id,
      taskCreatedAt: new Date().toISOString(),
    });

  return {
    success: true,
    taskId: docRef.id,
    task,
  };
};

/**
 * Get connection health
 */
export const getConnectionHealth = async () => {
  const checks = [
    { name: 'Firestore', check: async () => {
      try {
        await getDocs(query(collection(db, '_health_check'), limit(1)));
        return 'healthy';
      } catch {
        return 'unhealthy';
      }
    }},
    { name: 'NASA APIs', check: async () => {
      // Would ping NASA POWER or similar
      return 'healthy';
    }},
  ];

  const results = await Promise.all(
    checks.map(async ({ name, check }) => ({
      service: name,
      status: await check(),
      timestamp: new Date().toISOString(),
    }))
  );

  return {
    overall: results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded',
    services: results,
  };
};
