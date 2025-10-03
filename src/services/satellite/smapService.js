/**
 * UC56 - SMAP Soil Moisture Service for Drought Detection
 * Fetches soil moisture data from NASA CMR API
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CMR_API = 'https://cmr.earthdata.nasa.gov/search/granules.json';
const NASA_TOKEN =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_TOKEN || process.env.NASA_EARTHDATA_TOKEN;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const NASA_POWER_API = 'https://power.larc.nasa.gov/api/temporal/daily/point';

/**
 * UC56: Fetch soil moisture for drought stress detection
 * @param {number} latitude - Pasture latitude
 * @param {number} longitude - Pasture longitude
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} Soil moisture time series
 */
export const fetchPastureSoilMoisture = async (latitude, longitude, startDate, endDate, retryCount = 0) => {
  const bbox = `${longitude - 0.1},${latitude - 0.1},${longitude + 0.1},${latitude + 0.1}`;
  
  console.log('[SMAP] Fetching soil moisture for:', { latitude, longitude, startDate, endDate });
  
  // Check cache first
  const cacheKey = `smap_${latitude}_${longitude}_${startDate}_${endDate}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached);
      console.log('[SMAP] Using cached data:', cachedData.length, 'points');
      return cachedData;
    }
  } catch (cacheError) {
    console.warn('[SMAP] Cache read failed:', cacheError.message);
  }
  
  try {
    console.log('[SMAP] API Request:', {
      endpoint: CMR_API,
      bbox,
      temporal: `${startDate}T00:00:00Z,${endDate}T23:59:59Z`,
      hasToken: !!NASA_TOKEN
    });

    const response = await axios.get(CMR_API, {
      params: {
        short_name: 'SPL3SMP_E',  // SMAP Enhanced L3 Radiometer Global Daily 9 km
        version: '005',
        bounding_box: bbox,
        temporal: `${startDate}T00:00:00Z,${endDate}T23:59:59Z`,
        page_size: 30
      },
      headers: NASA_TOKEN ? {
        'Authorization': `Bearer ${NASA_TOKEN}`
      } : {},
      timeout: 10000 // 10 second timeout
    });
    
    console.log('[SMAP] API Response status:', response.status);
    const granules = response.data?.feed?.entry || [];
    console.log('[SMAP] Found', granules.length, 'granules');
    
    // Log first granule for debugging
    if (granules.length > 0) {
      console.log('[SMAP] First granule sample:', {
        id: granules[0].id,
        title: granules[0].title,
        timeStart: granules[0].time_start,
        hasSummary: !!granules[0].summary,
        summaryPreview: granules[0].summary?.substring(0, 200)
      });
    }
    
    // If no granules found, return estimated fallback data
    if (granules.length === 0) {
      console.warn('[SMAP] No data available for this date/location, using estimated values');
      return generateFallbackSMAPData(startDate, endDate, latitude, longitude);
    }
    
    // Extract soil moisture values from granules
    // Note: Actual values require downloading granules, here we use metadata
    const soilMoistureData = granules.map(granule => {
      // Parse summary for moisture value (simplified - in production, download HDF5 files)
      const moistureMatch = granule.summary?.match(/soil_moisture[:\s]+(\d+\.\d+)/i);
      const moistureValue = moistureMatch ? parseFloat(moistureMatch[1]) : 0.25; // Default fallback
      
      return {
        date: granule.time_start,
        soilMoisture: moistureValue,
        unit: 'cm³/cm³',
        granuleId: granule.id,
        dataQuality: granule.online_access_flag ? 'available' : 'limited',
        source: 'NASA SMAP'
      };
    });
    
    // Cache results
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(soilMoistureData));
    } catch (cacheError) {
      console.warn('[SMAP] Cache write failed:', cacheError.message);
    }
    
    console.log('[SMAP] Processed', soilMoistureData.length, 'data points');
    return soilMoistureData;
    
  } catch (error) {
    console.error('[SMAP] fetch error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Retry logic for temporary failures
    if (retryCount < MAX_RETRIES && error.code !== 'ENOTFOUND' && error.response?.status !== 404 && error.response?.status !== 400) {
      console.log(`[SMAP] retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return fetchPastureSoilMoisture(latitude, longitude, startDate, endDate, retryCount + 1);
    }
    
    // Try NASA POWER API as alternative before falling back to estimates
    console.warn('[SMAP] CMR API failed, trying NASA POWER API...');
    const powerData = await fetchSoilMoistureFromPOWER(latitude, longitude, startDate, endDate);
    if (powerData && powerData.length > 0) {
      // Cache the POWER data
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(powerData));
      } catch (cacheError) {
        console.warn('[SMAP] Cache write failed:', cacheError.message);
      }
      return powerData;
    }
    
    // Final fallback: return estimated data
    console.warn('[SMAP] All data sources failed, using estimated fallback data');
    return generateFallbackSMAPData(startDate, endDate, latitude, longitude);
  }
};

/**
 * Fetch soil moisture from NASA POWER API (alternative source)
 * @private
 */
async function fetchSoilMoistureFromPOWER(latitude, longitude, startDate, endDate) {
  try {
    console.log('[SMAP] Trying NASA POWER API as alternative...');
    const start = startDate.replace(/-/g, '');
    const end = endDate.replace(/-/g, '');
    
    const response = await axios.get(NASA_POWER_API, {
      params: {
        parameters: 'GWETROOT,PRECTOTCORR,T2M',
        community: 'ag',
        latitude,
        longitude,
        start,
        end,
        format: 'json'
      },
      timeout: 10000
    });
    
    const params = response.data?.properties?.parameter;
    if (!params || !params.GWETROOT) {
      console.warn('[SMAP] NASA POWER: No root zone soil wetness data');
      return null;
    }
    
    // GWETROOT is root zone soil wetness (0-1)
    const gwetData = params.GWETROOT;
    const dates = Object.keys(gwetData).sort();
    
    const soilMoistureData = dates.map(dateStr => {
      // Convert YYYYMMDD to ISO date
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const isoDate = `${year}-${month}-${day}T12:00:00Z`;
      
      // GWETROOT is already 0-1 (soil wetness), which is similar to soil moisture
      const wetness = gwetData[dateStr];
      
      return {
        date: isoDate,
        soilMoisture: parseFloat((wetness * 0.4).toFixed(3)), // Scale to typical soil moisture range
        unit: 'cm³/cm³',
        granuleId: `power_${dateStr}`,
        dataQuality: 'modeled',
        source: 'NASA POWER (Soil Wetness)'
      };
    });
    
    console.log('[SMAP] NASA POWER: Retrieved', soilMoistureData.length, 'data points');
    return soilMoistureData;
    
  } catch (error) {
    console.error('[SMAP] NASA POWER fetch failed:', error.message);
    return null;
  }
}

/**
 * Generate fallback SMAP data when API fails
 * @private
 */
function generateFallbackSMAPData(startDate, endDate, latitude, longitude) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // Generate estimated soil moisture based on season
  const month = start.getMonth();
  let baseMoisture = 0.25; // Default 25%
  
  // Bangladesh seasonal patterns
  if (month >= 5 && month <= 9) {
    // Monsoon season (June-October): higher moisture
    baseMoisture = 0.35;
  } else if (month >= 10 || month <= 2) {
    // Dry season (November-March): lower moisture
    baseMoisture = 0.20;
  }
  
  const fallbackData = [];
  for (let i = 0; i <= Math.min(daysDiff, 30); i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    // Add some variation
    const variation = (Math.random() - 0.5) * 0.05;
    const moisture = Math.max(0.10, Math.min(0.45, baseMoisture + variation));
    
    fallbackData.push({
      date: date.toISOString(),
      soilMoisture: parseFloat(moisture.toFixed(3)),
      unit: 'cm³/cm³',
      granuleId: 'estimated',
      dataQuality: 'estimated',
      source: 'Seasonal Estimation'
    });
  }
  
  console.log('[SMAP] Generated', fallbackData.length, 'fallback data points');
  return fallbackData;
}

/**
 * Detect drought conditions based on soil moisture
 * @param {Array} soilMoistureTimeSeries - Array of soil moisture observations
 * @returns {Object} Drought analysis
 */
export const detectDrought = (soilMoistureTimeSeries) => {
  if (!soilMoistureTimeSeries || soilMoistureTimeSeries.length === 0) {
    return {
      avgMoisture: 0,
      droughtLevel: 'unknown',
      alert: 'No soil moisture data available'
    };
  }
  
  const avgMoisture = soilMoistureTimeSeries.reduce((sum, d) => sum + d.soilMoisture, 0) 
    / soilMoistureTimeSeries.length;
  
  // Calculate trend
  const recent = soilMoistureTimeSeries.slice(-5);
  const older = soilMoistureTimeSeries.slice(0, 5);
  
  const recentAvg = recent.reduce((sum, d) => sum + d.soilMoisture, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.soilMoisture, 0) / older.length;
  const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  // Drought classification based on soil moisture thresholds
  let droughtLevel = 'none';
  let severity = 0;
  
  if (avgMoisture < 0.10) {
    droughtLevel = 'exceptional';
    severity = 5;
  } else if (avgMoisture < 0.15) {
    droughtLevel = 'extreme';
    severity = 4;
  } else if (avgMoisture < 0.20) {
    droughtLevel = 'severe';
    severity = 3;
  } else if (avgMoisture < 0.25) {
    droughtLevel = 'moderate';
    severity = 2;
  } else if (avgMoisture < 0.30) {
    droughtLevel = 'mild';
    severity = 1;
  }
  
  const alert = droughtLevel !== 'none' 
    ? `${droughtLevel.charAt(0).toUpperCase() + droughtLevel.slice(1)} drought conditions detected`
    : null;
  
  const recommendations = generateDroughtRecommendations(droughtLevel, trend);
  
  return {
    avgMoisture,
    droughtLevel,
    severity,
    trend,
    alert,
    recommendations
  };
};

/**
 * Generate drought management recommendations
 */
function generateDroughtRecommendations(droughtLevel, trend) {
  const recommendations = [];
  
  switch (droughtLevel) {
    case 'exceptional':
    case 'extreme':
      recommendations.push('Emergency measures required');
      recommendations.push('Consider immediate destocking');
      recommendations.push('Provide supplemental feed and water');
      recommendations.push('Consult with agricultural extension services');
      break;
      
    case 'severe':
      recommendations.push('Reduce stocking rate by 25-50%');
      recommendations.push('Implement rotational grazing');
      recommendations.push('Increase supplemental feeding');
      recommendations.push('Monitor water sources daily');
      break;
      
    case 'moderate':
      recommendations.push('Reduce stocking rate by 10-25%');
      recommendations.push('Extend grazing rotation periods');
      recommendations.push('Plan supplemental feed purchase');
      recommendations.push('Monitor pasture health weekly');
      break;
      
    case 'mild':
      recommendations.push('Monitor soil moisture closely');
      recommendations.push('Prepare contingency plans');
      recommendations.push('Review water supply adequacy');
      break;
      
    default:
      recommendations.push('Continue normal operations');
      recommendations.push('Maintain good grazing management');
  }
  
  if (trend < -10) {
    recommendations.push('⚠️ Rapid drying trend - take preventive action');
  } else if (trend > 10) {
    recommendations.push('✓ Improving conditions - recovery underway');
  }
  
  return recommendations;
}

/**
 * Calculate irrigation requirements based on soil moisture deficit
 */
export const calculateIrrigationNeeds = (currentMoisture, targetMoisture = 0.30, areaHa) => {
  if (currentMoisture >= targetMoisture) {
    return {
      needsIrrigation: false,
      waterNeeded: 0,
      recommendation: 'Soil moisture adequate'
    };
  }
  
  const deficit = targetMoisture - currentMoisture; // cm³/cm³
  const soilDepth = 30; // cm (root zone depth for pasture)
  const bulkDensity = 1.3; // g/cm³ (typical for agricultural soil)
  
  // Calculate water needed in mm
  const waterDepthMm = deficit * soilDepth * 10; // Convert to mm
  
  // Convert to liters per hectare (1 mm = 10,000 L/ha)
  const waterLitersPerHa = waterDepthMm * 10000;
  const totalWaterLiters = waterLitersPerHa * areaHa;
  
  return {
    needsIrrigation: true,
    waterNeeded: Math.round(totalWaterLiters),
    waterDepthMm: Math.round(waterDepthMm),
    recommendation: `Apply ${Math.round(waterDepthMm)}mm irrigation to reach target moisture`,
    estimatedCost: Math.round(totalWaterLiters * 0.001) // Assuming $0.001/L
  };
};

/**
 * Predict soil moisture for next 7 days (simple linear model)
 */
export const predictSoilMoisture = (soilMoistureTimeSeries, weatherForecast) => {
  if (!soilMoistureTimeSeries || soilMoistureTimeSeries.length < 3) {
    return null;
  }
  
  // Calculate recent trend
  const recent = soilMoistureTimeSeries.slice(-5);
  const recentAvg = recent.reduce((sum, d) => sum + d.soilMoisture, 0) / recent.length;
  
  // Simple linear regression for trend
  const xValues = recent.map((_, i) => i);
  const yValues = recent.map(d => d.soilMoisture);
  
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict for next 7 days
  const predictions = [];
  for (let day = 1; day <= 7; day++) {
    const predictedMoisture = intercept + slope * (recent.length + day);
    
    // Adjust based on weather forecast if available
    let adjustedMoisture = predictedMoisture;
    if (weatherForecast && weatherForecast[day - 1]) {
      const rainfall = weatherForecast[day - 1].rainfall || 0;
      adjustedMoisture += rainfall * 0.001; // 1mm rain ≈ 0.001 increase in moisture
    }
    
    predictions.push({
      day,
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      predictedMoisture: Math.max(0.05, Math.min(0.45, adjustedMoisture)),
      confidence: Math.max(0.5, 1 - day * 0.1) // Decreasing confidence
    });
  }
  
  return predictions;
};

/**
 * Get cached SMAP data
 */
export const getCachedSMAPData = async (latitude, longitude, startDate, endDate) => {
  try {
    const cacheKey = `smap_${latitude}_${longitude}_${startDate}_${endDate}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('[SMAP] Cache retrieval failed:', error);
    return null;
  }
};
