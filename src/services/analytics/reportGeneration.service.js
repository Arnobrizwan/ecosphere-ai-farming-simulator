import { db, storage } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Report Generation Service (UC48) - Generate analytics reports
 */
export class ReportGenerationService {
  constructor(userId) {
    this.userId = userId;
    this.reportsCollection = collection(db, 'analytics_reports');
  }

  async createReport(reportConfig) {
    const report = {
      userId: this.userId,
      title: reportConfig.title,
      type: reportConfig.type || 'custom',
      format: reportConfig.format || 'pdf',
      content: reportConfig.content || {},
      recipients: reportConfig.recipients || [],
      schedule: reportConfig.schedule || { frequency: 'once' },
      createdAt: Date.now(),
      lastGenerated: null
    };

    const docRef = await addDoc(this.reportsCollection, report);

    return {
      id: docRef.id,
      ...report
    };
  }

  async generateReport(reportId) {
    const report = await this.getReport(reportId);
    if (!report) return null;

    // Generate report content based on type
    const content = await this.generateContent(report);

    // Format based on requested format
    const formatted = await this.formatReport(content, report.format);

    // Upload to storage
    const url = await this.uploadReport(formatted, report);

    // Update report
    const reportRef = doc(db, 'analytics_reports', reportId);
    await updateDoc(reportRef, {
      lastGenerated: Date.now(),
      url
    });

    return {
      reportId,
      url,
      format: report.format
    };
  }

  async generateContent(report) {
    const content = {
      title: report.title,
      generatedAt: Date.now(),
      sections: []
    };

    // Add views
    if (report.content.views) {
      for (const viewId of report.content.views) {
        const viewData = await this.getViewData(viewId);
        content.sections.push({
          type: 'view',
          data: viewData
        });
      }
    }

    // Add charts
    if (report.content.charts) {
      content.sections.push({
        type: 'charts',
        data: report.content.charts
      });
    }

    // Add tables
    if (report.content.tables) {
      content.sections.push({
        type: 'tables',
        data: report.content.tables
      });
    }

    // Add summary
    if (report.content.summary) {
      content.sections.push({
        type: 'summary',
        data: report.content.summary
      });
    }

    return content;
  }

  async formatReport(content, format) {
    switch (format) {
      case 'pdf':
        return this.formatAsPDF(content);
      case 'excel':
        return this.formatAsExcel(content);
      case 'csv':
        return this.formatAsCSV(content);
      case 'json':
        return JSON.stringify(content, null, 2);
      default:
        return JSON.stringify(content);
    }
  }

  formatAsPDF(content) {
    // Would use jsPDF or similar
    return btoa(JSON.stringify(content));
  }

  formatAsExcel(content) {
    // Would use ExcelJS or similar
    return btoa(JSON.stringify(content));
  }

  formatAsCSV(content) {
    let csv = 'Section,Type,Data\n';
    content.sections.forEach((section, i) => {
      csv += `Section ${i + 1},${section.type},${JSON.stringify(section.data)}\n`;
    });
    return csv;
  }

  async uploadReport(formatted, report) {
    const extension = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
      json: 'json'
    }[report.format] || 'txt';

    const fileName = `reports/${this.userId}/${Date.now()}_${report.title}.${extension}`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, formatted, report.format === 'pdf' ? 'base64' : 'raw');
    return await getDownloadURL(storageRef);
  }

  async generateAndSend(reportId) {
    const result = await this.generateReport(reportId);
    const report = await this.getReport(reportId);

    // Send to recipients
    if (report.recipients.length > 0) {
      await this.sendReport(result.url, report.recipients, report.title);
    }

    return result;
  }

  async sendReport(url, recipients, title) {
    // Would integrate with email service
    console.log(`Sending report "${title}" to:`, recipients);
    console.log('Report URL:', url);

    // Mock email sending
    return {
      sent: true,
      recipients,
      timestamp: Date.now()
    };
  }

  async scheduleReport(reportId, schedule) {
    const reportRef = doc(db, 'analytics_reports', reportId);
    
    const nextRun = this.calculateNextRun(schedule);

    await updateDoc(reportRef, {
      schedule: {
        ...schedule,
        nextRun
      }
    });

    return {
      scheduled: true,
      nextRun
    };
  }

  calculateNextRun(schedule) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    switch (schedule.frequency) {
      case 'daily':
        return now + day;
      case 'weekly':
        return now + (7 * day);
      case 'monthly':
        return now + (30 * day);
      default:
        return null;
    }
  }

  async getReport(reportId) {
    const reports = await this.getUserReports();
    return reports.find(r => r.id === reportId);
  }

  async getUserReports() {
    const q = query(
      this.reportsCollection,
      where('userId', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getViewData(viewId) {
    // Would fetch from performance analytics service
    return {
      viewId,
      data: []
    };
  }
}

export default ReportGenerationService;
