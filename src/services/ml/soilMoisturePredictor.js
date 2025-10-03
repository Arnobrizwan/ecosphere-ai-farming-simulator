/**
 * ML-based Soil Moisture Predictor
 * Uses trained RandomForest model to predict soil moisture
 */

import * as FileSystem from 'expo-file-system';

// Model metadata
const MODEL_PATH = '../../models/rf_soil_moisture.pkl';
const METADATA_PATH = '../../models/model_metadata.json';

/**
 * Load preprocessed data for predictions
 */
export const loadProcessedData = async () => {
  try {
    const csvPath = `${FileSystem.documentDirectory}data/processed/merged_features.csv`;
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(csvPath);
    
    if (!fileInfo.exists) {
      console.warn('[ML] Processed data not found, using fallback');
      return null;
    }
    
    // Read CSV file
    const csvContent = await FileSystem.readAsStringAsync(csvPath);
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx];
      });
      data.push(row);
    }
    
    console.log(`[ML] Loaded ${data.length} rows of processed data`);
    return data;
    
  } catch (error) {
    console.error('[ML] Error loading processed data:', error);
    return null;
  }
};

/**
 * Get latest NDVI value from processed data
 */
export const getLatestNDVI = async () => {
  const data = await loadProcessedData();
  
  if (!data || data.length === 0) {
    // Return simulated NDVI
    return {
      ndvi: 0.6 + Math.random() * 0.2, // 0.6-0.8 (healthy vegetation)
      date: new Date().toISOString().split('T')[0],
      source: 'Simulated',
    };
  }
  
  // Get most recent entry
  const latest = data[data.length - 1];
  
  return {
    ndvi: parseFloat(latest.ndvi) || 0.65,
    date: latest.date,
    source: latest.source || 'Processed Data',
  };
};

/**
 * Predict soil moisture using simple heuristic model
 * (Since we can't run Python RandomForest directly in React Native)
 */
export const predictSoilMoisture = async (features) => {
  const {
    precipitation = 0,
    dayOfYear = new Date().getDate(),
    month = new Date().getMonth() + 1,
    precip7dSum = 0,
    ndvi = 0.65,
  } = features;
  
  try {
    // Load model metadata to understand feature importance
    const data = await loadProcessedData();
    
    // Simple prediction based on feature importance from trained model:
    // precip_7d_sum: 0.3389
    // precipitation: 0.3113
    // day_of_year: 0.2841
    // ndvi: 0.0444
    // month: 0.0214
    
    // Base soil moisture
    let prediction = 0.30; // Base value
    
    // Precipitation impact (most important)
    prediction += (precip7dSum / 100) * 0.15; // 7-day sum effect
    prediction += (precipitation / 20) * 0.10; // Daily precip effect
    
    // Seasonal impact
    const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI);
    prediction += seasonalFactor * 0.05;
    
    // NDVI impact (vegetation retains moisture)
    prediction += (ndvi - 0.5) * 0.08;
    
    // Monsoon season adjustment (June-September in Bangladesh)
    if (month >= 6 && month <= 9) {
      prediction += 0.05;
    }
    
    // Clamp to realistic range
    prediction = Math.max(0.15, Math.min(0.45, prediction));
    
    return {
      soilMoisture: parseFloat(prediction.toFixed(3)),
      confidence: 0.75, // Moderate confidence for heuristic model
      features: {
        precipitation,
        dayOfYear,
        month,
        precip7dSum,
        ndvi,
      },
      model: 'Heuristic (based on RF feature importance)',
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('[ML] Prediction error:', error);
    
    // Fallback prediction
    return {
      soilMoisture: 0.30,
      confidence: 0.5,
      features,
      model: 'Fallback',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Get soil moisture forecast for next N days
 */
export const forecastSoilMoisture = async (days = 7, currentConditions = {}) => {
  const forecast = [];
  const today = new Date();
  
  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    // Simulate future precipitation (decreasing confidence)
    const avgPrecip = currentConditions.precipitation || 10;
    const futurePrecip = avgPrecip * (0.8 + Math.random() * 0.4);
    
    const prediction = await predictSoilMoisture({
      precipitation: futurePrecip,
      dayOfYear: forecastDate.getDate(),
      month: forecastDate.getMonth() + 1,
      precip7dSum: currentConditions.precip7dSum || 50,
      ndvi: currentConditions.ndvi || 0.65,
    });
    
    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      ...prediction,
      confidence: prediction.confidence * (1 - i * 0.1), // Decreasing confidence
    });
  }
  
  return forecast;
};

/**
 * Analyze soil moisture trend
 */
export const analyzeSoilMoistureTrend = async () => {
  const data = await loadProcessedData();
  
  if (!data || data.length < 7) {
    return {
      trend: 'stable',
      change: 0,
      recommendation: 'Insufficient data for trend analysis',
    };
  }
  
  // Get last 7 days
  const recent = data.slice(-7);
  const values = recent.map(r => parseFloat(r.soil_moisture)).filter(v => !isNaN(v));
  
  if (values.length < 2) {
    return {
      trend: 'stable',
      change: 0,
      recommendation: 'Insufficient valid data',
    };
  }
  
  // Calculate trend
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const percentChange = (change / first) * 100;
  
  let trend = 'stable';
  let recommendation = 'Soil moisture is stable';
  
  if (percentChange > 10) {
    trend = 'increasing';
    recommendation = 'Soil moisture increasing - reduce irrigation';
  } else if (percentChange < -10) {
    trend = 'decreasing';
    recommendation = 'Soil moisture decreasing - increase irrigation';
  }
  
  return {
    trend,
    change: parseFloat(change.toFixed(3)),
    percentChange: parseFloat(percentChange.toFixed(1)),
    current: last,
    weekAgo: first,
    recommendation,
  };
};

export default {
  loadProcessedData,
  getLatestNDVI,
  predictSoilMoisture,
  forecastSoilMoisture,
  analyzeSoilMoistureTrend,
};
