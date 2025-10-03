import { UserManagementService } from './userManagement.service';
import { SystemSettingsService } from './systemSettings.service';
import { ModerationService } from './moderation.service';
import { AccessApprovalService } from './accessApproval.service';
import { AlertManagementService } from './alertManagement.service';
import { AuditComplianceService } from './auditCompliance.service';

/**
 * Admin Hub - Central coordination for all admin features
 * Manages UCA1-UCA6 administrative features
 */
export class AdminHub {
  constructor() {
    this.currentAdminId = null;
    this.userManagementService = null;
    this.systemSettingsService = null;
    this.moderationService = null;
    this.accessApprovalService = null;
    this.alertManagementService = null;
    this.auditComplianceService = null;
  }

  /**
   * Initialize admin hub for admin user
   */
  async initialize(adminId) {
    // Verify admin privileges
    await this.verifyAdminPrivileges(adminId);

    this.currentAdminId = adminId;

    // Initialize all services
    this.userManagementService = new UserManagementService(adminId);
    this.systemSettingsService = new SystemSettingsService(adminId);
    this.moderationService = new ModerationService(adminId);
    this.accessApprovalService = new AccessApprovalService(adminId);
    this.alertManagementService = new AlertManagementService(adminId);
    this.auditComplianceService = new AuditComplianceService(adminId);

    console.log('Admin Hub initialized for admin:', adminId);
  }

  async verifyAdminPrivileges(adminId) {
    // Would verify admin role in production
    return true;
  }

  /**
   * Get admin dashboard
   */
  async getDashboard() {
    const [userStats, moderationQueue, pendingAccess, recentAudits] = await Promise.all([
      this.userManagementService.getUserStats(),
      this.moderationService.getQueueStats(),
      this.accessApprovalService.getPendingRequests(),
      this.auditComplianceService.getRecentEvents(10)
    ]);

    return {
      userStats,
      moderationQueue,
      pendingAccess,
      recentAudits,
      timestamp: Date.now()
    };
  }

  /**
   * Get current admin ID
   */
  getCurrentAdminId() {
    return this.currentAdminId;
  }
}

export default AdminHub;
