/**
 * UC46 - Performance Metrics Analytics Service
 * Explore metrics across seasons/plots with advanced filtering
 */

import { db } from '../firebase.config';
import { collection, doc, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';

/**
 * Analyze performance metrics with dimensions and filters
 */
export const analyzeMetrics = async (userId, config) => {
  const {
    dimensions = ['season', 'plot'],
    metrics = ['yield', 'water', 'cost'],
    filters = {},
    timeRange = { start: null, end: null },
  } = config;

  try {
    // Fetch raw data
    const data = await fetchMetricsData(userId, filters, timeRange);

    // Compute aggregations
    const aggregates = computeAggregates(data, dimensions, metrics);

    // Build charts
    const charts = buildCharts(aggregates, dimensions, metrics);

    // Compute comparisons
    const comparisons = computeComparisons(aggregates, dimensions);

    return {
      success: true,
      aggregates,
      charts,
      comparisons,
      filters,
      dimensions,
      metrics,
    };
  } catch (error) {
    console.error('[Analytics] Analysis failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch metrics data
 */
async function fetchMetricsData(userId, filters, timeRange) {
  const constraints = [where('userId', '==', userId)];

  // Apply time range
  if (timeRange.start) {
    constraints.push(where('completedDate', '>=', new Date(timeRange.start).getTime()));
  }
  if (timeRange.end) {
    constraints.push(where('completedDate', '<=', new Date(timeRange.end).getTime()));
  }

  // Apply filters
  if (filters.type) {
    constraints.push(where('type', '==', filters.type));
  }
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }

  const snapshot = await getDocs(query(collection(db, 'farm_operations'), ...constraints));
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Compute aggregates by dimensions
 */
function computeAggregates(data, dimensions, metrics) {
  const aggregates = {};

  data.forEach(operation => {
    // Build dimension key
    const key = dimensions.map(dim => {
      if (dim === 'season') {
        return getSeason(operation.completedDate || operation.scheduledDate);
      } else if (dim === 'plot') {
        return operation.plotIds?.[0] || 'unknown';
      } else if (dim === 'type') {
        return operation.type;
      }
      return 'all';
    }).join('_');

    if (!aggregates[key]) {
      aggregates[key] = {
        dimensions: dimensions.reduce((obj, dim, i) => {
          obj[dim] = key.split('_')[i];
          return obj;
        }, {}),
        count: 0,
        yield: { total: 0, avg: 0, max: 0, min: Infinity },
        water: { total: 0, avg: 0, max: 0, min: Infinity },
        cost: { total: 0, avg: 0, max: 0, min: Infinity },
        efficiency: { avg: 0 },
      };
    }

    const agg = aggregates[key];
    agg.count++;

    // Aggregate yield (simulated - would come from harvest operations)
    if (operation.type === 'harvest' && operation.actualYield) {
      agg.yield.total += operation.actualYield;
      agg.yield.max = Math.max(agg.yield.max, operation.actualYield);
      agg.yield.min = Math.min(agg.yield.min, operation.actualYield);
    }

    // Aggregate water usage (from irrigation operations)
    if (operation.type === 'irrigation' && operation.waterUsed) {
      agg.water.total += operation.waterUsed;
      agg.water.max = Math.max(agg.water.max, operation.waterUsed);
      agg.water.min = Math.min(agg.water.min, operation.waterUsed);
    }

    // Aggregate costs
    if (operation.cost) {
      agg.cost.total += operation.cost;
      agg.cost.max = Math.max(agg.cost.max, operation.cost);
      agg.cost.min = Math.min(agg.cost.min, operation.cost);
    }
  });

  // Compute averages
  Object.values(aggregates).forEach(agg => {
    if (agg.count > 0) {
      agg.yield.avg = agg.yield.total / agg.count;
      agg.water.avg = agg.water.total / agg.count;
      agg.cost.avg = agg.cost.total / agg.count;
      agg.efficiency.avg = agg.yield.total / (agg.water.total || 1); // Yield per unit water
    }
  });

  return aggregates;
}

/**
 * Build charts from aggregates
 */
function buildCharts(aggregates, dimensions, metrics) {
  const charts = [];

  // Bar chart: Metrics by primary dimension
  const primaryDim = dimensions[0];
  const barData = Object.entries(aggregates).map(([key, agg]) => ({
    label: agg.dimensions[primaryDim],
    ...metrics.reduce((obj, metric) => {
      obj[metric] = agg[metric]?.total || 0;
      return obj;
    }, {}),
  }));

  charts.push({
    type: 'bar',
    title: `${metrics.join(', ')} by ${primaryDim}`,
    data: barData,
    xAxis: primaryDim,
    yAxes: metrics,
  });

  // Line chart: Trend over time (if season is a dimension)
  if (dimensions.includes('season')) {
    const lineData = Object.entries(aggregates)
      .sort((a, b) => {
        const seasonOrder = { spring: 0, summer: 1, monsoon: 2, autumn: 3, winter: 4 };
        return (seasonOrder[a[1].dimensions.season] || 0) - (seasonOrder[b[1].dimensions.season] || 0);
      })
      .map(([key, agg]) => ({
        season: agg.dimensions.season,
        ...metrics.reduce((obj, metric) => {
          obj[metric] = agg[metric]?.avg || 0;
          return obj;
        }, {}),
      }));

    charts.push({
      type: 'line',
      title: `${metrics.join(', ')} Trend`,
      data: lineData,
      xAxis: 'season',
      yAxes: metrics,
    });
  }

  // Pie chart: Distribution
  if (aggregates && Object.keys(aggregates).length > 0) {
    const pieData = Object.entries(aggregates).map(([key, agg]) => ({
      label: Object.values(agg.dimensions).join(' - '),
      value: agg.count,
    }));

    charts.push({
      type: 'pie',
      title: 'Operations Distribution',
      data: pieData,
    });
  }

  return charts;
}

/**
 * Compute comparisons between dimensions
 */
function computeComparisons(aggregates, dimensions) {
  const comparisons = [];

  if (Object.keys(aggregates).length < 2) {
    return comparisons;
  }

  const entries = Object.entries(aggregates);

  // Best performing
  const best = entries.reduce((best, [key, agg]) => {
    if (!best || agg.yield.total > best[1].yield.total) {
      return [key, agg];
    }
    return best;
  }, null);

  if (best) {
    comparisons.push({
      type: 'best_performance',
      dimensions: best[1].dimensions,
      yield: best[1].yield.total,
      message: `Best performance: ${Object.values(best[1].dimensions).join(' - ')}`,
    });
  }

  // Most efficient (yield per water)
  const mostEfficient = entries.reduce((best, [key, agg]) => {
    if (!best || agg.efficiency.avg > best[1].efficiency.avg) {
      return [key, agg];
    }
    return best;
  }, null);

  if (mostEfficient) {
    comparisons.push({
      type: 'most_efficient',
      dimensions: mostEfficient[1].dimensions,
      efficiency: mostEfficient[1].efficiency.avg,
      message: `Most water-efficient: ${Object.values(mostEfficient[1].dimensions).join(' - ')}`,
    });
  }

  // Average comparisons
  const avgYield = entries.reduce((sum, [_, agg]) => sum + agg.yield.avg, 0) / entries.length;
  const aboveAvg = entries.filter(([_, agg]) => agg.yield.avg > avgYield);

  comparisons.push({
    type: 'above_average',
    count: aboveAvg.length,
    total: entries.length,
    percentage: (aboveAvg.length / entries.length * 100).toFixed(1),
    message: `${aboveAvg.length} out of ${entries.length} (${(aboveAvg.length / entries.length * 100).toFixed(1)}%) above average yield`,
  });

  return comparisons;
}

/**
 * Save analytics view
 */
export const saveAnalyticsView = async (userId, viewName, config) => {
  const view = {
    userId,
    name: viewName,
    config,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'analytics_views'), view);

  return {
    success: true,
    viewId: docRef.id,
    view,
  };
};

/**
 * Get saved analytics views
 */
export const getSavedViews = async (userId) => {
  const snapshot = await getDocs(
    query(collection(db, 'analytics_views'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
  );

  return {
    success: true,
    views: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
  };
};

/**
 * Helper: Determine season from timestamp
 */
function getSeason(timestamp) {
  const date = new Date(timestamp);
  const month = date.getMonth();

  // Bangladesh seasons
  if (month >= 2 && month <= 4) return 'spring'; // Mar-May
  if (month >= 5 && month <= 7) return 'monsoon'; // Jun-Aug
  if (month >= 8 && month <= 10) return 'autumn'; // Sep-Nov
  return 'winter'; // Dec-Feb
}
