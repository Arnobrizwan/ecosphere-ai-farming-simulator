import { db, storage } from '../firebase.config';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Cost Service (UC35) - Calculate cost reductions
 */
export class CostService {
  constructor(userId) {
    this.userId = userId;
    this.costsCollection = collection(db, 'cost_entries');
    this.baselinesCollection = collection(db, 'cost_baselines');
    this.categories = ['inputs', 'labor', 'energy', 'equipment', 'other'];
  }

  /**
   * Record cost
   */
  async recordCost(costData) {
    const {
      category,
      subcategory = '',
      amount,
      currency = 'USD',
      date = Date.now(),
      plotId = null,
      description = '',
      receipt = null
    } = costData;

    if (!this.categories.includes(category)) {
      throw new Error(`Invalid category. Use: ${this.categories.join(', ')}`);
    }

    let receiptUrl = null;
    if (receipt) {
      receiptUrl = await this.uploadReceipt(receipt);
    }

    const entry = {
      userId: this.userId,
      category,
      subcategory,
      amount,
      currency,
      date,
      plotId,
      description,
      receipt: receiptUrl,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.costsCollection, entry);

    return {
      id: docRef.id,
      ...entry
    };
  }

  /**
   * Upload receipt
   */
  async uploadReceipt(receiptFile) {
    const fileName = `receipts/${this.userId}/${Date.now()}_${receiptFile.name}`;
    const storageRef = ref(storage, fileName);

    try {
      const response = await fetch(receiptFile.uri || receiptFile.url);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);

      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Receipt upload failed:', error);
      return null;
    }
  }

  /**
   * Calculate reduction
   */
  async calculateReduction(options = {}) {
    const { period = '1y', category = null } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    let q = query(
      this.costsCollection,
      where('userId', '==', this.userId),
      where('date', '>=', cutoff),
      orderBy('date', 'asc')
    );

    if (category) {
      q = query(q, where('category', '==', category));
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
        reduction: 0,
        percentage: 0
      };
    }

    // Calculate current costs
    const currentTotal = entries.reduce((sum, e) => sum + e.amount, 0);

    // Get baseline
    const baseline = await this.getBaseline(category);
    const baselineTotal = baseline?.baselineCost || currentTotal * 1.2; // Assume 20% more if no baseline

    // Calculate reduction
    const reduction = baselineTotal - currentTotal;
    const percentage = baselineTotal > 0 ? (reduction / baselineTotal) * 100 : 0;

    return {
      current: Math.round(currentTotal * 100) / 100,
      baseline: Math.round(baselineTotal * 100) / 100,
      reduction: Math.round(reduction * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
      currency: entries[0]?.currency || 'USD'
    };
  }

  /**
   * Get baseline
   */
  async getBaseline(category = null) {
    let q = query(
      this.baselinesCollection,
      where('userId', '==', this.userId)
    );

    if (category) {
      q = query(q, where('category', '==', category));
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return this.calculateInitialBaseline(category);
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }

  /**
   * Calculate initial baseline
   */
  async calculateInitialBaseline(category = null) {
    let q = query(
      this.costsCollection,
      where('userId', '==', this.userId),
      orderBy('date', 'asc')
    );

    if (category) {
      q = query(q, where('category', '==', category));
    }

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.slice(0, 12).map(doc => doc.data()); // First 12 entries

    if (entries.length === 0) return null;

    const avgCost = entries.reduce((sum, e) => sum + e.amount, 0) / entries.length;

    const baseline = {
      userId: this.userId,
      category,
      baselineCost: avgCost,
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
      this.costsCollection,
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
        totalCost: 0,
        breakdown: {},
        reduction: null,
        entries: []
      };
    }

    const totalCost = entries.reduce((sum, e) => sum + e.amount, 0);

    // Calculate breakdown by category
    const breakdown = {};
    this.categories.forEach(cat => {
      const catEntries = entries.filter(e => e.category === cat);
      breakdown[cat] = catEntries.reduce((sum, e) => sum + e.amount, 0);
    });

    const reduction = await this.calculateReduction({ period });

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      breakdown,
      reduction: reduction.reduction > 0 ? reduction : null,
      entries: entries.slice(0, 10),
      currency: entries[0]?.currency || 'USD'
    };
  }

  /**
   * Get plot metrics
   */
  async getPlotMetrics(plotId, period = '1y') {
    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.costsCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      where('date', '>=', cutoff)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => doc.data());

    if (entries.length === 0) return null;

    const totalCost = entries.reduce((sum, e) => sum + e.amount, 0);

    return {
      plotId,
      period,
      totalCost: Math.round(totalCost * 100) / 100,
      entryCount: entries.length
    };
  }

  /**
   * Calculate ROI
   */
  async calculateROI(options = {}) {
    const { period = '1y', revenue = 0 } = options;

    const summary = await this.getSummary({ period });
    const totalCost = summary.totalCost;

    if (totalCost === 0) return 0;

    const profit = revenue - totalCost;
    const roi = (profit / totalCost) * 100;

    return {
      revenue,
      cost: totalCost,
      profit,
      roi: Math.round(roi * 10) / 10,
      roiRating: roi > 50 ? 'Excellent' : roi > 25 ? 'Good' : roi > 0 ? 'Fair' : 'Loss'
    };
  }

  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = { 'd': 86400000, 'w': 604800000, 'm': 2592000000, 'y': 31536000000 };
    return value * (multipliers[unit] || multipliers.y);
  }
}

export default CostService;
