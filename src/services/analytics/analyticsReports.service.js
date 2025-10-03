/**
 * UC48 - Analytics Reports Generation Service
 * Export/share analytic views from UC46
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { analyzeMetrics } from './performanceMetrics.service';
import ProgressTrackingService from './progressTracking.service';

/**
 * Generate analytics report
 */
export const generateReport = async (userId, config) => {
  const {
    viewId = null,
    format = 'pdf',
    recipients = [],
    includeCharts = true,
    includeProgress = true,
    timeRange = null,
  } = config;

  try {
    let reportData;

    if (viewId) {
      // Load saved view
      const view = await getDoc(doc(db, 'analytics_views', viewId));
      
      if (!view.exists()) {
        throw new Error('Analytics view not found');
      }

      const viewConfig = view.data().config;
      reportData = await analyzeMetrics(userId, viewConfig);
    } else {
      // Generate fresh report
      reportData = await analyzeMetrics(userId, {
        dimensions: ['season', 'plot'],
        metrics: ['yield', 'water', 'cost'],
        timeRange: timeRange || {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });
    }

    // Add progress data if requested
    let progressData = null;
    if (includeProgress) {
      const progressService = new ProgressTrackingService(userId);
      progressData = await progressService.getProgress({
        timeframe: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime(),
          end: Date.now(),
        },
      });
    }

    // Build report document
    const report = {
      id: `report_${Date.now()}`,
      userId,
      title: `Farm Analytics Report - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date().toISOString(),
      format,
      sections: buildReportSections(reportData, progressData, includeCharts),
      metadata: {
        viewId,
        timeRange: reportData.filters?.timeRange || timeRange,
        dimensions: reportData.dimensions,
        metrics: reportData.metrics,
      },
    };

    // Render report based on format
    const renderedReport = await renderReport(report, format);

    // Deliver to recipients
    if (recipients.length > 0) {
      await deliverReport(renderedReport, recipients, format);
    }

    // Archive report
    const docRef = await addDoc(collection(db, 'analytics_reports'), {
      ...report,
      archivedAt: new Date().toISOString(),
    });

    return {
      success: true,
      reportId: docRef.id,
      report: renderedReport,
      delivered: recipients.length > 0,
    };
  } catch (error) {
    console.error('[Reports] Generation failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Build report sections
 */
function buildReportSections(analyticsData, progressData, includeCharts) {
  const sections = [];

  // Executive Summary
  sections.push({
    type: 'summary',
    title: 'Executive Summary',
    content: {
      totalOperations: Object.keys(analyticsData.aggregates || {}).length,
      topPerformer: analyticsData.comparisons?.find(c => c.type === 'best_performance')?.message || 'N/A',
      efficiency: analyticsData.comparisons?.find(c => c.type === 'most_efficient')?.message || 'N/A',
    },
  });

  // Performance Metrics
  sections.push({
    type: 'metrics',
    title: 'Performance Metrics',
    content: {
      aggregates: analyticsData.aggregates,
      comparisons: analyticsData.comparisons,
    },
  });

  // Charts
  if (includeCharts && analyticsData.charts) {
    sections.push({
      type: 'charts',
      title: 'Visual Analytics',
      content: {
        charts: analyticsData.charts,
      },
    });
  }

  // Progress Tracking
  if (progressData) {
    sections.push({
      type: 'progress',
      title: 'Progress Over Time',
      content: {
        yield: progressData.metrics.yield,
        water: progressData.metrics.water,
        cost: progressData.metrics.cost,
        learning: progressData.metrics.learning,
        targets: progressData.targets,
      },
    });
  }

  // Recommendations
  sections.push({
    type: 'recommendations',
    title: 'Recommendations',
    content: generateRecommendations(analyticsData, progressData),
  });

  return sections;
}

/**
 * Generate recommendations
 */
function generateRecommendations(analyticsData, progressData) {
  const recommendations = [];

  // From comparisons
  if (analyticsData.comparisons) {
    const mostEfficient = analyticsData.comparisons.find(c => c.type === 'most_efficient');
    if (mostEfficient) {
      recommendations.push({
        priority: 'high',
        category: 'efficiency',
        message: `Replicate practices from ${Object.values(mostEfficient.dimensions).join(' - ')} for better water efficiency`,
      });
    }
  }

  // From progress data
  if (progressData) {
    const yieldTarget = progressData.targets?.find(t => t.metric === 'yield');
    if (yieldTarget && yieldTarget.progress < 100) {
      recommendations.push({
        priority: 'medium',
        category: 'yield',
        message: `Focus on yield improvement - currently at ${yieldTarget.progress}% of target`,
      });
    }
  }

  // NASA data recommendation
  recommendations.push({
    priority: 'low',
    category: 'technology',
    message: 'Continue using NASA satellite data for informed decision-making',
  });

  return recommendations;
}

/**
 * Render report in specified format
 */
async function renderReport(report, format) {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);

    case 'csv':
      return convertToCSV(report);

    case 'pdf':
      // Would integrate with PDF generation library
      return {
        type: 'pdf',
        placeholder: 'PDF generation would be implemented here',
        data: report,
      };

    case 'html':
      return convertToHTML(report);

    default:
      return JSON.stringify(report);
  }
}

/**
 * Convert report to CSV
 */
function convertToCSV(report) {
  const rows = [];
  rows.push(`"Report","${report.title}"`);
  rows.push(`"Generated","${report.generatedAt}"`);
  rows.push('');

  // Aggregates
  rows.push('"Dimension","Count","Avg Yield","Avg Water","Avg Cost","Efficiency"');
  
  Object.entries(report.sections[1]?.content?.aggregates || {}).forEach(([key, agg]) => {
    rows.push([
      `"${Object.values(agg.dimensions).join(' - ')}"`,
      agg.count,
      agg.yield.avg.toFixed(2),
      agg.water.avg.toFixed(2),
      agg.cost.avg.toFixed(2),
      agg.efficiency.avg.toFixed(2),
    ].join(','));
  });

  return rows.join('\n');
}

/**
 * Convert report to HTML
 */
function convertToHTML(report) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #2c5f2d; }
    h2 { color: #4a7c59; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #2c5f2d; color: white; }
    .metric { background-color: #f0f8f0; padding: 15px; margin: 10px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
  
  ${report.sections.map(section => `
    <h2>${section.title}</h2>
    ${renderHTMLSection(section)}
  `).join('')}
</body>
</html>
  `.trim();
}

/**
 * Render HTML section
 */
function renderHTMLSection(section) {
  if (section.type === 'summary') {
    return `
      <div class="metric">
        <p><strong>Total Operations:</strong> ${section.content.totalOperations}</p>
        <p><strong>Top Performer:</strong> ${section.content.topPerformer}</p>
        <p><strong>Most Efficient:</strong> ${section.content.efficiency}</p>
      </div>
    `;
  }

  if (section.type === 'metrics') {
    const rows = Object.entries(section.content.aggregates || {}).map(([key, agg]) => `
      <tr>
        <td>${Object.values(agg.dimensions).join(' - ')}</td>
        <td>${agg.count}</td>
        <td>${agg.yield.avg.toFixed(2)}</td>
        <td>${agg.water.avg.toFixed(2)}</td>
        <td>${agg.cost.avg.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Count</th>
            <th>Avg Yield</th>
            <th>Avg Water</th>
            <th>Avg Cost</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  return '<p>Data not available</p>';
}

/**
 * Deliver report to recipients
 */
async function deliverReport(renderedReport, recipients, format) {
  for (const recipient of recipients) {
    if (recipient.method === 'email') {
      await sendEmail(recipient.address, renderedReport, format);
    } else if (recipient.method === 'app') {
      await sendAppNotification(recipient.userId, renderedReport);
    }
  }

  // Log delivery
  await addDoc(collection(db, 'report_deliveries'), {
    recipients,
    format,
    deliveredAt: new Date().toISOString(),
  });
}

/**
 * Send report via email
 */
async function sendEmail(emailAddress, report, format) {
  // Would integrate with SendGrid or similar
  console.log(`[Reports] Email to ${emailAddress}:`, format);
  
  await addDoc(collection(db, 'delivery_logs'), {
    type: 'email',
    recipient: emailAddress,
    format,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send report via app notification
 */
async function sendAppNotification(userId, report) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type: 'report',
    title: 'Analytics Report Ready',
    message: 'Your farm analytics report has been generated',
    data: { reportId: report.id },
    createdAt: new Date().toISOString(),
  });
}

/**
 * Get archived reports
 */
export const getArchivedReports = async (userId, limitCount = 10) => {
  const snapshot = await getDocs(
    query(collection(db, 'analytics_reports'), where('userId', '==', userId), orderBy('archivedAt', 'desc'), limit(limitCount))
  );

  return {
    success: true,
    reports: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
  };
};
