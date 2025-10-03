import { db } from '../firebase.config';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Yield Service (UC33) - Track yield improvements
 */
export class YieldService {
  constructor(userId) {
    this.userId = userId;
    this.yieldsCollection = collection(db, 'yield_entries');
    this.baselinesCollection = collection(db, 'yield_baselines');
  }

  /**
   * Record yield data
   */
  async recordYield(yieldData) {
    const {
      plotId,
      cropType,
      season,
      harvestDate,
      yield: yieldAmount,
      unit = 'kg',
      area,
      quality = 'A',
      notes = ''
    } = yieldData;

    // Validate units
    if (!this.validateUnit(unit)) {
      throw new Error('Invalid unit. Use kg, tons, or bushels');
    }

    // Convert to standard unit (kg)
    const standardYield = this.convertToKg(yieldAmount, unit);
    const yieldPerHectare = area > 0 ? standardYield / area : 0;

    const entry = {
      userId: this.userId,
      plotId,
      cropType,
      season,
      harvestDate,
      yield: standardYield,
      originalYield: yieldAmount,
      unit,
      yieldPerHectare,
      area,
      quality,
      notes,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.yieldsCollection, entry);

    return {
      id: docRef.id,
      ...entry
    };
  }

  /**
   * Validate unit
   */
  validateUnit(unit) {
    return ['kg', 'tons', 'bushels'].includes(unit);
  }

  /**
   * Convert to kg
   */
  convertToKg(amount, unit) {
    const conversions = {
      kg: 1,
      tons: 1000,
      bushels: 27.2 // Average for wheat
    };

    return amount * (conversions[unit] || 1);
  }

  /**
   * Get yield trends
   */
  async getYieldTrends(options = {}) {
    const { plotId, cropType, period = '5y' } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    let q = query(
      this.yieldsCollection,
      where('userId', '==', this.userId),
      where('harvestDate', '>=', cutoff),
      orderBy('harvestDate', 'asc')
    );

    if (plotId) {
      q = query(q, where('plotId', '==', plotId));
    }

    if (cropType) {
      q = query(q, where('cropType', '==', cropType));
    }

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate trends
    return this.calculateTrends(entries);
  }

  /**
   * Calculate trends
   */
  calculateTrends(entries) {
    if (entries.length === 0) {
      return {
        entries: [],
        average: 0,
        trend: 'stable',
        improvement: 0
      };
    }

    const average = entries.reduce((sum, e) => sum + e.yieldPerHectare, 0) / entries.length;

    // Calculate trend using linear regression
    const trend = this.calculateLinearTrend(entries.map(e => e.yieldPerHectare));

    // Calculate improvement from first to last
    const first = entries[0].yieldPerHectare;
    const last = entries[entries.length - 1].yieldPerHectare;
    const improvement = first > 0 ? ((last - first) / first) * 100 : 0;

    return {
      entries,
      average: Math.round(average),
      trend: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
      improvement: Math.round(improvement * 10) / 10,
      trendSlope: trend
    };
  }

  /**
   * Calculate linear trend
   */
  calculateLinearTrend(values) {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Get baseline
   */
  async getBaseline(plotId, cropType) {
    const q = query(
      this.baselinesCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      where('cropType', '==', cropType)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Calculate baseline from first 3 harvests
      return this.calculateInitialBaseline(plotId, cropType);
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }

  /**
   * Calculate initial baseline
   */
  async calculateInitialBaseline(plotId, cropType) {
    const q = query(
      this.yieldsCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      where('cropType', '==', cropType),
      orderBy('harvestDate', 'asc')
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.slice(0, 3).map(doc => doc.data());

    if (entries.length === 0) return null;

    const avgYield = entries.reduce((sum, e) => sum + e.yieldPerHectare, 0) / entries.length;

    const baseline = {
      userId: this.userId,
      plotId,
      cropType,
      baselineYield: avgYield,
      calculatedFrom: entries.length,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.baselinesCollection, baseline);

    return {
      id: docRef.id,
      ...baseline
    };
  }

  /**
   * Get summary
   */
  async getSummary(options = {}) {
    const { period = '1y', plots = [] } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    let q = query(
      this.yieldsCollection,
      where('userId', '==', this.userId),
      where('harvestDate', '>=', cutoff),
      orderBy('harvestDate', 'desc')
    );

    const snapshot = await getDocs(q);
    let entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (plots.length > 0) {
      entries = entries.filter(e => plots.includes(e.plotId));
    }

    if (entries.length === 0) {
      return {
        totalYield: 0,
        averageYield: 0,
        improvement: null,
        entries: []
      };
    }

    const totalYield = entries.reduce((sum, e) => sum + e.yield, 0);
    const averageYield = entries.reduce((sum, e) => sum + e.yieldPerHectare, 0) / entries.length;

    // Get baseline for comparison
    const firstEntry = entries[entries.length - 1];
    const baseline = await this.getBaseline(firstEntry.plotId, firstEntry.cropType);

    let improvement = null;
    if (baseline) {
      const currentAvg = averageYield;
      const baselineAvg = baseline.baselineYield;
      const improvementPercent = ((currentAvg - baselineAvg) / baselineAvg) * 100;

      improvement = {
        current: Math.round(currentAvg),
        baseline: Math.round(baselineAvg),
        absolute: Math.round(currentAvg - baselineAvg),
        percentage: Math.round(improvementPercent * 10) / 10
      };
    }

    return {
      totalYield: Math.round(totalYield),
      averageYield: Math.round(averageYield),
      improvement,
      entries: entries.slice(0, 10)
    };
  }

  /**
   * Get plot metrics
   */
  async getPlotMetrics(plotId, period = '1y') {
    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.yieldsCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      where('harvestDate', '>=', cutoff),
      orderBy('harvestDate', 'asc')
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (entries.length === 0) return null;

    const trends = this.calculateTrends(entries);
    const baseline = await this.getBaseline(plotId, entries[0].cropType);

    return {
      plotId,
      period,
      ...trends,
      baseline: baseline?.baselineYield || null
    };
  }

  /**
   * Parse period to milliseconds
   */
  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = {
      'd': 86400000,
      'w': 604800000,
      'm': 2592000000,
      'y': 31536000000
    };
    return value * (multipliers[unit] || multipliers.y);
  }
}

export default YieldService;
