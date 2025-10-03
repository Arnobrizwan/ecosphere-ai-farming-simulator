import { db } from '../firebase.config';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

/**
 * Water Service (UC34) - Monitor water savings
 */
export class WaterService {
  constructor(userId) {
    this.userId = userId;
    this.waterUsageCollection = collection(db, 'water_usage');
    this.baselinesCollection = collection(db, 'water_baselines');
  }

  /**
   * Log water usage
   */
  async logWaterUsage(usageData) {
    const {
      plotId,
      date = Date.now(),
      volume, // liters
      method = 'manual',
      source = 'manual',
      cost = 0,
      area = 1
    } = usageData;

    const volumePerHectare = volume / area;

    const entry = {
      userId: this.userId,
      plotId,
      date,
      volume,
      method,
      source,
      cost,
      area,
      volumePerHectare,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.waterUsageCollection, entry);

    return {
      id: docRef.id,
      ...entry
    };
  }

  /**
   * Calculate savings
   */
  async calculateSavings(options = {}) {
    const { plotId, period = '1y' } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    let q = query(
      this.waterUsageCollection,
      where('userId', '==', this.userId),
      where('date', '>=', cutoff),
      orderBy('date', 'asc')
    );

    if (plotId) {
      q = query(q, where('plotId', '==', plotId));
    }

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (entries.length === 0) {
      return {
        current: 0,
        baseline: 0,
        savings: 0,
        percentage: 0
      };
    }

    // Calculate current usage
    const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);
    const totalArea = entries.reduce((sum, e) => sum + e.area, 0);
    const currentUsage = totalArea > 0 ? totalVolume / totalArea : 0;

    // Get baseline
    const baseline = await this.getBaseline(plotId);
    const baselineUsage = baseline?.baselineUsage || currentUsage * 1.3; // Assume 30% more if no baseline

    // Calculate savings
    const savings = baselineUsage - currentUsage;
    const percentage = baselineUsage > 0 ? (savings / baselineUsage) * 100 : 0;

    // Calculate cost savings
    const avgCostPerLiter = entries.reduce((sum, e) => sum + (e.cost / e.volume), 0) / entries.length;
    const costSavings = savings * avgCostPerLiter;

    return {
      current: Math.round(currentUsage),
      baseline: Math.round(baselineUsage),
      savings: Math.round(savings),
      percentage: Math.round(percentage * 10) / 10,
      costSavings: Math.round(costSavings * 100) / 100,
      unit: 'L/ha'
    };
  }

  /**
   * Get baseline
   */
  async getBaseline(plotId) {
    let q = query(
      this.baselinesCollection,
      where('userId', '==', this.userId)
    );

    if (plotId) {
      q = query(q, where('plotId', '==', plotId));
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return this.calculateInitialBaseline(plotId);
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }

  /**
   * Calculate initial baseline
   */
  async calculateInitialBaseline(plotId) {
    let q = query(
      this.waterUsageCollection,
      where('userId', '==', this.userId),
      orderBy('date', 'asc')
    );

    if (plotId) {
      q = query(q, where('plotId', '==', plotId));
    }

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.slice(0, 10).map(doc => doc.data());

    if (entries.length === 0) return null;

    const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);
    const totalArea = entries.reduce((sum, e) => sum + e.area, 0);
    const avgUsage = totalArea > 0 ? totalVolume / totalArea : 0;

    const baseline = {
      userId: this.userId,
      plotId,
      baselineUsage: avgUsage,
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
      this.waterUsageCollection,
      where('userId', '==', this.userId),
      where('date', '>=', cutoff),
      orderBy('date', 'desc')
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
        totalVolume: 0,
        averageUsage: 0,
        savings: null,
        entries: []
      };
    }

    const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);
    const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);

    const savings = await this.calculateSavings({ period });

    return {
      totalVolume: Math.round(totalVolume),
      totalCost: Math.round(totalCost * 100) / 100,
      averageUsage: savings.current,
      savings: savings.savings > 0 ? savings : null,
      entries: entries.slice(0, 10)
    };
  }

  /**
   * Get plot metrics
   */
  async getPlotMetrics(plotId, period = '1y') {
    const savings = await this.calculateSavings({ plotId, period });
    
    return {
      plotId,
      period,
      ...savings
    };
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics(plotId, period = '1y') {
    // This would integrate with yield data to calculate L/kg
    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.waterUsageCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      where('date', '>=', cutoff)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => doc.data());

    if (entries.length === 0) return null;

    const totalWater = entries.reduce((sum, e) => sum + e.volume, 0);

    return {
      totalWater,
      efficiency: 'Requires yield data for calculation',
      unit: 'L/kg'
    };
  }

  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = { 'd': 86400000, 'w': 604800000, 'm': 2592000000, 'y': 31536000000 };
    return value * (multipliers[unit] || multipliers.y);
  }
}

export default WaterService;
