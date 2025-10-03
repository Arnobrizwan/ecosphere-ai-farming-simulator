/**
 * UC47 - Progress Tracking Service
 * Visualize long-term improvements (yield, water, cost, badges)
 */

import { db } from '../firebase.config';
import { getLearningProgress } from '../game/progress.service';
export class ProgressTrackingService {
  constructor(userId) {
    this.userId = userId;
  }

  async getProgress(options = {}) {
    const { timeframe } = options;

    const [yieldProgress, waterProgress, costProgress, learningProgress] = await Promise.all([
      this.getYieldProgress(timeframe),
      this.getWaterProgress(timeframe),
      this.getCostProgress(timeframe),
      this.getLearningProgress(timeframe)
    ]);

    const milestones = await this.getMilestones(timeframe);
    const targets = await this.getTargets();

    return {
      userId: this.userId,
      timeframe,
      metrics: {
        yield: yieldProgress,
        water: waterProgress,
        cost: costProgress,
        learning: learningProgress
      },
      milestones,
      targets
    };
  }

  async getYieldProgress(timeframe) {
    const operations = await db
      .collection('farm_operations')
      .where('userId', '==', this.userId)
      .where('type', '==', 'harvest')
      .where('completedDate', '>=', timeframe.start)
      .where('completedDate', '<=', timeframe.end)
      .orderBy('completedDate', 'asc')
      .get();

    const yields = operations.docs.map(doc => ({
      date: doc.data().completedDate,
      value: doc.data().actualYield || 0,
    }));

    const baseline = yields[0]?.value || 3000;
    const current = yields[yields.length - 1]?.value || baseline;
    const improvement = current - baseline;
    const improvementPercent = baseline > 0 ? ((improvement / baseline) * 100).toFixed(1) : 0;

    return {
      baseline,
      current,
      improvement,
      improvementPercent,
      trend: yields.map(y => y.value),
      dates: yields.map(y => y.date),
    };
  }

  async getWaterProgress(timeframe) {
    // Would integrate with UC34
    return {
      baseline: 1000,
      current: 700,
      savings: 300,
      savingsPercent: 30,
      trend: [1000, 950, 900, 850, 750, 700]
    };
  }

  async getCostProgress(timeframe) {
    // Would integrate with UC35
    return {
      baseline: 5000,
      current: 3500,
      reduction: 1500,
      reductionPercent: 30,
      trend: [5000, 4800, 4500, 4200, 3800, 3500]
    };
  }

  async getLearningProgress(timeframe) {
    // UC10 integration - Learning progress
    const learningData = await getLearningProgress(this.userId);
    const progress = learningData.progress || {};

    // Get historical XP trend
    const history = await db
      .collection('user_activities')
      .where('userId', '==', this.userId)
      .where('timestamp', '>=', new Date(timeframe.start).toISOString())
      .where('timestamp', '<=', new Date(timeframe.end).toISOString())
      .orderBy('timestamp', 'asc')
      .get();

    let cumulativeXP = 0;
    const xpTrend = history.docs.map(doc => {
      cumulativeXP += doc.data().xp || 0;
      return cumulativeXP;
    });

    return {
      badges: progress.badgeCount || 0,
      achievements: progress.completedMissions?.length || 0,
      skillLevel: progress.level || 0,
      xp: progress.totalXP || 0,
      trend: xpTrend.length > 0 ? xpTrend : [0],
      streak: progress.streak?.current || 0,
    };
  }

  async getMilestones(timeframe) {
    return [
      {
        id: 'milestone_1',
        title: 'First Harvest',
        date: timeframe.start + (30 * 24 * 60 * 60 * 1000),
        achieved: true
      },
      {
        id: 'milestone_2',
        title: '50% Water Savings',
        date: timeframe.start + (90 * 24 * 60 * 60 * 1000),
        achieved: false
      }
    ];
  }

  async getTargets() {
    return [
      {
        metric: 'yield',
        target: 5000,
        current: 4500,
        progress: 90
      },
      {
        metric: 'water_savings',
        target: 40,
        current: 30,
        progress: 75
      },
      {
        metric: 'cost_reduction',
        target: 35,
        current: 30,
        progress: 86
      }
    ];
  }

  async getQuickProgress() {
    const timeframe = {
      start: Date.now() - (365 * 24 * 60 * 60 * 1000),
      end: Date.now()
    };

    return this.getProgress({ timeframe });
  }

  async generateProgressReport() {
    const progress = await this.getQuickProgress();

    return {
      title: 'Annual Progress Report',
      period: progress.timeframe,
      summary: {
        yieldImprovement: `${progress.metrics.yield.improvementPercent}%`,
        waterSavings: `${progress.metrics.water.savingsPercent}%`,
        costReduction: `${progress.metrics.cost.reductionPercent}%`,
        badgesEarned: progress.metrics.learning.badges
      },
      details: progress,
      generatedAt: Date.now()
    };
  }

  async compareWithPeers(metric) {
    // Compare user's progress with peer averages
    return {
      user: 4500,
      peerAverage: 4000,
      percentile: 75,
      ranking: 'Above Average'
    };
  }
}

export default ProgressTrackingService;
