/**
 * Firebase Cloud Functions
 * UC40: Weather Alert Scheduler
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Weather Alert Scheduler (UC40)
 * Runs every 6 hours to evaluate weather risks
 */
exports.weatherAlertScheduler = functions.pubsub
  .schedule('0 */6 * * *')
  .timeZone('Asia/Dhaka')
  .onRun(async (context) => {
    console.log('[WeatherAlert] Running scheduled evaluation...');

    try {
      // Get all active subscriptions
      const subscriptionsSnapshot = await admin
        .firestore()
        .collection('alert_subscriptions')
        .get();

      console.log(`[WeatherAlert] Found ${subscriptionsSnapshot.size} subscriptions`);

      // Process each subscription
      const promises = subscriptionsSnapshot.docs.map(async (doc) => {
        const subscription = doc.data();
        
        try {
          // Call weather evaluation (would integrate with NASA POWER API)
          await evaluateWeatherForSubscription(subscription);
        } catch (error) {
          console.error(`[WeatherAlert] Failed for user ${subscription.userId}:`, error);
        }
      });

      await Promise.all(promises);

      console.log('[WeatherAlert] Completed evaluation');
      return null;
    } catch (error) {
      console.error('[WeatherAlert] Scheduler error:', error);
      throw error;
    }
  });

/**
 * Evaluate weather for a subscription
 */
async function evaluateWeatherForSubscription(subscription) {
  const { userId, location, alertTypes } = subscription;

  // Mock weather data (in production, fetch from NASA POWER)
  const forecast = {
    temperature: 38,
    precipitation: 5,
  };

  const alerts = [];

  // Check for extreme heat
  if (alertTypes.includes('extreme_heat') && forecast.temperature > 40) {
    alerts.push({
      userId,
      type: 'extreme_heat',
      severity: 'high',
      message: `Extreme heat alert: ${forecast.temperature}°C`,
      recommendation: 'Increase irrigation, provide shade, avoid midday work',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Check for drought
  if (alertTypes.includes('drought') && forecast.precipitation < 2) {
    alerts.push({
      userId,
      type: 'drought',
      severity: 'high',
      message: 'Drought conditions detected',
      recommendation: 'Plan irrigation, mulch soil, prioritize crops',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Store alerts in Firestore
  if (alerts.length > 0) {
    const batch = admin.firestore().batch();

    alerts.forEach((alert) => {
      const ref = admin.firestore().collection('weather_alerts').doc();
      batch.set(ref, alert);
    });

    await batch.commit();

    // Send notifications
    await sendNotifications(userId, alerts, subscription.channels);

    console.log(`[WeatherAlert] Created ${alerts.length} alert(s) for user ${userId}`);
  }
}

/**
 * Send notifications via configured channels
 */
async function sendNotifications(userId, alerts, channels) {
  if (channels.includes('push')) {
    // Send push notification
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (fcmToken) {
      const message = {
        token: fcmToken,
        notification: {
          title: '⚠️ Weather Alert',
          body: alerts[0].message,
        },
        data: {
          type: 'weather_alert',
          alertId: alerts[0].id,
        },
      };

      try {
        await admin.messaging().send(message);
        console.log(`[WeatherAlert] Sent push notification to ${userId}`);
      } catch (error) {
        console.error('[WeatherAlert] Push notification failed:', error);
      }
    }
  }

  if (channels.includes('sms')) {
    // SMS sending would integrate with Twilio
    console.log(`[WeatherAlert] SMS notification skipped (Twilio not configured)`);
  }

  if (channels.includes('email')) {
    // Email sending would integrate with SendGrid
    console.log(`[WeatherAlert] Email notification skipped (SendGrid not configured)`);
  }
}

/**
 * Cleanup old alerts
 * Runs daily to remove acknowledged alerts older than 30 days
 */
exports.cleanupOldAlerts = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Asia/Dhaka')
  .onRun(async (context) => {
    console.log('[Cleanup] Removing old alerts...');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const snapshot = await admin
      .firestore()
      .collection('weather_alerts')
      .where('acknowledged', '==', true)
      .where('timestamp', '<', cutoff.toISOString())
      .get();

    console.log(`[Cleanup] Found ${snapshot.size} old alerts`);

    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('[Cleanup] Cleanup complete');

    return null;
  });
