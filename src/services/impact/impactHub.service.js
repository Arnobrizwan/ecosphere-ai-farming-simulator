import { YieldService } from './yield.service';
import { WaterService } from './water.service';
import { CostService } from './cost.service';
import { EnvironmentalService } from './environmental.service';
import { ReportService } from './report.service';
import { VerificationService } from './verification.service';

/**
 * Impact Hub - Central coordination for all impact measurement
 * Manages UC33-UC38 impact tracking and reporting
 */
export class ImpactHub {
  constructor() {
    this.currentUserId = null;
    this.yieldService = null;
    this.waterService = null;
    this.costService = null;
    this.environmentalService = null;
    this.reportService = null;
    this.verificationService = null;
  }

  /**
   * Initialize impact hub for user
   */
  async initialize(userId) {
    this.currentUserId = userId;

    // Initialize all services
    this.yieldService = new YieldService(userId);
    this.waterService = new WaterService(userId);
    this.costService = new CostService(userId);
    this.environmentalService = new EnvironmentalService(userId);
    this.reportService = new ReportService(userId);
    this.verificationService = new VerificationService(userId);

    console.log('Impact Hub initialized for user:', userId);
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(options = {}) {
    const { period = '1y', plots = [] } = options;

    const [yieldData, waterData, costData, envData] = await Promise.all([
      this.yieldService.getSummary({ period, plots }),
      this.waterService.getSummary({ period, plots }),
      this.costService.getSummary({ period, plots }),
      this.environmentalService.getSummary({ period, plots })
    ]);

    return {
      yield: yieldData,
      water: waterData,
      cost: costData,
      environmental: envData,
      period,
      plots
    };
  }

  /**
   * Get all metrics for a specific plot
   */
  async getPlotMetrics(plotId, period = '1y') {
    const [yieldMetrics, waterMetrics, costMetrics, envMetrics] = await Promise.all([
      this.yieldService.getPlotMetrics(plotId, period),
      this.waterService.getPlotMetrics(plotId, period),
      this.costService.getPlotMetrics(plotId, period),
      this.environmentalService.getPlotMetrics(plotId, period)
    ]);

    return {
      plotId,
      period,
      yield: yieldMetrics,
      water: waterMetrics,
      cost: costMetrics,
      environmental: envMetrics
    };
  }

  /**
   * Calculate overall impact score
   */
  async calculateImpactScore(options = {}) {
    const { period = '1y', plots = [] } = options;

    const dashboard = await this.getDashboard({ period, plots });

    // Weight different metrics
    const weights = {
      yield: 0.30,
      water: 0.25,
      cost: 0.25,
      environmental: 0.20
    };

    const scores = {
      yield: this.normalizeYieldScore(dashboard.yield),
      water: this.normalizeWaterScore(dashboard.water),
      cost: this.normalizeCostScore(dashboard.cost),
      environmental: dashboard.environmental.score || 50
    };

    const overallScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key] * weight);
    }, 0);

    return {
      overall: Math.round(overallScore),
      breakdown: scores,
      weights,
      rating: this.getScoreRating(overallScore)
    };
  }

  /**
   * Normalize yield improvement to 0-100 score
   */
  normalizeYieldScore(yieldData) {
    if (!yieldData.improvement) return 50;
    
    // 0% improvement = 50, 50%+ improvement = 100
    const percentage = yieldData.improvement.percentage || 0;
    return Math.min(100, 50 + percentage);
  }

  /**
   * Normalize water savings to 0-100 score
   */
  normalizeWaterScore(waterData) {
    if (!waterData.savings) return 50;
    
    // 0% savings = 50, 40%+ savings = 100
    const percentage = waterData.savings.percentage || 0;
    return Math.min(100, 50 + (percentage * 1.25));
  }

  /**
   * Normalize cost reduction to 0-100 score
   */
  normalizeCostScore(costData) {
    if (!costData.reduction) return 50;
    
    // 0% reduction = 50, 40%+ reduction = 100
    const percentage = costData.reduction.percentage || 0;
    return Math.min(100, 50 + (percentage * 1.25));
  }

  /**
   * Get score rating
   */
  getScoreRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 45) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    return this.currentUserId;
  }
}

export default ImpactHub;
