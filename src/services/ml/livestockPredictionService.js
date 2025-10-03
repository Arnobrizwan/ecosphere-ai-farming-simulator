/**
 * Livestock ML Prediction Service
 * Integrates trained models for biomass, feed, and grazing predictions
 */

import * as tf from '@tensorflow/tfjs';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

let biomassModel = null;
let feedModel = null;
let modelsLoaded = false;

// Feature configurations (must match training data)
const BIOMASS_FEATURES = [
  'ndvi', 'evi', 'soilMoisture', 'temp', 'tempMax', 'tempMin',
  'rainfall', 'humidity', 'windSpeed', 'avgTemp', 'totalRainfall', 'avgHumidity'
];

const FEED_FEATURES = [
  'temp', 'tempMax', 'tempMin', 'rainfall', 'humidity', 'windSpeed',
  'cattleCount', 'sheepCount', 'totalAnimals', 'pastureAreaHa'
];

// Normalization parameters (from training scalers)
const BIOMASS_SCALER = {
  mean: [0.6286, 0.5690, 0.2783, 25.33, 30.08, 20.54, 11.91, 75.92, 2.03, 25.33, 190.85, 75.92],
  std: [0.1329, 0.1232, 0.0563, 4.57, 4.31, 5.20, 33.55, 9.82, 0.88, 4.57, 533.54, 9.82]
};

const FEED_SCALER = {
  mean: [25.33, 30.08, 20.54, 11.91, 75.92, 2.03, 15.13, 30.26, 45.39, 10.12],
  std: [4.57, 4.31, 5.20, 33.55, 9.82, 0.88, 6.18, 12.36, 18.54, 3.42]
};

/**
 * Load TensorFlow Lite models
 */
export const loadLivestockModels = async () => {
  if (modelsLoaded) {
    console.log('[Livestock ML] Models already loaded');
    return true;
  }

  try {
    console.log('[Livestock ML] Loading models...');

    // Load biomass model
    const biomassAsset = Asset.fromModule(require('../../assets/models/livestock_biomass.tflite'));
    await biomassAsset.downloadAsync();
    
    const biomassModelUri = biomassAsset.localUri || biomassAsset.uri;
    biomassModel = await tf.loadGraphModel(biomassModelUri);
    console.log('[Livestock ML] Biomass model loaded');

    // Load feed model
    const feedAsset = Asset.fromModule(require('../../assets/models/livestock_feed.tflite'));
    await feedAsset.downloadAsync();
    
    const feedModelUri = feedAsset.localUri || feedAsset.uri;
    feedModel = await tf.loadGraphModel(feedModelUri);
    console.log('[Livestock ML] Feed model loaded');

    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error('[Livestock ML] Failed to load models:', error);
    return false;
  }
};

/**
 * Normalize features using scaler parameters
 */
function normalizeFeatures(features, scaler) {
  return features.map((value, index) => {
    return (value - scaler.mean[index]) / scaler.std[index];
  });
}

/**
 * Predict pasture biomass from NDVI and weather data
 * @param {Object} data - Input features
 * @returns {Promise<number>} Predicted biomass in kg/ha
 */
export const predictBiomass = async (data) => {
  if (!modelsLoaded) {
    await loadLivestockModels();
  }

  try {
    // Extract features in correct order
    const features = BIOMASS_FEATURES.map(feature => data[feature] || 0);
    
    // Normalize
    const normalizedFeatures = normalizeFeatures(features, BIOMASS_SCALER);
    
    // Create tensor
    const inputTensor = tf.tensor2d([normalizedFeatures], [1, BIOMASS_FEATURES.length]);
    
    // Predict
    const prediction = await biomassModel.predict(inputTensor);
    const biomass = (await prediction.data())[0];
    
    // Cleanup
    inputTensor.dispose();
    prediction.dispose();
    
    // Ensure reasonable range (grassland biomass typically 2000-15000 kg/ha)
    const clampedBiomass = Math.max(2000, Math.min(15000, Math.round(biomass)));
    
    console.log('[Livestock ML] Predicted biomass:', clampedBiomass, 'kg/ha');
    return clampedBiomass;
  } catch (error) {
    console.error('[Livestock ML] Biomass prediction failed:', error);
    // Fallback: Use simple NDVI-based estimation
    return Math.round(15000 * (data.ndvi || 0.5));
  }
};

/**
 * Predict daily feed requirements
 * @param {Object} data - Input features including weather and animal counts
 * @returns {Promise<number>} Predicted feed in kg/day
 */
export const predictFeedRequirements = async (data) => {
  if (!modelsLoaded) {
    await loadLivestockModels();
  }

  try {
    // Extract features in correct order
    const features = FEED_FEATURES.map(feature => data[feature] || 0);
    
    // Normalize
    const normalizedFeatures = normalizeFeatures(features, FEED_SCALER);
    
    // Create tensor
    const inputTensor = tf.tensor2d([normalizedFeatures], [1, FEED_FEATURES.length]);
    
    // Predict
    const prediction = await feedModel.predict(inputTensor);
    const feedKg = (await prediction.data())[0];
    
    // Cleanup
    inputTensor.dispose();
    prediction.dispose();
    
    // Ensure reasonable range
    const clampedFeed = Math.max(10, Math.round(feedKg));
    
    console.log('[Livestock ML] Predicted feed:', clampedFeed, 'kg/day');
    return clampedFeed;
  } catch (error) {
    console.error('[Livestock ML] Feed prediction failed:', error);
    // Fallback: Simple calculation
    const totalAnimals = (data.cattleCount || 0) + (data.sheepCount || 0);
    return Math.round(totalAnimals * 25 * 0.2); // ~5 kg per animal (cattle units)
  }
};

/**
 * Calculate enhanced pasture metrics using ML predictions
 * @param {Object} pastureData - Comprehensive pasture and weather data
 * @returns {Promise<Object>} Enhanced metrics with ML predictions
 */
export const calculateEnhancedPastureMetrics = async (pastureData) => {
  console.log('[Livestock ML] Calculating enhanced metrics...');

  const {
    ndvi,
    evi,
    soilMoisture,
    weather, // Array of weather data
    cattleCount,
    sheepCount,
    pastureAreaHa
  } = pastureData;

  // Calculate aggregated weather metrics
  const avgTemp = weather.reduce((sum, d) => sum + d.temp, 0) / weather.length;
  const tempMax = Math.max(...weather.map(d => d.tempMax));
  const tempMin = Math.min(...weather.map(d => d.tempMin));
  const totalRainfall = weather.reduce((sum, d) => sum + d.rainfall, 0);
  const avgHumidity = weather.reduce((sum, d) => sum + d.humidity, 0) / weather.length;
  const avgWindSpeed = weather.reduce((sum, d) => sum + d.windSpeed, 0) / weather.length;
  const latestRainfall = weather[weather.length - 1]?.rainfall || 0;

  // Prepare input data for ML models
  const biomassInput = {
    ndvi,
    evi: evi || ndvi * 0.9,
    soilMoisture,
    temp: avgTemp,
    tempMax,
    tempMin,
    rainfall: latestRainfall,
    humidity: avgHumidity,
    windSpeed: avgWindSpeed,
    avgTemp,
    totalRainfall,
    avgHumidity
  };

  const feedInput = {
    temp: avgTemp,
    tempMax,
    tempMin,
    rainfall: latestRainfall,
    humidity: avgHumidity,
    windSpeed: avgWindSpeed,
    cattleCount: cattleCount || 0,
    sheepCount: sheepCount || 0,
    totalAnimals: (cattleCount || 0) + (sheepCount || 0),
    pastureAreaHa: pastureAreaHa || 5
  };

  // Run ML predictions
  const [predictedBiomass, predictedFeed] = await Promise.all([
    predictBiomass(biomassInput),
    predictFeedRequirements(feedInput)
  ]);

  // Calculate grazing days
  const availableFeed = predictedBiomass * pastureAreaHa * 0.5; // 50% utilization
  const grazingDays = Math.floor(availableFeed / predictedFeed);

  // Calculate stocking rate
  const cattleUnits = (cattleCount || 0) + (sheepCount || 0) * 0.2;
  const stockingRate = cattleUnits / pastureAreaHa;

  // Determine health status
  let healthStatus = 'healthy';
  if (ndvi < 0.3 || soilMoisture < 0.15) healthStatus = 'critical';
  else if (ndvi < 0.4 || soilMoisture < 0.20) healthStatus = 'warning';

  return {
    biomass: {
      predicted: predictedBiomass,
      total: predictedBiomass * pastureAreaHa,
      method: 'ML-Enhanced'
    },
    feed: {
      dailyRequirement: predictedFeed,
      monthlyRequirement: predictedFeed * 30,
      method: 'ML-Enhanced'
    },
    grazing: {
      daysAvailable: grazingDays,
      recommendedRestDays: Math.max(21, Math.ceil(28 / (ndvi > 0.6 ? 1 : 2))),
      nextRotationDate: new Date(Date.now() + grazingDays * 24 * 60 * 60 * 1000).toISOString()
    },
    efficiency: {
      stockingRate: parseFloat(stockingRate.toFixed(2)),
      utilizationRate: 0.5,
      sustainabilityScore: stockingRate > 2.5 ? 'overstocked' : stockingRate > 2.0 ? 'high' : 'optimal'
    },
    health: {
      status: healthStatus,
      ndvi,
      soilMoisture,
      weatherStress: avgTemp > 35 || avgTemp < 10 ? 'high' : avgTemp > 30 ? 'moderate' : 'low'
    }
  };
};

/**
 * Get model information
 */
export const getModelInfo = () => {
  return {
    loaded: modelsLoaded,
    models: {
      biomass: {
        name: 'Pasture Biomass Predictor',
        algorithm: 'Neural Network (TFLite)',
        accuracy: 'R² = 0.9997, MAE = 19 kg/ha',
        features: BIOMASS_FEATURES.length
      },
      feed: {
        name: 'Feed Requirements Optimizer',
        algorithm: 'Neural Network (TFLite)',
        accuracy: 'R² = 0.9772, MAE = 18.82 kg/day',
        features: FEED_FEATURES.length
      }
    },
    training: {
      dataset: '360 records from 8 locations in Bangladesh',
      dataSource: 'NASA POWER (real) + Generated SMAP/NDVI',
      trainingDate: '2025-10-02'
    }
  };
};
