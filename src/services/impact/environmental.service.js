import { db } from '../firebase.config';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

/**
 * Environmental Service (UC36) - Measure environmental benefits
 */
export class EnvironmentalService {
  constructor(userId) {
    this.userId = userId;
    this.indicatorsCollection = collection(db, 'environmental_indicators');
  }

  /**
   * Record environmental indicators
   */
  async recordIndicators(indicatorData) {
    const {
      plotId,
      date = Date.now(),
      indicators,
      source = 'manual'
    } = indicatorData;

    // Calculate overall score
    const score = this.calculateEnvironmentalScore(indicators);

    const entry = {
      userId: this.userId,
      plotId,
      date,
      indicators: {
        soilHealth: indicators.soilHealth || {},
        carbon: indicators.carbon || {},
        biodiversity: indicators.biodiversity || {},
        waterQuality: indicators.waterQuality || {}
      },
      score,
      source,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.indicatorsCollection, entry);

    return {
      id: docRef.id,
      ...entry
    };
  }

  /**
   * Calculate environmental score (0-100)
   */
  calculateEnvironmentalScore(indicators) {
    let totalScore = 0;
    let componentCount = 0;

    // Soil health score (0-100)
    if (indicators.soilHealth) {
      const soilScore = this.calculateSoilHealthScore(indicators.soilHealth);
      totalScore += soilScore;
      componentCount++;
    }

    // Carbon score (0-100)
    if (indicators.carbon) {
      const carbonScore = this.calculateCarbonScore(indicators.carbon);
      totalScore += carbonScore;
      componentCount++;
    }

    // Biodiversity score (0-100)
    if (indicators.biodiversity) {
      const bioScore = this.calculateBiodiversityScore(indicators.biodiversity);
      totalScore += bioScore;
      componentCount++;
    }

    // Water quality score (0-100)
    if (indicators.waterQuality) {
      const waterScore = this.calculateWaterQualityScore(indicators.waterQuality);
      totalScore += waterScore;
      componentCount++;
    }

    return componentCount > 0 ? Math.round(totalScore / componentCount) : 50;
  }

  /**
   * Calculate soil health score
   */
  calculateSoilHealthScore(soilHealth) {
    let score = 50; // Base score

    // Organic matter (optimal: 3-5%)
    if (soilHealth.organicMatter) {
      if (soilHealth.organicMatter >= 3 && soilHealth.organicMatter <= 5) {
        score += 15;
      } else if (soilHealth.organicMatter >= 2 && soilHealth.organicMatter <= 6) {
        score += 10;
      } else {
        score += 5;
      }
    }

    // pH (optimal: 6.0-7.5)
    if (soilHealth.pH) {
      if (soilHealth.pH >= 6.0 && soilHealth.pH <= 7.5) {
        score += 15;
      } else if (soilHealth.pH >= 5.5 && soilHealth.pH <= 8.0) {
        score += 10;
      } else {
        score += 5;
      }
    }

    // Nutrients (NPK)
    if (soilHealth.nitrogen && soilHealth.phosphorus && soilHealth.potassium) {
      const nScore = this.normalizeNutrient(soilHealth.nitrogen, 40, 60);
      const pScore = this.normalizeNutrient(soilHealth.phosphorus, 20, 40);
      const kScore = this.normalizeNutrient(soilHealth.potassium, 150, 250);
      score += (nScore + pScore + kScore) / 3 * 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Normalize nutrient value
   */
  normalizeNutrient(value, optimalMin, optimalMax) {
    if (value >= optimalMin && value <= optimalMax) return 1.0;
    if (value < optimalMin) return value / optimalMin;
    return optimalMax / value;
  }

  /**
   * Calculate carbon score
   */
  calculateCarbonScore(carbon) {
    let score = 50;

    // Carbon sequestered (positive impact)
    if (carbon.sequestered) {
      score += Math.min(30, carbon.sequestered * 10);
    }

    // Emissions (negative impact)
    if (carbon.emissions) {
      score -= Math.min(30, carbon.emissions * 10);
    }

    // Net carbon balance
    const netCarbon = (carbon.sequestered || 0) - (carbon.emissions || 0);
    if (netCarbon > 0) {
      score += 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate biodiversity score
   */
  calculateBiodiversityScore(biodiversity) {
    let score = 50;

    // Species count
    if (biodiversity.speciesCount) {
      score += Math.min(25, biodiversity.speciesCount * 2);
    }

    // Habitat quality (0-1 scale)
    if (biodiversity.habitatQuality) {
      score += biodiversity.habitatQuality * 25;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate water quality score
   */
  calculateWaterQualityScore(waterQuality) {
    let score = 50;

    // pH (optimal: 6.5-8.5)
    if (waterQuality.pH) {
      if (waterQuality.pH >= 6.5 && waterQuality.pH <= 8.5) {
        score += 25;
      } else {
        score += 10;
      }
    }

    // Contaminants (lower is better)
    if (waterQuality.contaminants !== undefined) {
      score += Math.max(0, 25 - waterQuality.contaminants * 5);
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get summary
   */
  async getSummary(options = {}) {
    const { period = '1y', plots = [] } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    let q = query(
      this.indicatorsCollection,
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
        score: 50,
        trend: 'stable',
        improvement: 0,
        entries: []
      };
    }

    const averageScore = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;

    // Calculate trend
    const firstScore = entries[entries.length - 1].score;
    const lastScore = entries[0].score;
    const improvement = lastScore - firstScore;

    return {
      score: Math.round(averageScore),
      trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
      improvement: Math.round(improvement),
      entries: entries.slice(0, 10)
    };
  }

  /**
   * Get plot metrics
   */
  async getPlotMetrics(plotId, period = '1y') {
    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.indicatorsCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      where('date', '>=', cutoff),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (entries.length === 0) return null;

    const averageScore = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;

    return {
      plotId,
      period,
      score: Math.round(averageScore),
      entryCount: entries.length,
      latestEntry: entries[0]
    };
  }

  /**
   * Calculate score
   */
  async calculateScore(plotId) {
    const q = query(
      this.indicatorsCollection,
      where('userId', '==', this.userId),
      where('plotId', '==', plotId),
      orderBy('date', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 50;

    return snapshot.docs[0].data().score;
  }

  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = { 'd': 86400000, 'w': 604800000, 'm': 2592000000, 'y': 31536000000 };
    return value * (multipliers[unit] || multipliers.y);
  }
}

export default EnvironmentalService;
