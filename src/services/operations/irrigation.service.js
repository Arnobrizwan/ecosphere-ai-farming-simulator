/**
 * UC42 - Irrigation Schedule Service
 * Plan irrigation using NASA SMAP soil moisture + POWER forecast
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { analyzeSMAPMoisture } from '../satellite/satelliteVisualization.service';
import axios from 'axios';
export class IrrigationService {
  constructor(userId) {
    this.userId = userId;
    this.schedulesCollection = collection(db, 'irrigation_schedules');
  }

  async generateSchedule(config) {
    const {
      plotId,
      startDate,
      duration = 30,
      method = 'drip'
    } = config;

    // Get soil moisture data (UC14)
    const soilMoisture = await this.getSoilMoisture(plotId);

    // Get weather forecast (UC15)
    const forecast = await this.getWeatherForecast(plotId);

    // Generate schedule
    const schedule = this.calculateSchedule(
      startDate,
      duration,
      method,
      soilMoisture,
      forecast
    );

    const irrigationSchedule = {
      userId: this.userId,
      plotId,
      schedule,
      triggers: this.generateTriggers(soilMoisture),
      waterSource: 'main',
      status: 'draft',
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.schedulesCollection, irrigationSchedule);

    return {
      id: docRef.id,
      ...irrigationSchedule
    };
  }

  calculateSchedule(startDate, duration, method, soilMoisture, forecast) {
    const schedule = [];
    const msPerDay = 24 * 60 * 60 * 1000;

    for (let day = 0; day < duration; day++) {
      const date = startDate + (day * msPerDay);
      const dayForecast = forecast[day] || {};

      // Skip if rain expected
      if (dayForecast.rainfall > 10) continue;

      // Calculate irrigation need
      const need = this.calculateIrrigationNeed(soilMoisture, dayForecast);

      if (need > 0) {
        schedule.push({
          date,
          time: '06:00',
          duration: need,
          volume: this.calculateVolume(need, method),
          method,
          automated: true
        });
      }
    }

    return schedule;
  }

  calculateIrrigationNeed(soilMoisture, forecast) {
    // soilMoisture in cm³/cm³ (0-1), convert to percentage
    const currentMoisture = (soilMoisture || 0.25) * 100;
    const targetMoisture = 30; // 30% for most crops
    const deficit = targetMoisture - currentMoisture;

    // Factor in evapotranspiration
    const et = forecast.evapotranspiration || 5;
    const adjustedDeficit = deficit + (et / 10); // Add ET to deficit

    // Calculate irrigation duration (minutes)
    if (adjustedDeficit > 10) return 60;
    if (adjustedDeficit > 5) return 30;
    if (adjustedDeficit > 2) return 15;
    return 0;
  }

  calculateVolume(duration, method) {
    const flowRates = {
      drip: 4, // L/min
      sprinkler: 10,
      flood: 20
    };

    return duration * (flowRates[method] || 4);
  }

  generateTriggers(soilMoisture) {
    return [
      {
        type: 'soil_moisture',
        threshold: 40,
        action: 'irrigate'
      },
      {
        type: 'weather',
        threshold: 0,
        action: 'skip_if_rain'
      }
    ];
  }

  async confirmSchedule(scheduleId) {
    const scheduleRef = doc(db, 'irrigation_schedules', scheduleId);
    await updateDoc(scheduleRef, {
      status: 'active'
    });

    // Create tasks (UC22 integration)
    await this.createIrrigationTasks(scheduleId);

    return { confirmed: true, scheduleId };
  }

  async createIrrigationTasks(scheduleId) {
    // Would integrate with UC22 Task Automation
    console.log('Creating irrigation tasks for schedule:', scheduleId);
  }

  async editSchedule(scheduleId, updates) {
    const scheduleRef = doc(db, 'irrigation_schedules', scheduleId);
    await updateDoc(scheduleRef, {
      ...updates,
      updatedAt: Date.now()
    });

    return { updated: true, scheduleId };
  }

  async getTodaySchedule() {
    const today = new Date().setHours(0, 0, 0, 0);
    const tomorrow = today + (24 * 60 * 60 * 1000);

    const q = query(
      this.schedulesCollection,
      where('userId', '==', this.userId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const schedules = snapshot.docs.map(doc => doc.data());

    // Filter for today's schedule
    const todaySchedule = [];
    schedules.forEach(schedule => {
      schedule.schedule.forEach(item => {
        if (item.date >= today && item.date < tomorrow) {
          todaySchedule.push(item);
        }
      });
    });

    return todaySchedule;
  }

  async getSoilMoisture(plotId) {
    // UC14 integration - SMAP soil moisture analysis
    try {
      const plot = await getDoc(doc(db, 'farm_plots', plotId));
      if (!plot.exists()) {
        return 0.25; // Default 25% moisture
      }

      const plotData = plot.data();
      const smapAnalysis = await analyzeSMAPMoisture(
        plotData.location,
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      );

      if (smapAnalysis.success && smapAnalysis.statistics) {
        return smapAnalysis.statistics.mean; // Returns cm³/cm³ (0-1 range)
      }

      return 0.25;
    } catch (error) {
      console.error('[Irrigation] SMAP fetch failed:', error);
      return 0.25;
    }
  }

  async getWeatherForecast(plotId) {
    // UC15/UC40 integration - NASA POWER forecast
    try {
      const plot = await getDoc(doc(db, 'farm_plots', plotId));
      if (!plot.exists()) {
        return Array(30).fill({ rainfall: 0, temperature: 28 });
      }

      const plotData = plot.data();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
      const startDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

      const response = await axios.get('https://power.larc.nasa.gov/api/temporal/daily/point', {
        params: {
          parameters: 'T2M,PRECTOTCORR,RH2M',
          community: 'ag',
          latitude: plotData.location.latitude,
          longitude: plotData.location.longitude,
          start: startDate,
          end: endDate,
          format: 'json'
        }
      });

      const params = response.data?.properties?.parameter || {};
      const temps = Object.values(params.T2M || {});
      const rainfall = Object.values(params.PRECTOTCORR || {});
      const humidity = Object.values(params.RH2M || {});

      return temps.map((temp, i) => ({
        rainfall: rainfall[i] || 0,
        temperature: temp,
        humidity: humidity[i] || 70,
        evapotranspiration: this.calculateET(temp, humidity[i] || 70)
      }));
    } catch (error) {
      console.error('[Irrigation] NASA POWER fetch failed:', error);
      return Array(30).fill({ rainfall: 0, temperature: 28, humidity: 70, evapotranspiration: 5 });
    }
  }

  calculateET(temp, humidity) {
    // Simplified Penman-Monteith ET calculation
    return (0.0023 * (temp + 17.8) * Math.sqrt(100 - humidity)) * 1.5;
  }
}

export default IrrigationService;
