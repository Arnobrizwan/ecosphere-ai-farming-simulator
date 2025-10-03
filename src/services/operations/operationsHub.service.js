import { PlantingGuideService } from './plantingGuide.service';
import { WeatherAlertService } from './weatherAlert.service';
import { NewsService } from './news.service';
import { IrrigationService } from './irrigation.service';
import { CropHealthService } from './cropHealth.service';
import { FarmOperationsService } from './farmOperations.service';

/**
 * Operations Hub - Central coordination for all farm operations
 * Manages UC39-UC44 operations features
 */
export class OperationsHub {
  constructor() {
    this.currentUserId = null;
    this.plantingGuideService = null;
    this.weatherAlertService = null;
    this.newsService = null;
    this.irrigationService = null;
    this.cropHealthService = null;
    this.farmOperationsService = null;
  }

  /**
   * Initialize operations hub for user
   */
  async initialize(userId) {
    this.currentUserId = userId;

    // Initialize all services
    this.plantingGuideService = new PlantingGuideService(userId);
    this.weatherAlertService = new WeatherAlertService(userId);
    this.newsService = new NewsService(userId);
    this.irrigationService = new IrrigationService(userId);
    this.cropHealthService = new CropHealthService(userId);
    this.farmOperationsService = new FarmOperationsService(userId);

    console.log('Operations Hub initialized for user:', userId);
  }

  /**
   * Get dashboard overview
   */
  async getDashboard() {
    const [alerts, health, operations, schedule] = await Promise.all([
      this.weatherAlertService.getActiveAlerts(),
      this.cropHealthService.getOverallHealth(),
      this.farmOperationsService.getUpcomingOperations(),
      this.irrigationService.getTodaySchedule()
    ]);

    return {
      alerts,
      health,
      operations,
      irrigation: schedule,
      timestamp: Date.now()
    };
  }

  /**
   * Get recommendations for today
   */
  async getTodayRecommendations() {
    const recommendations = [];

    // Check weather alerts
    const alerts = await this.weatherAlertService.getActiveAlerts();
    if (alerts.length > 0) {
      recommendations.push({
        type: 'weather_alert',
        priority: 'high',
        message: `${alerts.length} active weather alert(s)`,
        action: 'view_alerts'
      });
    }

    // Check crop health
    const health = await this.cropHealthService.getOverallHealth();
    if (health.anomalies > 0) {
      recommendations.push({
        type: 'health_issue',
        priority: 'high',
        message: `${health.anomalies} crop health anomalies detected`,
        action: 'view_health'
      });
    }

    // Check irrigation schedule
    const irrigation = await this.irrigationService.getTodaySchedule();
    if (irrigation.length > 0) {
      recommendations.push({
        type: 'irrigation',
        priority: 'medium',
        message: `${irrigation.length} irrigation task(s) scheduled today`,
        action: 'view_schedule'
      });
    }

    // Check operations
    const operations = await this.farmOperationsService.getUpcomingOperations();
    if (operations.length > 0) {
      recommendations.push({
        type: 'operation',
        priority: 'medium',
        message: `${operations.length} operation(s) coming up`,
        action: 'view_operations'
      });
    }

    return recommendations;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    return this.currentUserId;
  }
}

export default OperationsHub;
