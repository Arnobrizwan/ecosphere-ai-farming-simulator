/**
 * UC43 - Crop Health Monitoring Service
 * Aggregate NDVI/LST/IoT + link to UC21/UC24 for action
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { trackNDVI, checkLandsatTemperature } from '../satellite/satelliteVisualization.service';
export class CropHealthService {
  constructor(userId) {
    this.userId = userId;
    this.healthCollection = collection(db, 'crop_health');
  }

  async getHealthStatus(plotId) {
    // Aggregate data from multiple sources
    const [ndvi, lst, iotData] = await Promise.all([
      this.getNDVIData(plotId),
      this.getLSTData(plotId),
      this.getIoTData(plotId)
    ]);

    const indices = {
      ndvi: ndvi.value,
      lst: lst.value,
      moisture: iotData.moisture,
      stress: this.calculateStressIndex(ndvi.value, lst.value)
    };

    const healthScore = this.calculateHealthScore(indices);
    const anomalies = this.detectAnomalies(indices);

    const healthRecord = {
      userId: this.userId,
      plotId,
      cropType: 'rice', // Would be fetched from plot data
      date: Date.now(),
      indices,
      iotData,
      healthScore,
      anomalies,
      alerts: this.generateAlerts(anomalies),
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.healthCollection, healthRecord);

    return {
      id: docRef.id,
      ...healthRecord
    };
  }

  calculateStressIndex(ndvi, lst) {
    // Simplified stress calculation
    const ndviStress = ndvi < 0.4 ? (0.4 - ndvi) * 100 : 0;
    const tempStress = lst > 35 ? (lst - 35) * 2 : 0;
    return Math.min(100, ndviStress + tempStress);
  }

  calculateHealthScore(indices) {
    let score = 50;

    // NDVI contribution (0-30 points)
    if (indices.ndvi > 0.6) score += 30;
    else if (indices.ndvi > 0.4) score += 20;
    else if (indices.ndvi > 0.2) score += 10;

    // Temperature contribution (0-20 points)
    if (indices.lst >= 20 && indices.lst <= 30) score += 20;
    else if (indices.lst >= 15 && indices.lst <= 35) score += 10;

    // Moisture contribution (0-30 points)
    if (indices.moisture >= 40 && indices.moisture <= 60) score += 30;
    else if (indices.moisture >= 30 && indices.moisture <= 70) score += 20;
    else if (indices.moisture >= 20 && indices.moisture <= 80) score += 10;

    // Stress penalty
    score -= indices.stress * 0.2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  detectAnomalies(indices) {
    const anomalies = [];

    if (indices.ndvi < 0.3) {
      anomalies.push({
        type: 'low_ndvi',
        severity: 'high',
        location: { ndvi: indices.ndvi },
        recommendation: 'Check for disease or nutrient deficiency'
      });
    }

    if (indices.lst > 35) {
      anomalies.push({
        type: 'heat_stress',
        severity: 'medium',
        location: { temperature: indices.lst },
        recommendation: 'Increase irrigation frequency'
      });
    }

    if (indices.moisture < 30) {
      anomalies.push({
        type: 'water_stress',
        severity: 'high',
        location: { moisture: indices.moisture },
        recommendation: 'Immediate irrigation required'
      });
    }

    if (indices.stress > 50) {
      anomalies.push({
        type: 'high_stress',
        severity: 'high',
        location: { stress: indices.stress },
        recommendation: 'Multiple stress factors detected - investigate'
      });
    }

    return anomalies;
  }

  generateAlerts(anomalies) {
    return anomalies
      .filter(a => a.severity === 'high')
      .map(a => a.recommendation);
  }

  async getHealthTrends(options = {}) {
    const { plotId, period = '30d' } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.healthCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      where('date', '>=', cutoff),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      records,
      trend: this.calculateTrend(records),
      averageHealth: this.calculateAverage(records)
    };
  }

  calculateTrend(records) {
    if (records.length < 2) return 'stable';

    const first = records[0].healthScore;
    const last = records[records.length - 1].healthScore;
    const change = last - first;

    if (change > 10) return 'improving';
    if (change < -10) return 'declining';
    return 'stable';
  }

  calculateAverage(records) {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, r) => acc + r.healthScore, 0);
    return Math.round(sum / records.length);
  }

  async getOverallHealth() {
    const q = query(
      this.healthCollection,
      where('userId', '==', this.userId),
      orderBy('date', 'desc'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => doc.data());

    const avgHealth = this.calculateAverage(records);
    const totalAnomalies = records.reduce((sum, r) => sum + r.anomalies.length, 0);

    return {
      averageHealth: avgHealth,
      anomalies: totalAnomalies,
      status: avgHealth > 70 ? 'good' : avgHealth > 50 ? 'fair' : 'poor'
    };
  }

  async getNDVIData(plotId) {
    // UC13 integration - MODIS NDVI
    try {
      const plot = await getDoc(doc(db, 'farm_plots', plotId));
      if (!plot.exists()) {
        return { value: 0.5, timestamp: Date.now(), source: 'estimated' };
      }

      const plotData = plot.data();
      const ndviResult = await trackNDVI(
        plotData.location,
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      );

      if (ndviResult.success && ndviResult.ndvi) {
        return {
          value: ndviResult.ndvi.mean,
          min: ndviResult.ndvi.min,
          max: ndviResult.ndvi.max,
          trend: ndviResult.trend,
          timestamp: Date.now(),
          source: 'NASA MODIS'
        };
      }

      return { value: 0.5, timestamp: Date.now(), source: 'fallback' };
    } catch (error) {
      console.error('[CropHealth] NDVI fetch failed:', error);
      return { value: 0.5, timestamp: Date.now(), source: 'error' };
    }
  }

  async getLSTData(plotId) {
    // UC13/UC17 integration - Landsat LST
    try {
      const plot = await getDoc(doc(db, 'farm_plots', plotId));
      if (!plot.exists()) {
        return { value: 28, timestamp: Date.now(), source: 'estimated' };
      }

      const plotData = plot.data();
      const lstResult = await checkLandsatTemperature(
        plotData.location,
        {
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      );

      if (lstResult.success && lstResult.insights) {
        return {
          value: lstResult.insights.avgTemp,
          max: lstResult.insights.maxTemp,
          heatStress: lstResult.heatStress || [],
          timestamp: Date.now(),
          source: 'NASA Landsat'
        };
      }

      return { value: 28, timestamp: Date.now(), source: 'fallback' };
    } catch (error) {
      console.error('[CropHealth] LST fetch failed:', error);
      return { value: 28, timestamp: Date.now(), source: 'error' };
    }
  }

  async getIoTData(plotId) {
    // Would integrate with UC23 IoT devices
    return {
      temperature: 28,
      humidity: 65,
      moisture: 55,
      soilPH: 6.5
    };
  }

  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = { 'd': 86400000, 'w': 604800000, 'm': 2592000000 };
    return value * (multipliers[unit] || multipliers.d);
  }
}

export default CropHealthService;
