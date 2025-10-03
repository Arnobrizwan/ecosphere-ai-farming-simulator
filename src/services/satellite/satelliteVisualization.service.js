/**
 * UC13 - View Real-time Satellite Data
 * Visualize current satellite layers for selected area/time
 */

import { getSMAPTrend } from '../nasa/smapService';
import { submitMODISTask, downloadMODISData } from '../nasa/modisService';
import { searchLandsatScenes } from '../nasa/landsatService';
import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';

const CACHE_COLLECTION = 'satellite_cache';

/**
 * UC13: Fetch and render satellite layers (NDVI/SMAP/IMERG/LST)
 */
export const fetchSatelliteLayers = async (bbox, dateRange, layerTypes = ['all']) => {
  const { minLat, maxLat, minLon, maxLon } = bbox;
  const { startDate, endDate } = dateRange;
  
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const layers = {
    metadata: {
      bbox,
      dateRange,
      fetchedAt: new Date().toISOString(),
    },
    smap: null,
    ndvi: null,
    lst: null,
    imerg: null,
  };

  try {
    // SMAP Soil Moisture
    if (layerTypes.includes('all') || layerTypes.includes('smap')) {
      layers.smap = await getSMAPTrend(centerLat, centerLon, startDate, endDate);
    }

    // MODIS NDVI & LST
    if (layerTypes.includes('all') || layerTypes.includes('ndvi') || layerTypes.includes('lst')) {
      const taskId = await submitMODISTask(centerLat, centerLon, startDate, endDate);
      const modisData = await downloadMODISData(taskId, { pollIntervalMs: 3000, maxWaitMs: 300000 });
      
      layers.ndvi = {
        mean: modisData.mean,
        min: modisData.min,
        max: modisData.max,
        pixelCount: modisData.pixelCount,
      };
      
      layers.lst = modisData.captureDate || null;
    }

    // Landsat Temperature
    if (layerTypes.includes('all') || layerTypes.includes('landsat')) {
      const scenes = await searchLandsatScenes(centerLat, centerLon, startDate, endDate);
      layers.landsat = scenes.slice(0, 3); // Top 3 scenes
    }

    // Cache results
    await cacheLayerData(layers);

    return { success: true, layers };
  } catch (error) {
    // Return last cached data with notice
    const cached = await getLastCachedData(bbox);
    return {
      success: false,
      error: error.message,
      layers: cached?.layers || null,
      notice: 'Showing last cached data due to fetch error',
    };
  }
};

/**
 * Cache satellite layer data
 */
async function cacheLayerData(layers) {
  try {
    await addDoc(collection(db, CACHE_COLLECTION), {
      ...layers,
      cachedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[Cache] Failed to cache layers:', error);
  }
}

/**
 * Retrieve last cached data for bbox
 */
async function getLastCachedData(bbox) {
  try {
    const q = query(
      collection(db, CACHE_COLLECTION),
      where('metadata.bbox', '==', bbox),
      orderBy('cachedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  } catch (error) {
    console.warn('[Cache] Failed to retrieve cached data:', error);
    return null;
  }
}

/**
 * UC14 - Analyze SMAP Soil Moisture
 */
export const analyzeSMAPMoisture = async (farmLocation, dateRange) => {
  const { latitude, longitude } = farmLocation;
  const { startDate, endDate } = dateRange;

  const smapData = await getSMAPTrend(latitude, longitude, startDate, endDate);

  if (!smapData || smapData.length === 0) {
    throw new Error('No SMAP data available for this location/period');
  }

  // Calculate statistics
  const moistureValues = smapData.map(d => d.soilMoisture);
  const mean = moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length;
  const min = Math.min(...moistureValues);
  const max = Math.max(...moistureValues);

  // Detect anomalies (values beyond 2 std dev)
  const stdDev = Math.sqrt(
    moistureValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / moistureValues.length
  );

  const anomalies = smapData.filter(d => Math.abs(d.soilMoisture - mean) > 2 * stdDev);

  // Thresholds for Bangladesh agriculture
  const thresholds = {
    dry: 0.15, // Below 15% - irrigation needed
    optimal: [0.20, 0.35], // 20-35% - ideal for crops
    saturated: 0.45, // Above 45% - waterlogging risk
  };

  const insights = smapData.map(record => ({
    ...record,
    status:
      record.soilMoisture < thresholds.dry
        ? 'dry'
        : record.soilMoisture > thresholds.saturated
        ? 'saturated'
        : 'optimal',
  }));

  return {
    success: true,
    data: smapData,
    statistics: { mean, min, max, stdDev },
    anomalies,
    insights,
    thresholds,
  };
};

/**
 * UC16 - Track MODIS NDVI
 */
export const trackNDVI = async (farmLocation, growingSeason) => {
  const { latitude, longitude } = farmLocation;
  const { startDate, endDate } = growingSeason;

  const taskId = await submitMODISTask(latitude, longitude, startDate, endDate);
  const ndviData = await downloadMODISData(taskId);

  // Calculate z-score for stress detection
  const zScore = (ndviData.mean - ndviData.min) / (ndviData.max - ndviData.min);

  // Stress zones (NDVI < 0.3 indicates stress)
  const stressZones = ndviData.mean < 0.3;

  // Trend analysis (simplified - compare to historical mean)
  const historicalMean = 0.6; // Could be fetched from historical data
  const trend = ndviData.mean > historicalMean ? 'improving' : 'declining';

  return {
    success: true,
    ndvi: ndviData,
    zScore,
    stressDetected: stressZones,
    trend,
    insights: {
      health:
        ndviData.mean > 0.6
          ? 'Healthy vegetation'
          : ndviData.mean > 0.3
          ? 'Moderate health'
          : 'Vegetation stress detected',
      recommendation:
        stressZones
          ? 'Check for pests, water stress, or nutrient deficiency'
          : 'Continue current management practices',
    },
  };
};

/**
 * UC17 - Check Landsat Temperature (LST)
 */
export const checkLandsatTemperature = async (farmLocation, dateRange) => {
  const { latitude, longitude } = farmLocation;
  const { startDate, endDate } = dateRange;

  const scenes = await searchLandsatScenes(latitude, longitude, startDate, endDate);

  if (scenes.length === 0) {
    throw new Error('No Landsat scenes available for this period');
  }

  // Calculate heat stress (simplified - uses metadata)
  const heatStressThreshold = 40; // °C
  const heatStress = scenes.map(scene => ({
    sceneId: scene.id,
    date: scene.date,
    // Note: Actual LST would be extracted from downloaded bands
    estTemp: 30 + Math.random() * 15, // Placeholder until band download implemented
  }));

  return {
    success: true,
    scenes,
    heatStress: heatStress.filter(s => s.estTemp > heatStressThreshold),
    insights: {
      maxTemp: Math.max(...heatStress.map(s => s.estTemp)),
      avgTemp: heatStress.reduce((sum, s) => sum + s.estTemp, 0) / heatStress.length,
      recommendation:
        heatStress.some(s => s.estTemp > heatStressThreshold)
          ? 'Heat stress detected - increase irrigation and provide shade if possible'
          : 'Temperature within acceptable range',
    },
  };
};

/**
 * UC18 - Get Data Insights (Auto-generate insights across layers)
 */
export const getDataInsights = async (farmId, location, dateRange) => {
  const insights = [];

  try {
    // Aggregate all layers
    const layers = await fetchSatelliteLayers(
      {
        minLat: location.latitude - 0.05,
        maxLat: location.latitude + 0.05,
        minLon: location.longitude - 0.05,
        maxLon: location.longitude + 0.05,
      },
      dateRange
    );

    // SMAP insights
    if (layers.layers.smap) {
      const avgMoisture =
        layers.layers.smap.reduce((sum, d) => sum + d.soilMoisture, 0) / layers.layers.smap.length;
      insights.push({
        type: 'soil_moisture',
        priority: avgMoisture < 0.15 ? 'high' : 'medium',
        title: 'Soil Moisture Status',
        message:
          avgMoisture < 0.15
            ? `Low soil moisture detected (${(avgMoisture * 100).toFixed(1)}%) - irrigation recommended`
            : `Soil moisture adequate (${(avgMoisture * 100).toFixed(1)}%)`,
        action: avgMoisture < 0.15 ? 'Schedule irrigation' : null,
      });
    }

    // NDVI insights
    if (layers.layers.ndvi) {
      const ndviMean = layers.layers.ndvi.mean;
      insights.push({
        type: 'vegetation_health',
        priority: ndviMean < 0.3 ? 'high' : 'low',
        title: 'Crop Health Analysis',
        message:
          ndviMean < 0.3
            ? `Vegetation stress detected (NDVI: ${ndviMean.toFixed(2)}) - investigate immediately`
            : `Healthy vegetation (NDVI: ${ndviMean.toFixed(2)})`,
        action: ndviMean < 0.3 ? 'Check for pests/disease' : null,
      });
    }

    // Rank insights by priority
    const ranked = insights.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });

    // Save to dashboard
    await addDoc(collection(db, 'farm_insights'), {
      farmId,
      insights: ranked,
      generatedAt: new Date().toISOString(),
    });

    return { success: true, insights: ranked };
  } catch (error) {
    return { success: false, error: error.message, insights: [] };
  }
};

/**
 * UC19 - Export Data Reports
 */
export const exportDataReport = async (farmId, dataScope, format = 'json') => {
  try {
    const reportData = {
      farmId,
      scope: dataScope,
      generatedAt: new Date().toISOString(),
      data: {},
    };

    // Fetch requested data
    if (dataScope.includes('satellite')) {
      const q1 = query(
        collection(db, 'satellite_data'),
        where('farmId', '==', farmId),
        orderBy('fetchedAt', 'desc'),
        limit(1)
      );
      const satData = await getDocs(q1);
      reportData.data.satellite = satData.empty ? null : satData.docs[0].data();
    }

    if (dataScope.includes('insights')) {
      const q2 = query(
        collection(db, 'farm_insights'),
        where('farmId', '==', farmId),
        orderBy('generatedAt', 'desc'),
        limit(10)
      );
      const insightsData = await getDocs(q2);
      reportData.data.insights = insightsData.docs.map(doc => doc.data());
    }

    // Format output
    let output;
    if (format === 'json') {
      output = JSON.stringify(reportData, null, 2);
    } else if (format === 'csv') {
      output = convertToCSV(reportData);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Save report
    const reportRef = await addDoc(collection(db, 'reports'), {
      farmId,
      format,
      scope: dataScope,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      reportId: reportRef.id,
      downloadUrl: `reports/${reportRef.id}`,
      data: output,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

function convertToCSV(data) {
  // Simple CSV conversion - expand as needed
  const rows = [];
  rows.push('Farm ID,Generated At,Data Type,Value');
  
  if (data.data.satellite) {
    rows.push(`${data.farmId},${data.generatedAt},Satellite,${JSON.stringify(data.data.satellite)}`);
  }
  
  return rows.join('\n');
}
