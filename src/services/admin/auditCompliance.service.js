import { db, storage } from '../firebase.config';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Audit & Compliance Service (UCA6) - Audit & compliance reports
 */
export class AuditComplianceService {
  constructor(adminId) {
    this.adminId = adminId;
    this.auditCollection = collection(db, 'audit_events');
    this.reportsCollection = collection(db, 'compliance_reports');
  }

  async generateReport(reportConfig) {
    const { timeframe, scope, format = 'pdf' } = reportConfig;

    // Gather audit events
    const events = await this.getAuditEvents(timeframe, scope);

    // Aggregate data
    const aggregated = this.aggregateEvents(events);

    // Detect anomalies
    const anomalies = this.detectAnomalies(events);

    // Generate report content
    const content = {
      title: 'Audit & Compliance Report',
      timeframe,
      scope,
      generatedAt: Date.now(),
      generatedBy: this.adminId,
      summary: {
        totalEvents: events.length,
        byAction: this.groupBy(events, 'action'),
        byResource: this.groupBy(events, 'resource'),
        bySeverity: this.groupBy(events, 'severity')
      },
      anomalies,
      events: events.slice(0, 100) // Include sample
    };

    // Format report
    const formatted = await this.formatReport(content, format);

    // Upload to storage
    const url = await this.uploadReport(formatted, format);

    // Calculate integrity hash
    const integrityHash = this.calculateHash(formatted);

    return {
      url,
      format,
      integrityHash,
      content
    };
  }

  async getAuditEvents(timeframe, scope) {
    const { start, end } = timeframe;

    let q = query(
      this.auditCollection,
      where('timestamp', '>=', start),
      where('timestamp', '<=', end),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    let events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by scope
    if (scope && scope.length > 0) {
      events = events.filter(e => scope.includes(e.resource));
    }

    return events;
  }

  aggregateEvents(events) {
    return {
      total: events.length,
      byAction: this.groupBy(events, 'action'),
      byResource: this.groupBy(events, 'resource'),
      bySeverity: this.groupBy(events, 'severity'),
      byUser: this.groupBy(events, 'userId')
    };
  }

  detectAnomalies(events) {
    const anomalies = [];

    // Detect unusual activity patterns
    const userActivity = this.groupBy(events, 'userId');

    Object.entries(userActivity).forEach(([userId, userEvents]) => {
      // High activity
      if (userEvents.length > 100) {
        anomalies.push({
          type: 'high_activity',
          userId,
          eventCount: userEvents.length,
          severity: 'medium'
        });
      }

      // Failed actions
      const failures = userEvents.filter(e => e.outcome === 'failure');
      if (failures.length > 10) {
        anomalies.push({
          type: 'multiple_failures',
          userId,
          failureCount: failures.length,
          severity: 'high'
        });
      }
    });

    return anomalies;
  }

  async formatReport(content, format) {
    switch (format) {
      case 'pdf':
        return this.formatAsPDF(content);
      case 'csv':
        return this.formatAsCSV(content);
      default:
        return JSON.stringify(content, null, 2);
    }
  }

  formatAsPDF(content) {
    // Would use jsPDF or similar
    return btoa(JSON.stringify(content));
  }

  formatAsCSV(content) {
    let csv = 'Timestamp,User,Action,Resource,Outcome,Severity\n';
    
    content.events.forEach(event => {
      csv += `${event.timestamp},${event.userId},${event.action},${event.resource},${event.outcome},${event.severity}\n`;
    });

    return csv;
  }

  async uploadReport(formatted, format) {
    const extension = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'json';
    const fileName = `compliance/${this.adminId}/${Date.now()}_audit_report.${extension}`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, formatted, format === 'pdf' ? 'base64' : 'raw');
    
    return await getDownloadURL(storageRef);
  }

  calculateHash(content) {
    // Simple hash for demonstration
    return btoa(content).substring(0, 32);
  }

  async getRecentEvents(count = 10) {
    const q = query(
      this.auditCollection,
      orderBy('timestamp', 'desc'),
      limit(count)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async exportLogs(exportConfig) {
    const { timeframe, format = 'csv' } = exportConfig;

    const events = await this.getAuditEvents(timeframe, []);

    const formatted = format === 'csv' 
      ? this.formatAsCSV({ events })
      : JSON.stringify(events, null, 2);

    const url = await this.uploadReport(formatted, format);

    return { url, format, eventCount: events.length };
  }

  async scheduleReport(scheduleConfig) {
    const { frequency, recipients, scope } = scheduleConfig;

    // Would create scheduled job
    console.log(`Scheduling ${frequency} report for:`, recipients);

    return {
      scheduled: true,
      frequency,
      recipients
    };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const value = item[key];
      (result[value] = result[value] || []).push(item);
      return result;
    }, {});
  }
}

export default AuditComplianceService;
