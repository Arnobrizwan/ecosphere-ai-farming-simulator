import { db } from '../firebase.config';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

/**
 * Real-time Monitoring Service (UC49) - Monitor real-time status
 */
export class RealTimeMonitoringService {
  constructor(userId) {
    this.userId = userId;
    this.subscribers = [];
    this.unsubscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);

    // Start listening to real-time updates
    this.startListening();

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
      if (this.subscribers.length === 0) {
        this.stopListening();
      }
    };
  }

  startListening() {
    if (this.unsubscribers.length > 0) return; // Already listening

    // Listen to IoT devices (UC23)
    const devicesQuery = query(
      collection(db, 'iot_devices'),
      where('userId', '==', this.userId)
    );

    const devicesUnsub = onSnapshot(devicesQuery, (snapshot) => {
      const devices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.notifySubscribers({ devices });
    });

    this.unsubscribers.push(devicesUnsub);

    // Listen to weather alerts (UC40)
    const alertsQuery = query(
      collection(db, 'weather_alerts'),
      where('userId', '==', this.userId),
      where('acknowledged', '==', false)
    );

    const alertsUnsub = onSnapshot(alertsQuery, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.notifySubscribers({ alerts });
    });

    this.unsubscribers.push(alertsUnsub);

    // Listen to operations (UC44)
    const opsQuery = query(
      collection(db, 'farm_operations'),
      where('userId', '==', this.userId),
      where('status', 'in', ['planned', 'in_progress'])
    );

    const opsUnsub = onSnapshot(opsQuery, (snapshot) => {
      const operations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.notifySubscribers({ operations });
    });

    this.unsubscribers.push(opsUnsub);
  }

  stopListening() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  notifySubscribers(update) {
    const status = {
      ...this.currentStatus,
      ...update,
      timestamp: Date.now()
    };

    this.currentStatus = status;

    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  async getCurrentStatus() {
    const [devices, weather, operations, alerts] = await Promise.all([
      this.getDeviceStatus(),
      this.getWeatherStatus(),
      this.getOperationsStatus(),
      this.getAlerts()
    ]);

    return {
      userId: this.userId,
      timestamp: Date.now(),
      devices,
      weather,
      operations,
      alerts
    };
  }

  async getDeviceStatus() {
    // Would integrate with UC23
    return [
      {
        id: 'device_1',
        type: 'soil_moisture',
        status: 'online',
        lastReading: { moisture: 55, timestamp: Date.now() },
        battery: 85
      },
      {
        id: 'device_2',
        type: 'weather_station',
        status: 'online',
        lastReading: { temperature: 28, humidity: 65, timestamp: Date.now() },
        battery: 92
      }
    ];
  }

  async getWeatherStatus() {
    // Would integrate with UC15/UC40
    return {
      current: {
        temperature: 28,
        humidity: 65,
        conditions: 'Partly Cloudy',
        windSpeed: 12
      },
      alerts: [
        {
          id: 'alert_1',
          type: 'heavy_rain',
          severity: 'medium',
          message: 'Heavy rain expected in 6 hours'
        }
      ],
      lastUpdate: Date.now()
    };
  }

  async getOperationsStatus() {
    // Would integrate with UC44
    return [
      {
        id: 'op_1',
        type: 'irrigation',
        status: 'in_progress',
        progress: 65,
        startedAt: Date.now() - (30 * 60 * 1000)
      },
      {
        id: 'op_2',
        type: 'harvest',
        status: 'planned',
        scheduledFor: Date.now() + (2 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  async getAlerts() {
    return [
      {
        id: 'alert_1',
        type: 'device_offline',
        severity: 'medium',
        message: 'Soil moisture sensor #3 is offline',
        acknowledged: false,
        createdAt: Date.now() - (10 * 60 * 1000)
      },
      {
        id: 'alert_2',
        type: 'weather',
        severity: 'high',
        message: 'Heavy rain expected in 6 hours',
        acknowledged: false,
        createdAt: Date.now() - (5 * 60 * 1000)
      }
    ];
  }

  async acknowledgeAlert(alertId) {
    const alertRef = doc(db, 'weather_alerts', alertId);
    await updateDoc(alertRef, {
      acknowledged: true,
      acknowledgedAt: Date.now(),
      acknowledgedBy: this.userId
    });

    return { acknowledged: true, alertId };
  }

  async createTaskFromAlert(alertId) {
    const alerts = await this.getAlerts();
    const alert = alerts.find(a => a.id === alertId);

    if (!alert) return null;

    // Create task based on alert type
    const task = {
      type: this.getTaskTypeForAlert(alert.type),
      title: `Address: ${alert.message}`,
      priority: alert.severity,
      createdFrom: 'alert',
      alertId,
      createdAt: Date.now()
    };

    // Would integrate with UC22
    console.log('Creating task from alert:', task);

    return {
      created: true,
      task
    };
  }

  getTaskTypeForAlert(alertType) {
    const mapping = {
      device_offline: 'maintenance',
      weather: 'weather_preparation',
      low_moisture: 'irrigation',
      disease: 'treatment',
      livestock_health: 'veterinary_check'
    };

    return mapping[alertType] || 'general';
  }

  async getStatusTiles() {
    const status = await this.getCurrentStatus();

    return [
      {
        id: 'devices',
        title: 'IoT Devices',
        value: status.devices.length,
        status: status.devices.every(d => d.status === 'online') ? 'good' : 'warning',
        icon: 'device'
      },
      {
        id: 'weather',
        title: 'Weather',
        value: `${status.weather.current.temperature}°C`,
        status: status.weather.alerts.length > 0 ? 'warning' : 'good',
        icon: 'weather'
      },
      {
        id: 'operations',
        title: 'Operations',
        value: status.operations.filter(o => o.status === 'in_progress').length,
        status: 'good',
        icon: 'operations'
      },
      {
        id: 'alerts',
        title: 'Alerts',
        value: status.alerts.length,
        status: status.alerts.length > 0 ? 'warning' : 'good',
        icon: 'alert'
      }
    ];
  }
}

export default RealTimeMonitoringService;
