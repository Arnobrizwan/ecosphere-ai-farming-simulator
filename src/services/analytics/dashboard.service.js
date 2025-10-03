import { db } from '../firebase.config';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

/**
 * Dashboard Service (UC45) - View farm dashboard
 */
export class DashboardService {
  constructor(userId) {
    this.userId = userId;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.cachedDashboard = null;
    this.lastCacheTime = 0;
  }

  async getDashboard() {
    // Check cache
    if (this.cachedDashboard && (Date.now() - this.lastCacheTime) < this.cacheTimeout) {
      return this.cachedDashboard;
    }

    // Gather KPIs from all systems
    const [cropHealth, weather, tasks, livestock, operations] = await Promise.all([
      this.getCropHealthKPI(),
      this.getWeatherKPI(),
      this.getTasksKPI(),
      this.getLivestockKPI(),
      this.getOperationsKPI()
    ]);

    // Get map data
    const map = await this.getMapData();

    const dashboard = {
      userId: this.userId,
      timestamp: Date.now(),
      kpis: {
        cropHealth,
        weather,
        tasks,
        livestock,
        operations
      },
      map
    };

    // Cache dashboard
    this.cachedDashboard = dashboard;
    this.lastCacheTime = Date.now();

    return dashboard;
  }

  async getCropHealthKPI() {
    // Would integrate with UC43
    return {
      overall: 78,
      alerts: 2,
      trend: 'up',
      details: {
        excellent: 5,
        good: 8,
        fair: 3,
        poor: 1
      }
    };
  }

  async getWeatherKPI() {
    // Would integrate with UC15/UC40
    return {
      current: {
        temperature: 28,
        humidity: 65,
        conditions: 'Partly Cloudy'
      },
      alerts: 1,
      forecast: {
        today: { high: 32, low: 24, rain: 20 },
        tomorrow: { high: 31, low: 23, rain: 10 }
      }
    };
  }

  async getTasksKPI() {
    // Would integrate with UC22
    const tasksCollection = collection(db, 'tasks');
    const q = query(
      tasksCollection,
      where('userId', '==', this.userId),
      where('status', 'in', ['pending', 'in_progress', 'completed']),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => doc.data());

    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      overdue: tasks.filter(t => t.status === 'pending' && t.dueDate < Date.now()).length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length
    };
  }

  async getLivestockKPI() {
    // Would integrate with UC56-UC63
    return {
      totalAnimals: 45,
      healthAlerts: 3,
      feedStatus: 'adequate',
      breakdown: {
        cattle: 20,
        sheep: 15,
        goat: 10
      }
    };
  }

  async getOperationsKPI() {
    // Would integrate with UC44
    return {
      upcoming: 5,
      inProgress: 2,
      completionRate: 85,
      nextOperation: {
        type: 'harvest',
        date: Date.now() + (3 * 24 * 60 * 60 * 1000)
      }
    };
  }

  async getMapData() {
    // Get plots, devices, and alerts for map visualization
    return {
      plots: [
        { id: 'plot_1', name: 'North Field', health: 85, lat: 23.8103, lng: 90.4125 },
        { id: 'plot_2', name: 'South Field', health: 72, lat: 23.8093, lng: 90.4135 }
      ],
      devices: [
        { id: 'device_1', type: 'soil_moisture', status: 'online', lat: 23.8103, lng: 90.4125 },
        { id: 'device_2', type: 'weather_station', status: 'online', lat: 23.8098, lng: 90.4130 }
      ],
      alerts: [
        { id: 'alert_1', type: 'low_moisture', severity: 'medium', lat: 23.8093, lng: 90.4135 }
      ]
    };
  }

  async drillDown(module) {
    // Navigate to detailed view of specific module
    const drillDownData = {
      cropHealth: () => this.getCropHealthDetails(),
      weather: () => this.getWeatherDetails(),
      tasks: () => this.getTasksDetails(),
      livestock: () => this.getLivestockDetails(),
      operations: () => this.getOperationsDetails()
    };

    const handler = drillDownData[module];
    return handler ? await handler() : null;
  }

  async getCropHealthDetails() {
    // Would fetch from UC43
    return {
      plots: [
        { id: 'plot_1', health: 85, ndvi: 0.7, issues: [] },
        { id: 'plot_2', health: 72, ndvi: 0.6, issues: ['low_moisture'] }
      ]
    };
  }

  async getWeatherDetails() {
    return {
      current: await this.getWeatherKPI(),
      forecast: Array(7).fill(null).map((_, i) => ({
        date: Date.now() + (i * 24 * 60 * 60 * 1000),
        high: 30 + Math.random() * 5,
        low: 22 + Math.random() * 3,
        rain: Math.random() * 100
      }))
    };
  }

  async getTasksDetails() {
    const tasksCollection = collection(db, 'tasks');
    const q = query(
      tasksCollection,
      where('userId', '==', this.userId),
      orderBy('dueDate', 'asc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getLivestockDetails() {
    return {
      animals: await this.getLivestockKPI(),
      recentAlerts: [],
      feedSchedule: []
    };
  }

  async getOperationsDetails() {
    return {
      upcoming: [],
      history: [],
      performance: {}
    };
  }

  clearCache() {
    this.cachedDashboard = null;
    this.lastCacheTime = 0;
  }
}

export default DashboardService;
