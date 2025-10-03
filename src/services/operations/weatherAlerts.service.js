/**
 * UC40 - Weather Alerts Service
 * Push/SMS alerts for weather risks using NASA data
 */

import { db } from '../firebase.config';
import { collection, doc, query, where, getDocs, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import axios from 'axios';

const ALERTS_COLLECTION = 'weather_alerts';
const SUBSCRIPTIONS_COLLECTION = 'alert_subscriptions';

// Alert thresholds
const ALERT_THRESHOLDS = {
  extreme_heat: { temp: 40, severity: 'high' },
  heat_wave: { temp: 35, days: 3, severity: 'medium' },
  heavy_rain: { rainfall: 50, severity: 'high' },
  drought: { rainfall: 2, days: 7, severity: 'high' },
  flood_risk: { rainfall: 100, severity: 'critical' },
  frost: { temp: 5, severity: 'high' },
};

/**
 * Subscribe to weather alerts
 */
export const subscribeToAlerts = async (userId, subscription) => {
  const { location, channels, alertTypes } = subscription;

  await addDoc(collection(db, SUBSCRIPTIONS_COLLECTION), {
    userId,
    location,
    channels: channels || ['app', 'push'], // app, push, sms, email
    alertTypes: alertTypes || Object.keys(ALERT_THRESHOLDS),
    active: true,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    subscription,
  };
};

/**
 * Evaluate forecasts and trigger alerts (scheduler function)
 */
export const evaluateWeatherRisks = async () => {
  const subscriptions = await getDocs(
    query(collection(db, SUBSCRIPTIONS_COLLECTION), where('active', '==', true))
  );

  const alerts = [];

  for (const subDoc of subscriptions.docs) {
    const subscription = subDoc.data();
    
    try {
      // Fetch NASA POWER forecast data
      const forecast = await fetchNASAForecast(subscription.location);
      
      // Check thresholds
      const triggeredAlerts = checkThresholds(forecast, subscription.alertTypes);
      
      for (const alert of triggeredAlerts) {
        // Create alert
        const alertDoc = await createAlert(subscription.userId, alert);
        
        // Deliver via configured channels
        await deliverAlert(subscription, alertDoc);
        
        alerts.push(alertDoc);
      }
    } catch (error) {
      console.error('[WeatherAlerts] Evaluation failed:', error);
    }
  }

  return {
    success: true,
    alertsTriggered: alerts.length,
    alerts,
  };
};

/**
 * Fetch NASA POWER forecast
 */
async function fetchNASAForecast(location) {
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
  const startDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

  try {
    const response = await axios.get('https://power.larc.nasa.gov/api/temporal/daily/point', {
      params: {
        parameters: 'T2M,PRECTOTCORR,T2M_MAX,T2M_MIN,RH2M',
        community: 'ag',
        latitude: location.latitude,
        longitude: location.longitude,
        start: startDate,
        end: endDate,
        format: 'json',
      },
    });

    return response.data?.properties?.parameter || {};
  } catch (error) {
    console.error('[WeatherAlerts] NASA POWER fetch failed:', error);
    throw error;
  }
}

/**
 * Check weather thresholds
 */
function checkThresholds(forecast, alertTypes) {
  const alerts = [];
  const temps = Object.values(forecast.T2M || {});
  const rainfall = Object.values(forecast.PRECTOTCORR || {});

  // Extreme heat
  if (alertTypes.includes('extreme_heat')) {
    const maxTemp = Math.max(...(Object.values(forecast.T2M_MAX || {})));
    if (maxTemp >= ALERT_THRESHOLDS.extreme_heat.temp) {
      alerts.push({
        type: 'extreme_heat',
        severity: ALERT_THRESHOLDS.extreme_heat.severity,
        message: `Extreme heat warning: ${maxTemp.toFixed(1)}°C expected`,
        value: maxTemp,
        recommendation: 'Increase irrigation, provide crop shade, avoid midday fieldwork',
      });
    }
  }

  // Heavy rain
  if (alertTypes.includes('heavy_rain')) {
    const maxRain = Math.max(...rainfall);
    if (maxRain >= ALERT_THRESHOLDS.heavy_rain.rainfall) {
      alerts.push({
        type: 'heavy_rain',
        severity: ALERT_THRESHOLDS.heavy_rain.severity,
        message: `Heavy rainfall warning: ${maxRain.toFixed(1)}mm expected`,
        value: maxRain,
        recommendation: 'Ensure drainage, protect young crops, delay fertilizer application',
      });
    }
  }

  // Drought risk
  if (alertTypes.includes('drought')) {
    const recentRain = rainfall.slice(0, 7);
    const avgRain = recentRain.reduce((a, b) => a + b, 0) / recentRain.length;
    
    if (avgRain < ALERT_THRESHOLDS.drought.rainfall) {
      alerts.push({
        type: 'drought',
        severity: ALERT_THRESHOLDS.drought.severity,
        message: `Drought risk: Low rainfall (${avgRain.toFixed(1)}mm/day average)`,
        value: avgRain,
        recommendation: 'Plan irrigation, mulch soil, prioritize critical crops',
      });
    }
  }

  // Flood risk
  if (alertTypes.includes('flood_risk')) {
    const totalRain = rainfall.reduce((a, b) => a + b, 0);
    if (totalRain >= ALERT_THRESHOLDS.flood_risk.rainfall) {
      alerts.push({
        type: 'flood_risk',
        severity: ALERT_THRESHOLDS.flood_risk.severity,
        message: `Flood risk: ${totalRain.toFixed(1)}mm total rainfall expected`,
        value: totalRain,
        recommendation: 'Clear drainage channels, move equipment to high ground, harvest early if possible',
      });
    }
  }

  return alerts;
}

/**
 * Create alert document
 */
async function createAlert(userId, alertData) {
  const alert = {
    userId,
    ...alertData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const docRef = await addDoc(collection(db, ALERTS_COLLECTION), alert);

  return {
    id: docRef.id,
    ...alert,
  };
}

/**
 * Deliver alert via configured channels
 */
async function deliverAlert(subscription, alert) {
  const deliveryPromises = [];

  // In-app notification
  if (subscription.channels.includes('app')) {
    deliveryPromises.push(
      addDoc(collection(db, 'notifications'), {
        userId: subscription.userId,
        type: 'weather_alert',
        severity: alert.severity,
        title: `Weather Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
        message: alert.message,
        recommendation: alert.recommendation,
        alertId: alert.id,
        read: false,
        createdAt: new Date().toISOString(),
      })
    );
  }

  // Push notification
  if (subscription.channels.includes('push')) {
    deliveryPromises.push(sendPushNotification(subscription.userId, alert));
  }

  // SMS
  if (subscription.channels.includes('sms')) {
    deliveryPromises.push(sendSMS(subscription.userId, alert));
  }

  // Email
  if (subscription.channels.includes('email')) {
    deliveryPromises.push(sendEmail(subscription.userId, alert));
  }

  await Promise.all(deliveryPromises);

  // Update alert status
  await updateDoc(doc(db, ALERTS_COLLECTION, alert.id), {
    status: 'delivered',
    deliveredAt: new Date().toISOString(),
    channels: subscription.channels,
  });

  return {
    success: true,
    channels: subscription.channels,
  };
}

/**
 * Send push notification
 */
async function sendPushNotification(userId, alert) {
  // Integrate with Firebase Cloud Messaging or similar
  console.log(`[Push] Sending to ${userId}:`, alert.message);

  // TODO: Implement actual push notification
  await addDoc(collection(db, 'delivery_logs'), {
    userId,
    alertId: alert.id,
    channel: 'push',
    status: 'sent',
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Send SMS
 */
async function sendSMS(userId, alert) {
  // Integrate with Twilio or similar SMS service
  console.log(`[SMS] Sending to ${userId}:`, alert.message);

  // TODO: Implement actual SMS sending
  await addDoc(collection(db, 'delivery_logs'), {
    userId,
    alertId: alert.id,
    channel: 'sms',
    status: 'sent',
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Send email
 */
async function sendEmail(userId, alert) {
  // Integrate with SendGrid or similar email service
  console.log(`[Email] Sending to ${userId}:`, alert.message);

  // TODO: Implement actual email sending
  await addDoc(collection(db, 'delivery_logs'), {
    userId,
    alertId: alert.id,
    channel: 'email',
    status: 'sent',
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Acknowledge alert
 */
export const acknowledgeAlert = async (userId, alertId) => {
  await updateDoc(doc(db, ALERTS_COLLECTION, alertId), {
    acknowledged: true,
    acknowledgedAt: new Date().toISOString(),
  });

  return {
    success: true,
    alertId,
  };
};

/**
 * Get active alerts for user
 */
export const getActiveAlerts = async (userId) => {
  const now = new Date().toISOString();

  const alerts = await getDocs(
    query(
      collection(db, ALERTS_COLLECTION),
      where('userId', '==', userId),
      where('expiresAt', '>', now),
      where('acknowledged', '==', false),
      orderBy('expiresAt', 'desc'),
      orderBy('severity', 'desc')
    )
  );

  return {
    success: true,
    alerts: alerts.docs.map(doc => ({ id: doc.id, ...doc.data() })),
  };
};
