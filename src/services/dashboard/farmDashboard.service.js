/**
 * UC45 - Farm Dashboard Service
 * Key status cards, maps, and KPIs consuming outputs from UC13-44
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getActiveAlerts } from '../operations/weatherAlerts.service';
import { getLearningProgress } from '../game/progress.service';
import CropHealthService from '../operations/cropHealth.service';
import { fetchSatelliteLayers } from '../satellite/satelliteVisualization.service';

/**
 * Load complete dashboard data
 */
export const loadDashboard = async (userId, farmId) => {
  try {
    // Parallel data fetching for performance
    const [
      farmInfo,
      weatherAlerts,
      cropHealth,
      upcomingTasks,
      learningProgress,
      satelliteStatus,
      recentOperations,
    ] = await Promise.all([
      getFarmInfo(farmId),
      getActiveAlerts(userId),
      getOverallCropHealth(userId),
      getUpcomingTasks(userId),
      getLearningProgress(userId),
      getSatelliteStatus(userId, farmId),
      getRecentOperations(userId),
    ]);

    // Compute KPIs
    const kpis = {
      farmHealth: cropHealth.averageHealth || 0,
      activeAlerts: weatherAlerts.alerts?.length || 0,
      tasksToday: upcomingTasks.filter(t => isToday(t.scheduledDate)).length,
      learningLevel: learningProgress.progress?.level || 0,
      operationsCompleted: recentOperations.completedThisWeek || 0,
    };

    // Build dashboard cards
    const cards = [
      buildWeatherCard(weatherAlerts, satelliteStatus),
      buildHealthCard(cropHealth),
      buildTasksCard(upcomingTasks),
      buildLearningCard(learningProgress),
      buildSatelliteCard(satelliteStatus),
    ];

    return {
      success: true,
      kpis,
      cards,
      farmInfo,
      quickActions: buildQuickActions(kpis, weatherAlerts, upcomingTasks),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Dashboard] Load failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get farm information
 */
async function getFarmInfo(farmId) {
  const docRef = doc(db, 'farms', farmId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return {
      name: 'My Farm',
      location: { latitude: 23.81, longitude: 90.41 },
      area: 2.5,
      unit: 'hectares',
    };
  }

  return docSnap.data();
}

/**
 * Get overall crop health
 */
async function getOverallCropHealth(userId) {
  const healthService = new CropHealthService(userId);
  return await healthService.getOverallHealth();
}

/**
 * Get upcoming tasks
 */
async function getUpcomingTasks(userId) {
  const tasksRef = collection(db, 'operation_tasks');
  const q = query(
    tasksRef,
    where('userId', '==', userId),
    where('status', 'in', ['pending', 'in_progress']),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get satellite status
 */
async function getSatelliteStatus(userId, farmId) {
  try {
    const farm = await getFarmInfo(farmId);
    const { latitude, longitude } = farm.location;

    const layers = await fetchSatelliteLayers(
      {
        minLat: latitude - 0.05,
        maxLat: latitude + 0.05,
        minLon: longitude - 0.05,
        maxLon: longitude + 0.05,
      },
      {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
      ['smap', 'ndvi']
    );

    return {
      success: layers.success,
      smap: layers.layers?.smap?.length > 0 ? layers.layers.smap[0] : null,
      ndvi: layers.layers?.ndvi || null,
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Dashboard] Satellite status failed:', error);
    return { success: false };
  }
}

/**
 * Get recent operations
 */
async function getRecentOperations(userId) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  const opsRef = collection(db, 'farm_operations');
  const q = query(
    opsRef,
    where('userId', '==', userId),
    where('createdAt', '>=', oneWeekAgo),
    where('status', '==', 'completed')
  );
  const snapshot = await getDocs(q);

  return {
    completedThisWeek: snapshot.size,
    operations: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
  };
}

/**
 * Build weather card
 */
function buildWeatherCard(weatherAlerts, satelliteStatus) {
  const hasAlerts = weatherAlerts.alerts && weatherAlerts.alerts.length > 0;
  
  return {
    id: 'weather',
    title: 'Weather & Alerts',
    icon: '🌦️',
    priority: hasAlerts ? 'high' : 'normal',
    data: {
      alerts: weatherAlerts.alerts || [],
      temperature: satelliteStatus.success ? '28°C' : 'N/A',
      condition: hasAlerts ? weatherAlerts.alerts[0].type : 'clear',
    },
    action: {
      label: hasAlerts ? 'View Alerts' : 'Check Forecast',
      route: 'WeatherAlerts',
    },
  };
}

/**
 * Build health card
 */
function buildHealthCard(cropHealth) {
  const status = cropHealth.status || 'unknown';
  const healthScore = cropHealth.averageHealth || 0;
  
  return {
    id: 'health',
    title: 'Crop Health',
    icon: status === 'good' ? '🌱' : status === 'fair' ? '⚠️' : '🔴',
    priority: status === 'poor' ? 'high' : 'normal',
    data: {
      score: healthScore,
      status,
      anomalies: cropHealth.anomalies || 0,
    },
    action: {
      label: 'View Details',
      route: 'CropHealth',
    },
  };
}

/**
 * Build tasks card
 */
function buildTasksCard(tasks) {
  const today = tasks.filter(t => isToday(t.createdAt));
  const overdue = tasks.filter(t => t.scheduledDate && t.scheduledDate < Date.now());
  
  return {
    id: 'tasks',
    title: 'Tasks & Operations',
    icon: '✅',
    priority: overdue.length > 0 ? 'high' : 'normal',
    data: {
      today: today.length,
      upcoming: tasks.length,
      overdue: overdue.length,
    },
    action: {
      label: 'View Tasks',
      route: 'Operations',
    },
  };
}

/**
 * Build learning card
 */
function buildLearningCard(learningProgress) {
  const progress = learningProgress.progress || {};
  
  return {
    id: 'learning',
    title: 'Learning Progress',
    icon: '🎓',
    priority: 'normal',
    data: {
      level: progress.level || 0,
      xp: progress.totalXP || 0,
      streak: progress.streak?.current || 0,
      badges: progress.badgeCount || 0,
    },
    action: {
      label: 'Continue Learning',
      route: 'Campaign',
    },
  };
}

/**
 * Build satellite card
 */
function buildSatelliteCard(satelliteStatus) {
  return {
    id: 'satellite',
    title: 'Satellite Data',
    icon: '🛰️',
    priority: 'normal',
    data: {
      soilMoisture: satelliteStatus.smap ? `${(satelliteStatus.smap.soilMoisture * 100).toFixed(1)}%` : 'N/A',
      ndvi: satelliteStatus.ndvi ? satelliteStatus.ndvi.mean.toFixed(2) : 'N/A',
      lastUpdate: satelliteStatus.lastUpdate,
    },
    action: {
      label: 'View Insights',
      route: 'SatelliteData',
    },
  };
}

/**
 * Build quick actions based on current state
 */
function buildQuickActions(kpis, weatherAlerts, tasks) {
  const actions = [];

  // High priority alerts
  if (kpis.activeAlerts > 0) {
    actions.push({
      id: 'alerts',
      label: `${kpis.activeAlerts} Weather Alert${kpis.activeAlerts > 1 ? 's' : ''}`,
      icon: '⚠️',
      priority: 'high',
      route: 'WeatherAlerts',
    });
  }

  // Poor health
  if (kpis.farmHealth < 50) {
    actions.push({
      id: 'health',
      label: 'Check Crop Health',
      icon: '🔴',
      priority: 'high',
      route: 'CropHealth',
    });
  }

  // Tasks today
  if (kpis.tasksToday > 0) {
    actions.push({
      id: 'tasks',
      label: `${kpis.tasksToday} Task${kpis.tasksToday > 1 ? 's' : ''} Today`,
      icon: '✅',
      priority: 'medium',
      route: 'Operations',
    });
  }

  // Default actions
  actions.push({
    id: 'satellite',
    label: 'View Satellite Data',
    icon: '🛰️',
    priority: 'normal',
    route: 'SatelliteData',
  });

  actions.push({
    id: 'irrigation',
    label: 'Plan Irrigation',
    icon: '💧',
    priority: 'normal',
    route: 'Irrigation',
  });

  return actions.slice(0, 5); // Max 5 quick actions
}

/**
 * Drill down to specific module
 */
export const drillDown = async (userId, cardId) => {
  const routes = {
    weather: 'WeatherAlerts',
    health: 'CropHealth',
    tasks: 'Operations',
    learning: 'Campaign',
    satellite: 'SatelliteData',
  };

  return {
    success: true,
    route: routes[cardId] || 'Dashboard',
  };
};

/**
 * Helper: Check if timestamp is today
 */
function isToday(timestamp) {
  const today = new Date().setHours(0, 0, 0, 0);
  const date = new Date(timestamp).setHours(0, 0, 0, 0);
  return today === date;
}
