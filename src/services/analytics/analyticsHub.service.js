import { DashboardService } from './dashboard.service';
import { PerformanceAnalyticsService } from './performanceAnalytics.service';
import { ProgressTrackingService } from './progressTracking.service';
import { ReportGenerationService } from './reportGeneration.service';
import { RealTimeMonitoringService } from './realTimeMonitoring.service';

/**
 * Analytics Hub - Central coordination for all analytics and monitoring
 * Manages UC45-UC49 analytics features
 */
export class AnalyticsHub {
  constructor() {
    this.currentUserId = null;
    this.dashboardService = null;
    this.performanceAnalyticsService = null;
    this.progressTrackingService = null;
    this.reportGenerationService = null;
    this.realTimeMonitoringService = null;
  }

  /**
   * Initialize analytics hub for user
   */
  async initialize(userId) {
    this.currentUserId = userId;

    // Initialize all services
    this.dashboardService = new DashboardService(userId);
    this.performanceAnalyticsService = new PerformanceAnalyticsService(userId);
    this.progressTrackingService = new ProgressTrackingService(userId);
    this.reportGenerationService = new ReportGenerationService(userId);
    this.realTimeMonitoringService = new RealTimeMonitoringService(userId);

    console.log('Analytics Hub initialized for user:', userId);
  }

  /**
   * Get complete analytics overview
   */
  async getOverview() {
    const [dashboard, progress, realTimeStatus] = await Promise.all([
      this.dashboardService.getDashboard(),
      this.progressTrackingService.getQuickProgress(),
      this.realTimeMonitoringService.getCurrentStatus()
    ]);

    return {
      dashboard,
      progress,
      realTimeStatus,
      timestamp: Date.now()
    };
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    return this.currentUserId;
  }
}

export default AnalyticsHub;
