/**
 * UC56 - MODIS NDVI Service for Pasture Health Monitoring
 * Fetches vegetation indices from NASA AppEEARS API
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APPEEARS_API = 'https://appeears.earthdatacloud.nasa.gov/api';
const NASA_TOKEN =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_TOKEN || process.env.NASA_EARTHDATA_TOKEN;
const NASA_USERNAME =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_USERNAME || process.env.NASA_EARTHDATA_USERNAME || 'arnobrizwan';

let sessionToken = null;

/**
 * Authenticate with AppEEARS API
 */
const authenticate = async () => {
  if (sessionToken) return sessionToken;
  
  try {
    const response = await axios.post(`${APPEEARS_API}/login`, {
      username: NASA_USERNAME,
      password: NASA_TOKEN
    });
    
    sessionToken = response.data.token;
    console.log('[MODIS NDVI] Authentication successful');
    return sessionToken;
  } catch (error) {
    console.error('[MODIS NDVI] Authentication failed:', error.message);
    throw new Error(`AppEEARS authentication failed: ${error.message}`);
  }
};

/**
 * UC56: Fetch MODIS NDVI for pasture area
 * @param {Object} pastureBoundary - GeoJSON polygon or coordinates
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<string>} taskId for tracking
 */
export const fetchPastureNDVI = async (pastureBoundary, startDate, endDate) => {
  const token = await authenticate();
  
  // Convert pasture boundary to coordinates
  const coordinates = pastureBoundary.type === 'Polygon' 
    ? extractCentroid(pastureBoundary)
    : { latitude: pastureBoundary.latitude, longitude: pastureBoundary.longitude };
  
  try {
    const taskConfig = {
      task_type: 'point',
      task_name: `Pasture_NDVI_${Date.now()}`,
      params: {
        dates: [{ startDate, endDate }],
        layers: [
          {
            product: 'MOD13Q1.061',  // MODIS Terra 16-day NDVI
            layer: '_250m_16_days_NDVI'
          },
          {
            product: 'MOD13Q1.061',
            layer: '_250m_16_days_EVI'  // Enhanced Vegetation Index
          },
          {
            product: 'MOD13Q1.061',
            layer: '_250m_16_days_VI_Quality'
          }
        ],
        coordinates: [{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          category: 'pasture_center'
        }],
        output: {
          format: { type: 'geotiff' },
          projection: 'geographic'
        }
      }
    };
    
    console.log('[MODIS NDVI] Submitting task:', taskConfig.task_name);
    
    const response = await axios.post(`${APPEEARS_API}/task`, taskConfig, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const taskId = response.data.task_id;
    
    // Cache task ID
    await AsyncStorage.setItem(`modis_task_${taskId}`, JSON.stringify({
      pastureBoundary,
      startDate,
      endDate,
      submittedAt: new Date().toISOString()
    }));
    
    console.log('[MODIS NDVI] Task submitted:', taskId);
    return taskId;
    
  } catch (error) {
    console.error('[MODIS NDVI] Task submission failed:', error.message);
    if (error.response) {
      console.error('[MODIS NDVI] Error response:', error.response.data);
    }
    throw new Error(`MODIS NDVI fetch failed: ${error.message}`);
  }
};

/**
 * Check MODIS task status
 */
export const checkNDVITaskStatus = async (taskId) => {
  const token = await authenticate();
  
  try {
    const response = await axios.get(`${APPEEARS_API}/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return {
      status: response.data.status, // 'pending', 'processing', 'done', 'error'
      progress: response.data.progress || 0
    };
  } catch (error) {
    console.error('[MODIS NDVI] Status check failed:', error.message);
    throw new Error(`Status check failed: ${error.message}`);
  }
};

/**
 * Download and process NDVI results
 */
export const downloadNDVIData = async (taskId) => {
  const token = await authenticate();
  
  console.log('[MODIS NDVI] Starting download for task:', taskId);
  
  // Poll until complete
  let statusCheck = await checkNDVITaskStatus(taskId);
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max
  
  while (statusCheck.status !== 'done' && attempts < maxAttempts) {
    if (statusCheck.status === 'error') {
      throw new Error('MODIS task processing failed');
    }
    
    console.log(`[MODIS NDVI] Task status: ${statusCheck.status}, progress: ${statusCheck.progress}%`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    statusCheck = await checkNDVITaskStatus(taskId);
    attempts++;
  }
  
  if (statusCheck.status !== 'done') {
    throw new Error('MODIS task timeout');
  }
  
  console.log('[MODIS NDVI] Task complete, downloading results...');
  
  // Download bundle
  const response = await axios.get(`${APPEEARS_API}/bundle/${taskId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    responseType: 'arraybuffer'
  });
  
  // Parse CSV results (AppEEARS returns CSV for point data)
  const csvData = Buffer.from(response.data).toString('utf-8');
  const ndviTimeSeries = parseNDVICSV(csvData);
  
  // Cache results
  await AsyncStorage.setItem(`modis_data_${taskId}`, JSON.stringify(ndviTimeSeries));
  
  console.log('[MODIS NDVI] Downloaded and parsed', ndviTimeSeries.length, 'observations');
  return ndviTimeSeries;
};

/**
 * Parse NDVI CSV data
 */
function parseNDVICSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const row = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim();
    });
    
    // MODIS NDVI has scale factor of 0.0001
    if (row.NDVI || row._250m_16_days_NDVI) {
      const ndviRaw = parseFloat(row.NDVI || row._250m_16_days_NDVI);
      const eviRaw = parseFloat(row.EVI || row._250m_16_days_EVI);
      
      data.push({
        date: row.Date || row.Date,
        ndvi: ndviRaw / 10000, // Scale factor
        evi: eviRaw / 10000,
        quality: row.VI_Quality || row._250m_16_days_VI_Quality || 'unknown'
      });
    }
  }
  
  return data;
}

/**
 * UC56: Calculate grass biomass from NDVI
 * Formula: Biomass (kg/ha) ≈ 15000 * NDVI (empirical for grasslands)
 * Based on research: Biomass-NDVI relationships for rangelands
 */
export const calculateGrassBiomass = (ndviValue) => {
  if (ndviValue < 0.2) return 0; // Bare soil
  if (ndviValue > 0.8) ndviValue = 0.8; // Cap at maximum
  
  const biomassKgPerHa = 15000 * ndviValue;
  return Math.round(biomassKgPerHa);
};

/**
 * UC56: Detect overgrazing or drought stress
 */
export const detectPastureStress = (ndviTimeSeries) => {
  if (!ndviTimeSeries || ndviTimeSeries.length === 0) {
    return {
      status: 'unknown',
      avgNDVI: 0,
      trend: 0,
      alerts: ['No data available'],
      biomass: 0
    };
  }
  
  const recentNDVI = ndviTimeSeries.slice(-3); // Last 3 observations
  const avgNDVI = recentNDVI.reduce((sum, d) => sum + d.ndvi, 0) / recentNDVI.length;
  
  // Calculate trend
  const firstNDVI = recentNDVI[0]?.ndvi || avgNDVI;
  const lastNDVI = recentNDVI[recentNDVI.length - 1]?.ndvi || avgNDVI;
  const trend = firstNDVI !== 0 ? ((lastNDVI - firstNDVI) / firstNDVI) * 100 : 0;
  
  let status = 'healthy';
  let alerts = [];
  
  if (avgNDVI < 0.3) {
    status = 'critical';
    alerts.push('Low vegetation cover detected - immediate action required');
  } else if (avgNDVI < 0.4) {
    status = 'warning';
    alerts.push('Pasture health declining - monitor closely');
  }
  
  if (trend < -15) {
    alerts.push('Rapid vegetation loss - possible overgrazing detected');
  } else if (trend < -5) {
    alerts.push('Vegetation declining - consider reducing stocking rate');
  }
  
  return {
    status,
    avgNDVI,
    trend,
    alerts,
    biomass: calculateGrassBiomass(avgNDVI)
  };
};

/**
 * UC56: Recommend grazing rotation schedule
 */
export const recommendGrazingRotation = (pastureNDVI, animalCount, pastureAreaHa) => {
  const biomass = calculateGrassBiomass(pastureNDVI);
  const availableFeed = biomass * pastureAreaHa; // Total kg
  const dailyIntakePerAnimal = 25; // kg dry matter per animal per day (cattle)
  const utilizationRate = 0.5; // Only use 50% of available forage
  
  const usableFeed = availableFeed * utilizationRate;
  const daysBeforeRotation = Math.floor(usableFeed / (animalCount * dailyIntakePerAnimal));
  const restDays = Math.ceil(28 / (pastureNDVI > 0.6 ? 1 : 2)); // Faster recovery for healthier pastures
  
  return {
    availableFeed: Math.round(availableFeed),
    usableFeed: Math.round(usableFeed),
    grazingDays: Math.max(1, daysBeforeRotation),
    recommendedRestDays: Math.max(21, restDays),
    nextRotationDate: new Date(Date.now() + daysBeforeRotation * 24 * 60 * 60 * 1000).toISOString(),
    stockingRate: (animalCount / pastureAreaHa).toFixed(2),
    recommendation: daysBeforeRotation < 3 
      ? 'Urgent: Move animals soon' 
      : daysBeforeRotation < 7 
        ? 'Plan rotation within a week' 
        : 'Continue current grazing'
  };
};

/**
 * Extract centroid from polygon
 */
function extractCentroid(polygon) {
  if (polygon.type === 'Point') {
    return {
      latitude: polygon.coordinates[1],
      longitude: polygon.coordinates[0]
    };
  }
  
  const coords = polygon.coordinates[0];
  const sumLat = coords.reduce((sum, c) => sum + c[1], 0);
  const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
  
  return {
    latitude: sumLat / coords.length,
    longitude: sumLng / coords.length
  };
}

/**
 * Get cached NDVI data
 */
export const getCachedNDVIData = async (taskId) => {
  try {
    const cached = await AsyncStorage.getItem(`modis_data_${taskId}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('[MODIS NDVI] Cache retrieval failed:', error);
    return null;
  }
};
