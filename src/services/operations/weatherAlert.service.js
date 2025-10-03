import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc } from 'firebase/firestore';

/**
 * Weather Alert Service (UC40) - Receive weather alerts
 */
export class WeatherAlertService {
  constructor(userId) {
    this.userId = userId;
    this.alertsCollection = collection(db, 'weather_alerts');
    this.rulesCollection = collection(db, 'alert_rules');
  }

  async configureAlerts(rules) {
    const config = {
      userId: this.userId,
      rules,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.rulesCollection, config);
    return { id: docRef.id, ...config };
  }

  async createAlert(alertData) {
    const {
      type,
      severity,
      message,
      forecast,
      affectedPlots = [],
      channels = ['push']
    } = alertData;

    const alert = {
      userId: this.userId,
      type,
      severity,
      message,
      forecast,
      affectedPlots,
      channels,
      deliveryStatus: {
        push: false,
        sms: false,
        email: false
      },
      acknowledged: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    };

    const docRef = await addDoc(this.alertsCollection, alert);
    const alertId = docRef.id;

    // Deliver alert
    await this.deliverAlert(alertId, alert);

    return { id: alertId, ...alert };
  }

  async deliverAlert(alertId, alert) {
    const deliveryStatus = {};

    for (const channel of alert.channels) {
      try {
        switch (channel) {
          case 'push':
            await this.sendPushNotification(alert);
            deliveryStatus.push = true;
            break;
          case 'sms':
            await this.sendSMS(alert);
            deliveryStatus.sms = true;
            break;
          case 'email':
            await this.sendEmail(alert);
            deliveryStatus.email = true;
            break;
        }
      } catch (error) {
        console.error(`Failed to deliver via ${channel}:`, error);
        deliveryStatus[channel] = false;
      }
    }

    // Update delivery status
    const alertRef = doc(db, 'weather_alerts', alertId);
    await updateDoc(alertRef, { deliveryStatus });

    // Log delivery
    await this.logDelivery(alertId, deliveryStatus);
  }

  async sendPushNotification(alert) {
    // Would integrate with Firebase Cloud Messaging
    console.log('Push notification sent:', alert.message);
    return true;
  }

  async sendSMS(alert) {
    // Would integrate with Twilio or similar
    console.log('SMS sent:', alert.message);
    return true;
  }

  async sendEmail(alert) {
    // Would integrate with SendGrid or similar
    console.log('Email sent:', alert.message);
    return true;
  }

  async logDelivery(alertId, deliveryStatus) {
    // Log to analytics/monitoring
    console.log('Alert delivery logged:', alertId, deliveryStatus);
  }

  async getActiveAlerts() {
    const now = Date.now();
    const q = query(
      this.alertsCollection,
      where('userId', '==', this.userId),
      where('expiresAt', '>', now),
      where('acknowledged', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async acknowledgeAlert(alertId) {
    const alertRef = doc(db, 'weather_alerts', alertId);
    await updateDoc(alertRef, {
      acknowledged: true,
      acknowledgedAt: Date.now()
    });
  }

  async evaluateForecast(forecast) {
    // Evaluate forecast against rules
    const rules = await this.getUserRules();
    const alerts = [];

    if (rules.frost?.enabled && forecast.minTemp < rules.frost.threshold) {
      alerts.push({
        type: 'frost',
        severity: 'high',
        message: `Frost warning: Temperature expected to drop to ${forecast.minTemp}°C`,
        forecast
      });
    }

    if (rules.heavy_rain?.enabled && forecast.rainfall > rules.heavy_rain.threshold) {
      alerts.push({
        type: 'heavy_rain',
        severity: 'medium',
        message: `Heavy rain expected: ${forecast.rainfall}mm in next 24 hours`,
        forecast
      });
    }

    if (rules.drought?.enabled && forecast.dryDays > rules.drought.threshold) {
      alerts.push({
        type: 'drought',
        severity: 'medium',
        message: `Drought conditions: ${forecast.dryDays} days without rain`,
        forecast
      });
    }

    return alerts;
  }

  async getUserRules() {
    const q = query(
      this.rulesCollection,
      where('userId', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? {} : snapshot.docs[0].data().rules;
  }
}

export default WeatherAlertService;
