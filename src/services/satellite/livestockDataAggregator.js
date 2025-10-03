/**
 * UC56-UC63: Livestock Data Aggregator
 * Combines MODIS NDVI, SMAP soil moisture, NASA POWER weather, and Sentinel-2 imagery
 * for comprehensive livestock management
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, addDoc } from 'firebase/firestore';
import {
  calculateEnhancedPastureMetrics,
  loadLivestockModels
} from '../ml/livestockPredictionService';
import { 
  fetchPastureNDVI, 
  downloadNDVIData, 
  detectPastureStress, 
  recommendGrazingRotation,
  calculateGrassBiomass 
} from './modisNDVIService';
import { 
  fetchPastureSoilMoisture, 
  detectDrought,
  calculateIrrigationNeeds,
  predictSoilMoisture
} from './smapService';
import { 
  fetchWeatherForFeedPlanning, 
  calculateWeatherAdjustedFeed,
  calculateHeatStressIndex,
  calculateColdStress,
  calculateGrazingFavorability
} from './nasaPowerService';
import { 
  fetchHighResNDVI,
  shouldUseSentinel,
  boundarytoBbox
} from './sentinelService';

/**
 * UC56: Get complete pasture health assessment
 * Combines all satellite data sources
 */
export const getCompletePastureAssessment = async (pastureId, startDate, endDate) => {
  console.log('[Livestock Aggregator] Starting assessment for pasture:', pastureId);
  
  // Load ML models in background
  loadLivestockModels().catch(err => {
    console.warn('[Livestock Aggregator] ML models not available, using fallback calculations');
  });
  
  try {
    // Get pasture data from Firestore
    const pastureDoc = await getDoc(doc(db, 'pastures', pastureId));
    
    if (!pastureDoc.exists()) {
      throw new Error('Pasture not found');
    }
    
    const pasture = pastureDoc.data();
    const { boundary, animalCount, areaHa, cropType = 'mixed_grass' } = pasture;
    
    // Extract center point for data fetching
    const centerPoint = extractCentroid(boundary);
    
    console.log('[Livestock Aggregator] Pasture details:', { 
      areaHa, 
      animalCount, 
      centerPoint 
    });
    
    // Fetch all data sources in parallel
    console.log('[Livestock Aggregator] Fetching data from all sources...');
    
    const dataFetchPromises = [
      // MODIS NDVI (or Sentinel-2 for small pastures)
      shouldUseSentinel(areaHa) 
        ? fetchHighResNDVI(boundarytoBbox(boundary), endDate).catch(err => {
            console.warn('[Livestock Aggregator] Sentinel-2 failed, falling back to MODIS:', err.message);
            return fetchPastureNDVI(boundary, startDate, endDate);
          })
        : fetchPastureNDVI(boundary, startDate, endDate),
      
      // SMAP soil moisture
      fetchPastureSoilMoisture(centerPoint.latitude, centerPoint.longitude, startDate, endDate)
        .catch(err => {
          console.warn('[Livestock Aggregator] SMAP fetch failed:', err.message);
          return []; // Return empty array as fallback
        }),
      
      // NASA POWER weather
      fetchWeatherForFeedPlanning(centerPoint.latitude, centerPoint.longitude, startDate, endDate)
        .catch(err => {
          console.warn('[Livestock Aggregator] Weather fetch failed:', err.message);
          return []; // Return empty array as fallback
        })
    ];
    
    const [ndviTaskIdOrImage, soilMoisture, weather] = await Promise.all(dataFetchPromises);
    
    // Process NDVI data
    let ndviData;
    if (typeof ndviTaskIdOrImage === 'string') {
      // MODIS task ID - need to wait for processing
      console.log('[Livestock Aggregator] Waiting for MODIS processing...');
      ndviData = await downloadNDVIData(ndviTaskIdOrImage);
    } else {
      // Sentinel-2 image data
      console.log('[Livestock Aggregator] Using Sentinel-2 high-resolution data');
      // For Sentinel, we have image but need to estimate NDVI values
      ndviData = [{
        date: endDate,
        ndvi: 0.55, // Placeholder - would extract from image in production
        evi: 0.50,
        quality: 'good',
        source: 'Sentinel-2'
      }];
    }
    
    console.log('[Livestock Aggregator] Data fetched successfully');
    console.log(`  - NDVI observations: ${ndviData.length}`);
    console.log(`  - Soil moisture readings: ${soilMoisture.length}`);
    console.log(`  - Weather days: ${weather.length}`);
    
    // Perform analysis
    const latestNDVI = ndviData[ndviData.length - 1] || { ndvi: 0.45 };
    const stressAnalysis = detectPastureStress(ndviData);
    const droughtAnalysis = detectDrought(soilMoisture);
    const grazingPlan = recommendGrazingRotation(latestNDVI.ndvi, animalCount, areaHa);
    
    // Weather analysis
    const heatStress = calculateHeatStressIndex(weather);
    const coldStress = calculateColdStress(weather);
    const grazingFavorability = calculateGrazingFavorability(weather);
    
    // Soil moisture prediction
    const soilMoisturePrediction = predictSoilMoisture(soilMoisture, weather);
    
    // Irrigation needs
    const latestSoilMoisture = soilMoisture[soilMoisture.length - 1]?.soilMoisture || 0.25;
    const irrigationNeeds = calculateIrrigationNeeds(latestSoilMoisture, 0.30, areaHa);
    
    // Try ML-enhanced calculations
    let mlEnhancedMetrics = null;
    try {
      mlEnhancedMetrics = await calculateEnhancedPastureMetrics({
        ndvi: latestNDVI.ndvi,
        evi: latestNDVI.evi || latestNDVI.ndvi * 0.9,
        soilMoisture: latestSoilMoisture,
        weather,
        cattleCount: animalCount,
        sheepCount: 0, // Could be extracted from pasture data
        pastureAreaHa: areaHa
      });
      console.log('[Livestock Aggregator] ML-enhanced metrics calculated');
    } catch (error) {
      console.warn('[Livestock Aggregator] ML prediction failed, using traditional methods:', error.message);
    }
    
    // Compile comprehensive assessment (use ML predictions if available)
    const biomassKgPerHa = mlEnhancedMetrics?.biomass?.predicted || stressAnalysis.biomass;
    const grazingDaysCalculated = mlEnhancedMetrics?.grazing?.daysAvailable || grazingPlan.grazingDays;
    
    const assessment = {
      pastureId,
      assessmentDate: new Date().toISOString(),
      pasture: {
        areaHa,
        animalCount,
        cropType,
        location: centerPoint
      },
      
      // Vegetation health
      ndvi: {
        current: latestNDVI.ndvi,
        timeSeries: ndviData,
        biomassKgPerHa,
        trend: stressAnalysis.trend,
        predictionMethod: mlEnhancedMetrics ? 'ML-Enhanced' : 'Traditional'
      },
      
      // Pasture health status
      health: {
        status: stressAnalysis.status,
        alerts: [...stressAnalysis.alerts, droughtAnalysis.alert].filter(Boolean),
        recommendations: [
          ...stressAnalysis.alerts,
          ...droughtAnalysis.recommendations,
          ...heatStress.recommendations,
          ...coldStress.recommendations
        ].filter(Boolean)
      },
      
      // Drought analysis
      drought: {
        level: droughtAnalysis.droughtLevel,
        severity: droughtAnalysis.severity,
        avgSoilMoisture: droughtAnalysis.avgMoisture,
        trend: droughtAnalysis.trend,
        prediction: soilMoisturePrediction
      },
      
      // Irrigation
      irrigation: irrigationNeeds,
      
      // Grazing management (use ML predictions if available)
      grazing: {
        ...grazingPlan,
        grazingDays: grazingDaysCalculated,
        favorability: grazingFavorability.averageScore,
        favorableDays: grazingFavorability.favorableDays,
        mlEnhanced: mlEnhancedMetrics !== null,
        efficiency: mlEnhancedMetrics?.efficiency
      },
      
      // Weather conditions
      weather: {
        avgTemp: weather.reduce((sum, d) => sum + d.temp, 0) / weather.length,
        totalRainfall: weather.reduce((sum, d) => sum + d.rainfall, 0),
        avgHumidity: weather.reduce((sum, d) => sum + d.humidity, 0) / weather.length,
        heatStress: heatStress.summary,
        coldStress: {
          coldDays: coldStress.coldStressDays,
          severeDays: coldStress.severeColdDays
        }
      },
      
      // Overall score
      overallScore: calculateOverallScore(stressAnalysis, droughtAnalysis, heatStress, coldStress),
      
      // Data sources used
      dataSources: {
        ndvi: ndviData[0]?.source || 'MODIS',
        soilMoisture: 'SMAP',
        weather: 'NASA POWER'
      }
    };
    
    // Save to Firestore
    console.log('[Livestock Aggregator] Saving assessment to Firestore...');
    await addDoc(collection(db, 'pasture_assessments'), assessment);
    
    console.log('[Livestock Aggregator] Assessment complete');
    return assessment;
    
  } catch (error) {
    console.error('[Livestock Aggregator] Assessment failed:', error);
    throw new Error(`Pasture assessment failed: ${error.message}`);
  }
};

/**
 * UC58: Generate optimized feed plan with weather adjustments
 */
export const generateFeedPlan = async (farmId, startDate, endDate) => {
  console.log('[Livestock Aggregator] Generating feed plan for farm:', farmId);

  try {
    const farmDoc = await getDoc(doc(db, 'farms', farmId));
    
    if (!farmDoc.exists()) {
      throw new Error('Farm not found');
    }

    const farm = farmDoc.data();
    const { location, livestock = [] } = farm;
    
    // Fetch weather forecast
    const weather = await fetchWeatherForFeedPlanning(
      location.latitude, 
      location.longitude, 
      startDate, 
      endDate
    );
    
    // Calculate base feed requirements by animal type
    const cattleCount = livestock.filter(a => a.type === 'cattle').reduce((sum, a) => sum + a.count, 0);
    const sheepCount = livestock.filter(a => a.type === 'sheep').reduce((sum, a) => sum + a.count, 0);
    const goatCount = livestock.filter(a => a.type === 'goat').reduce((sum, a) => sum + a.count, 0);
    
    // Base daily feed requirements (kg dry matter per day)
    const cattleFeed = cattleCount * 25;
    const sheepFeed = sheepCount * 2.5;
    const goatFeed = goatCount * 2.0;
    const totalBaselineFeed = cattleFeed + sheepFeed + goatFeed;
    
    // Adjust for weather
    const weatherAdjustment = calculateWeatherAdjustedFeed(totalBaselineFeed, weather);
    
    // Calculate costs
    const feedCostPerKg = 0.35; // USD per kg
    const dailyCost = weatherAdjustment.adjustedFeedKg * feedCostPerKg;
    const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const totalCost = dailyCost * periodDays;
    
    const feedPlan = {
      farmId,
      period: { startDate, endDate, days: periodDays },
      livestock: {
        cattle: cattleCount,
        sheep: sheepCount,
        goats: goatCount,
        total: cattleCount + sheepCount + goatCount
      },
      feed: {
        baselineDailyKg: totalBaselineFeed,
        adjustedDailyKg: weatherAdjustment.adjustedFeedKg,
        adjustmentFactor: weatherAdjustment.adjustmentFactor,
        adjustmentReason: weatherAdjustment.reason,
        totalPeriodKg: weatherAdjustment.adjustedFeedKg * periodDays
      },
      cost: {
        dailyCost,
        totalCost,
        currency: 'USD'
      },
      weather: weatherAdjustment.weatherSummary,
      createdAt: new Date().toISOString()
    };
    
    // Save to Firestore
    await addDoc(collection(db, 'feed_plans'), feedPlan);
    
    console.log('[Livestock Aggregator] Feed plan generated:', {
      dailyFeed: weatherAdjustment.adjustedFeedKg,
      totalCost
    });
    
    return feedPlan;
    
  } catch (error) {
    console.error('[Livestock Aggregator] Feed plan generation failed:', error);
    throw new Error(`Feed plan generation failed: ${error.message}`);
  }
};

/**
 * UC62: Calculate livestock environmental impact
 */
export const calculateLivestockImpact = async (farmId) => {
  console.log('[Livestock Aggregator] Calculating environmental impact for farm:', farmId);

  try {
    const farmDoc = await getDoc(doc(db, 'farms', farmId));

    if (!farmDoc.exists()) {
      throw new Error('Farm not found');
    }

    const farm = farmDoc.data();
    const { livestock = [], pastures = [] } = farm;
    
    // Count animals by type
    const cattleCount = livestock.filter(a => a.type === 'cattle').reduce((sum, a) => sum + a.count, 0);
    const sheepCount = livestock.filter(a => a.type === 'sheep').reduce((sum, a) => sum + a.count, 0);
    const goatCount = livestock.filter(a => a.type === 'goat').reduce((sum, a) => sum + a.count, 0);
    
    // Emission factors (kg CO2e per animal per year)
    // Source: IPCC and FAO livestock emission guidelines
    const cattleEmissions = cattleCount * 2200; // Includes enteric fermentation methane
    const sheepEmissions = sheepCount * 500;
    const goatEmissions = goatCount * 400;
    const totalEmissions = cattleEmissions + sheepEmissions + goatEmissions;
    
    // Breakdown by source
    const methaneEmissions = totalEmissions * 0.45; // ~45% is methane
    const nitrousOxideEmissions = totalEmissions * 0.15; // ~15% is N2O
    const co2Emissions = totalEmissions * 0.40; // ~40% is direct CO2
    
    // Land use efficiency
    const totalPastureArea = pastures.reduce((sum, p) => sum + (p.areaHa || 0), 0);
    const cattleUnits = cattleCount + (sheepCount * 0.2) + (goatCount * 0.2); // Convert to cattle units
    const stockingRate = totalPastureArea > 0 ? cattleUnits / totalPastureArea : 0;
    
    // Sustainability assessment
    let sustainabilityScore = 'optimal';
    if (stockingRate > 2.5) sustainabilityScore = 'overstocked';
    else if (stockingRate > 2.0) sustainabilityScore = 'high';
    else if (stockingRate < 0.5) sustainabilityScore = 'understocked';
    
    // Water footprint (liters per day)
    const waterFootprint = (cattleCount * 50) + (sheepCount * 8) + (goatCount * 8);
    
    // Feed carbon footprint
    const feedCarbonFootprint = totalEmissions * 0.10; // Feed production ~10% of total
    
    const impact = {
      farmId,
      livestock: {
        cattle: cattleCount,
        sheep: sheepCount,
        goats: goatCount,
        total: cattleCount + sheepCount + goatCount,
        cattleUnits
      },
      carbonFootprint: {
        totalAnnualKgCO2e: Math.round(totalEmissions),
        methaneKgCO2e: Math.round(methaneEmissions),
        nitrousOxideKgCO2e: Math.round(nitrousOxideEmissions),
        co2KgCO2e: Math.round(co2Emissions),
        feedProductionKgCO2e: Math.round(feedCarbonFootprint),
        perAnimalKgCO2e: Math.round(totalEmissions / (cattleCount + sheepCount + goatCount))
      },
      landUse: {
        totalPastureHa: totalPastureArea,
        stockingRate,
        cattleUnitsPerHa: totalPastureArea > 0 ? (cattleUnits / totalPastureArea).toFixed(2) : 0,
        sustainabilityScore
      },
      waterFootprint: {
        dailyLiters: waterFootprint,
        annualLiters: waterFootprint * 365
      },
      recommendations: generateSustainabilityRecommendations(stockingRate, totalEmissions, cattleUnits),
      calculatedAt: new Date().toISOString()
    };
    
    // Save to Firestore
    await addDoc(collection(db, 'livestock_impacts'), impact);
    
    console.log('[Livestock Aggregator] Impact calculated:', {
      emissions: totalEmissions,
      stockingRate,
      score: sustainabilityScore
    });
    
    return impact;
    
  } catch (error) {
    console.error('[Livestock Aggregator] Impact calculation failed:', error);
    throw new Error(`Impact calculation failed: ${error.message}`);
  }
};

/**
 * Helper: Extract centroid from boundary
 */
function extractCentroid(boundary) {
  if (!boundary) {
    throw new Error('Boundary is required');
  }
  
  if (boundary.type === 'Point') {
    return {
      latitude: boundary.coordinates[1],
      longitude: boundary.coordinates[0]
    };
  }
  
  if (boundary.type === 'Polygon') {
    const coords = boundary.coordinates[0];
    const sumLat = coords.reduce((sum, c) => sum + c[1], 0);
    const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
    
    return {
      latitude: sumLat / coords.length,
      longitude: sumLng / coords.length
    };
  }
  
  // Fallback to lat/lng properties
  if (boundary.latitude && boundary.longitude) {
    return {
      latitude: boundary.latitude,
      longitude: boundary.longitude
    };
  }
  
  throw new Error('Invalid boundary format');
}

/**
 * Calculate overall pasture health score (0-100)
 */
function calculateOverallScore(stressAnalysis, droughtAnalysis, heatStress, coldStress) {
  let score = 100;
  
  // NDVI/vegetation health (40% weight)
  if (stressAnalysis.status === 'critical') score -= 40;
  else if (stressAnalysis.status === 'warning') score -= 20;
  else if (stressAnalysis.status === 'healthy') score -= 0;
  
  // Drought (30% weight)
  if (droughtAnalysis.droughtLevel === 'exceptional') score -= 30;
  else if (droughtAnalysis.droughtLevel === 'extreme') score -= 25;
  else if (droughtAnalysis.droughtLevel === 'severe') score -= 20;
  else if (droughtAnalysis.droughtLevel === 'moderate') score -= 10;
  else if (droughtAnalysis.droughtLevel === 'mild') score -= 5;
  
  // Heat stress (15% weight)
  if (heatStress.summary.emergencyDays > 0) score -= 15;
  else if (heatStress.summary.dangerDays > 2) score -= 10;
  else if (heatStress.summary.alertDays > 5) score -= 5;
  
  // Cold stress (15% weight)
  if (coldStress.severeColdDays > 3) score -= 15;
  else if (coldStress.moderateColdDays > 5) score -= 10;
  else if (coldStress.mildColdDays > 7) score -= 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate sustainability recommendations
 */
function generateSustainabilityRecommendations(stockingRate, emissions, cattleUnits) {
  const recommendations = [];
  
  if (stockingRate > 2.5) {
    recommendations.push('⚠️ Overstocking detected - reduce animal numbers by 20-30%');
    recommendations.push('Consider rotational grazing to improve pasture recovery');
    recommendations.push('Monitor for overgrazing signs weekly');
  } else if (stockingRate > 2.0) {
    recommendations.push('Stocking rate is high - monitor pasture condition closely');
    recommendations.push('Implement strategic grazing rotation');
  } else if (stockingRate < 0.5) {
    recommendations.push('Pasture is understocked - consider increasing herd size');
    recommendations.push('More animals could improve economic efficiency');
  }
  
  const emissionsPerHa = emissions / cattleUnits;
  if (emissionsPerHa > 2000) {
    recommendations.push('Consider emission reduction strategies');
    recommendations.push('Improve feed quality to reduce methane emissions');
    recommendations.push('Explore carbon offset opportunities');
  }
  
  return recommendations;
}
