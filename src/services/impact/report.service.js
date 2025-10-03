import { db, storage } from '../firebase.config';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Report Service (UC37) - Generate impact reports
 */
export class ReportService {
  constructor(userId) {
    this.userId = userId;
    this.reportsCollection = collection(db, 'impact_reports');
  }

  /**
   * Generate comprehensive impact report
   */
  async generateReport(reportConfig) {
    const {
      title,
      period,
      plots = [],
      format = 'pdf',
      includeCharts = true
    } = reportConfig;

    // Import services (would be injected in real implementation)
    const { YieldService } = await import('./yield.service');
    const { WaterService } = await import('./water.service');
    const { CostService } = await import('./cost.service');
    const { EnvironmentalService } = await import('./environmental.service');

    const yieldService = new YieldService(this.userId);
    const waterService = new WaterService(this.userId);
    const costService = new CostService(this.userId);
    const envService = new EnvironmentalService(this.userId);

    // Gather all metrics
    const [yieldData, waterData, costData, envData] = await Promise.all([
      yieldService.getSummary({ period: this.calculatePeriodString(period), plots }),
      waterService.getSummary({ period: this.calculatePeriodString(period), plots }),
      costService.getSummary({ period: this.calculatePeriodString(period), plots }),
      envService.getSummary({ period: this.calculatePeriodString(period), plots })
    ]);

    // Compile metrics
    const metrics = {
      yield: {
        current: yieldData.averageYield,
        baseline: yieldData.improvement?.baseline || 0,
        improvement: yieldData.improvement?.absolute || 0,
        percentage: yieldData.improvement?.percentage || 0
      },
      water: {
        current: waterData.averageUsage,
        baseline: waterData.savings?.baseline || 0,
        savings: waterData.savings?.savings || 0,
        percentage: waterData.savings?.percentage || 0
      },
      cost: {
        current: costData.totalCost,
        baseline: costData.reduction?.baseline || 0,
        reduction: costData.reduction?.reduction || 0,
        percentage: costData.reduction?.percentage || 0
      },
      environmental: {
        score: envData.score,
        improvement: envData.improvement
      }
    };

    // Generate charts if requested
    let charts = [];
    if (includeCharts) {
      charts = this.generateCharts(metrics, yieldData, waterData, costData, envData);
    }

    // Create report document
    const report = {
      userId: this.userId,
      title,
      period,
      plots,
      metrics,
      charts,
      format,
      status: 'generated',
      verificationId: null,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.reportsCollection, report);

    return {
      id: docRef.id,
      ...report
    };
  }

  /**
   * Calculate period string
   */
  calculatePeriodString(period) {
    const duration = period.end - period.start;
    const days = Math.floor(duration / (24 * 60 * 60 * 1000));
    
    if (days >= 365) return `${Math.floor(days / 365)}y`;
    if (days >= 30) return `${Math.floor(days / 30)}m`;
    if (days >= 7) return `${Math.floor(days / 7)}w`;
    return `${days}d`;
  }

  /**
   * Generate charts data
   */
  generateCharts(metrics, yieldData, waterData, costData, envData) {
    const charts = [];

    // Yield trend chart
    if (yieldData.entries.length > 0) {
      charts.push({
        type: 'line',
        title: 'Yield Trends',
        data: yieldData.entries.map(e => ({
          x: e.harvestDate,
          y: e.yieldPerHectare
        }))
      });
    }

    // Water usage chart
    if (waterData.entries.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Water Usage',
        data: waterData.entries.map(e => ({
          x: e.date,
          y: e.volumePerHectare
        }))
      });
    }

    // Cost breakdown chart
    if (costData.breakdown) {
      charts.push({
        type: 'pie',
        title: 'Cost Breakdown',
        data: Object.entries(costData.breakdown).map(([category, amount]) => ({
          label: category,
          value: amount
        }))
      });
    }

    // Environmental score chart
    if (envData.entries.length > 0) {
      charts.push({
        type: 'line',
        title: 'Environmental Score',
        data: envData.entries.map(e => ({
          x: e.date,
          y: e.score
        }))
      });
    }

    // Comparison chart
    charts.push({
      type: 'bar',
      title: 'Overall Improvements',
      data: [
        { label: 'Yield', value: metrics.yield.percentage },
        { label: 'Water Savings', value: metrics.water.percentage },
        { label: 'Cost Reduction', value: metrics.cost.percentage },
        { label: 'Environmental', value: metrics.environmental.improvement }
      ]
    });

    return charts;
  }

  /**
   * Export report
   */
  async exportReport(reportId, format = 'pdf') {
    const reportDoc = await getDoc(doc(db, 'impact_reports', reportId));
    
    if (!reportDoc.exists()) {
      throw new Error('Report not found');
    }

    const report = reportDoc.data();

    switch (format) {
      case 'pdf':
        return this.exportToPDF(report);
      case 'csv':
        return this.exportToCSV(report);
      case 'json':
        return this.exportToJSON(report);
      default:
        throw new Error('Unsupported format');
    }
  }

  /**
   * Export to PDF
   */
  async exportToPDF(report) {
    // Generate PDF content (would use a library like jsPDF in real implementation)
    const pdfContent = this.generatePDFContent(report);

    // Upload to storage
    const fileName = `reports/${this.userId}/${Date.now()}_${report.title}.pdf`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, pdfContent, 'base64');
    const url = await getDownloadURL(storageRef);

    return url;
  }

  /**
   * Generate PDF content
   */
  generatePDFContent(report) {
    // This would use jsPDF or similar library
    // For now, return a placeholder
    const content = {
      title: report.title,
      date: new Date(report.createdAt).toLocaleDateString(),
      summary: {
        yield: `${report.metrics.yield.percentage}% improvement`,
        water: `${report.metrics.water.percentage}% savings`,
        cost: `${report.metrics.cost.percentage}% reduction`,
        environmental: `Score: ${report.metrics.environmental.score}`
      }
    };

    return btoa(JSON.stringify(content));
  }

  /**
   * Export to CSV
   */
  async exportToCSV(report) {
    const csv = this.generateCSVContent(report);

    const fileName = `reports/${this.userId}/${Date.now()}_${report.title}.csv`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, csv);
    const url = await getDownloadURL(storageRef);

    return url;
  }

  /**
   * Generate CSV content
   */
  generateCSVContent(report) {
    let csv = 'Metric,Current,Baseline,Improvement,Percentage\n';
    
    csv += `Yield,${report.metrics.yield.current},${report.metrics.yield.baseline},${report.metrics.yield.improvement},${report.metrics.yield.percentage}%\n`;
    csv += `Water,${report.metrics.water.current},${report.metrics.water.baseline},${report.metrics.water.savings},${report.metrics.water.percentage}%\n`;
    csv += `Cost,${report.metrics.cost.current},${report.metrics.cost.baseline},${report.metrics.cost.reduction},${report.metrics.cost.percentage}%\n`;
    csv += `Environmental,${report.metrics.environmental.score},-,${report.metrics.environmental.improvement},-\n`;

    return csv;
  }

  /**
   * Export to JSON
   */
  async exportToJSON(report) {
    const json = JSON.stringify(report, null, 2);

    const fileName = `reports/${this.userId}/${Date.now()}_${report.title}.json`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, json);
    const url = await getDownloadURL(storageRef);

    return url;
  }

  /**
   * Generate comparison report
   */
  async generateComparisonReport(config) {
    const { periods, plots = [] } = config;

    const comparisons = [];

    for (const period of periods) {
      const report = await this.generateReport({
        title: `Period ${period.start} - ${period.end}`,
        period,
        plots,
        format: 'json',
        includeCharts: false
      });

      comparisons.push({
        period,
        metrics: report.metrics
      });
    }

    return {
      title: 'Comparison Report',
      comparisons,
      createdAt: Date.now()
    };
  }

  /**
   * Get user reports
   */
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

  /**
   * Share report
   */
  async shareReport(reportId) {
    // Generate shareable link
    const shareId = `${reportId}_${Date.now()}`;
    const shareUrl = `https://ecosphere.app/reports/shared/${shareId}`;

    return {
      shareId,
      url: shareUrl,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }
}

export default ReportService;
