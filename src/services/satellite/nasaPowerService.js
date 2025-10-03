/**
 * UC58 - NASA POWER Weather Service for Feed Planning
 * Fetches climate and weather data from NASA POWER API
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NASA_POWER_API = 'https://power.larc.nasa.gov/api/temporal/daily/point';

/**
 * UC58: Fetch weather data for feed planning
 * @param {number} latitude - Farm latitude
 * @param {number} longitude - Farm longitude
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} Weather data time series
 */
export const fetchWeatherForFeedPlanning = async (latitude, longitude, startDate, endDate) => {
  console.log('[NASA POWER] Fetching weather data for:', { latitude, longitude, startDate, endDate });
  
  try {
    const params = {
      parameters: 'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN',
      community: 'AG',
      longitude,
      latitude,
      start: startDate.replace(/-/g, ''),
      end: endDate.replace(/-/g, ''),
      format: 'JSON'
    };
    
    const response = await axios.get(NASA_POWER_API, { params });
    const data = response.data.properties.parameter;
    
    // Transform to time series
    const dates = Object.keys(data.T2M);
    const weatherData = dates.map(date => ({
      date: `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,
      temp: data.T2M[date],
      tempMax: data.T2M_MAX[date],
      tempMin: data.T2M_MIN[date],
      rainfall: data.PRECTOTCORR[date],
      humidity: data.RH2M[date],
      windSpeed: data.WS2M[date],
      solarRadiation: data.ALLSKY_SFC_SW_DWN[date]
    }));
    
    // Cache results
    const cacheKey = `power_${latitude}_${longitude}_${startDate}_${endDate}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(weatherData));
    
    console.log('[NASA POWER] Fetched', weatherData.length, 'days of weather data');
    return weatherData;
    
  } catch (error) {
    console.error('[NASA POWER] Fetch failed:', error.message);
    if (error.response) {
      console.error('[NASA POWER] Error response:', error.response.data);
    }
    throw new Error(`NASA POWER fetch failed: ${error.message}`);
  }
};

/**
 * UC58: Calculate weather-adjusted feed requirements
 * @param {number} baselineFeedKg - Base feed requirement per day
 * @param {Array} weatherData - Weather time series
 * @returns {Object} Adjusted feed plan
 */
export const calculateWeatherAdjustedFeed = (baselineFeedKg, weatherData) => {
  if (!weatherData || weatherData.length === 0) {
    return {
      adjustedFeedKg: baselineFeedKg,
      adjustmentFactor: 1.0,
      reason: 'No weather data available'
    };
  }
  
  const avgTemp = weatherData.reduce((sum, d) => sum + d.temp, 0) / weatherData.length;
  const totalRainfall = weatherData.reduce((sum, d) => sum + d.rainfall, 0);
  const avgHumidity = weatherData.reduce((sum, d) => sum + d.humidity, 0) / weatherData.length;
  
  // Temperature stress adjustments
  let tempAdjustment = 1.0;
  let tempReason = '';
  
  if (avgTemp < 0) {
    tempAdjustment = 1.35; // +35% in extreme cold
    tempReason = 'Extreme cold increases energy needs significantly';
  } else if (avgTemp < 5) {
    tempAdjustment = 1.25; // +25% in severe cold
    tempReason = 'Severe cold weather increases energy requirements';
  } else if (avgTemp < 15) {
    tempAdjustment = 1.10; // +10% in cool weather
    tempReason = 'Cool weather increases energy needs moderately';
  } else if (avgTemp > 35) {
    tempAdjustment = 0.90; // -10% in extreme heat
    tempReason = 'Extreme heat reduces appetite';
  } else if (avgTemp > 30) {
    tempAdjustment = 0.95; // -5% in hot weather
    tempReason = 'Hot weather slightly reduces feed intake';
  } else {
    tempReason = 'Temperature within normal range';
  }
  
  // Humidity adjustment (high humidity in heat is worse)
  let humidityAdjustment = 1.0;
  if (avgTemp > 28 && avgHumidity > 70) {
    humidityAdjustment = 0.92; // -8% in hot+humid
    tempReason += '; High humidity further reduces appetite';
  }
  
  // Rainfall/wetness adjustment (wet conditions increase energy needs)
  let rainfallAdjustment = 1.0;
  const avgDailyRain = totalRainfall / weatherData.length;
  if (avgDailyRain > 10) {
    rainfallAdjustment = 1.05; // +5% in very wet conditions
    tempReason += '; Wet conditions increase energy needs';
  }
  
  const totalAdjustment = tempAdjustment * humidityAdjustment * rainfallAdjustment;
  
  return {
    adjustedFeedKg: Math.round(baselineFeedKg * totalAdjustment),
    adjustmentFactor: totalAdjustment,
    reason: tempReason,
    weatherSummary: {
      avgTemp,
      totalRainfall,
      avgHumidity
    }
  };
};

/**
 * Calculate heat stress index for livestock
 * Temperature-Humidity Index (THI)
 */
export const calculateHeatStressIndex = (weatherData) => {
  const heatStressDays = weatherData.map(day => {
    // THI = (1.8 * T + 32) - [(0.55 - 0.0055 * RH) * (1.8 * T - 26)]
    const tempF = day.temp * 1.8 + 32;
    const thi = tempF - ((0.55 - 0.0055 * day.humidity) * (tempF - 58));
    
    let stressLevel = 'none';
    if (thi >= 84) stressLevel = 'emergency';
    else if (thi >= 79) stressLevel = 'danger';
    else if (thi >= 72) stressLevel = 'alert';
    else if (thi >= 68) stressLevel = 'mild';
    
    return {
      date: day.date,
      thi: Math.round(thi),
      stressLevel,
      temp: day.temp,
      humidity: day.humidity
    };
  });
  
  const emergencyDays = heatStressDays.filter(d => d.stressLevel === 'emergency').length;
  const dangerDays = heatStressDays.filter(d => d.stressLevel === 'danger').length;
  const alertDays = heatStressDays.filter(d => d.stressLevel === 'alert').length;
  
  return {
    heatStressDays,
    summary: {
      emergencyDays,
      dangerDays,
      alertDays,
      totalStressDays: emergencyDays + dangerDays + alertDays
    },
    recommendations: generateHeatStressRecommendations(emergencyDays, dangerDays, alertDays)
  };
};

/**
 * Generate heat stress management recommendations
 */
function generateHeatStressRecommendations(emergencyDays, dangerDays, alertDays) {
  const recommendations = [];
  
  if (emergencyDays > 0) {
    recommendations.push('🚨 EMERGENCY: Provide immediate cooling (shade, sprinklers, fans)');
    recommendations.push('Ensure unlimited access to cool, clean water');
    recommendations.push('Avoid moving or handling animals during peak heat');
    recommendations.push('Monitor animals every 2 hours for distress signs');
  } else if (dangerDays > 0) {
    recommendations.push('⚠️ High heat stress: Increase shade availability');
    recommendations.push('Provide extra water sources');
    recommendations.push('Adjust feeding times to cooler parts of day');
    recommendations.push('Monitor vulnerable animals closely');
  } else if (alertDays > 0) {
    recommendations.push('Moderate heat stress: Ensure adequate shade');
    recommendations.push('Check water availability throughout day');
    recommendations.push('Consider adjusting work schedules');
  }
  
  return recommendations;
}

/**
 * Calculate cold stress days
 */
export const calculateColdStress = (weatherData) => {
  const coldStressDays = weatherData.filter(day => {
    // Wind chill effect
    const windChill = day.windSpeed > 0 
      ? 13.12 + 0.6215 * day.tempMin - 11.37 * Math.pow(day.windSpeed * 3.6, 0.16) + 
        0.3965 * day.tempMin * Math.pow(day.windSpeed * 3.6, 0.16)
      : day.tempMin;
    
    return windChill < 0 || day.tempMin < 5;
  });
  
  const severeColdDays = coldStressDays.filter(d => d.tempMin < -5).length;
  const moderateColdDays = coldStressDays.filter(d => d.tempMin >= -5 && d.tempMin < 0).length;
  const mildColdDays = coldStressDays.filter(d => d.tempMin >= 0 && d.tempMin < 5).length;
  
  return {
    coldStressDays: coldStressDays.length,
    severeColdDays,
    moderateColdDays,
    mildColdDays,
    recommendations: generateColdStressRecommendations(severeColdDays, moderateColdDays)
  };
};

/**
 * Generate cold stress management recommendations
 */
function generateColdStressRecommendations(severeDays, moderateDays) {
  const recommendations = [];
  
  if (severeDays > 0) {
    recommendations.push('🥶 Severe cold: Provide windbreak shelter');
    recommendations.push('Increase feed by 25-35% for energy');
    recommendations.push('Ensure water sources are not frozen');
    recommendations.push('Provide bedding for insulation');
    recommendations.push('Check animals twice daily');
  } else if (moderateDays > 0) {
    recommendations.push('❄️ Cold conditions: Ensure shelter access');
    recommendations.push('Increase feed by 10-15%');
    recommendations.push('Monitor water supply for freezing');
    recommendations.push('Provide extra bedding if needed');
  }
  
  return recommendations;
}

/**
 * Calculate grazing favorability index
 * Combines temperature, rainfall, and soil conditions
 */
export const calculateGrazingFavorability = (weatherData) => {
  const scores = weatherData.map(day => {
    let score = 100;
    
    // Temperature penalties
    if (day.temp < 5) score -= 30;
    else if (day.temp < 10) score -= 15;
    else if (day.temp > 35) score -= 25;
    else if (day.temp > 30) score -= 10;
    
    // Rainfall penalties (too wet or too dry)
    if (day.rainfall > 25) score -= 40; // Heavy rain
    else if (day.rainfall > 10) score -= 20; // Moderate rain
    else if (day.rainfall < 0.1) score -= 5; // Very dry (slight penalty)
    
    // Wind penalties
    if (day.windSpeed > 10) score -= 15; // High wind
    else if (day.windSpeed > 7) score -= 5;
    
    score = Math.max(0, Math.min(100, score));
    
    let rating = 'poor';
    if (score >= 80) rating = 'excellent';
    else if (score >= 60) rating = 'good';
    else if (score >= 40) rating = 'fair';
    
    return {
      date: day.date,
      score,
      rating
    };
  });
  
  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  
  return {
    dailyScores: scores,
    averageScore: Math.round(avgScore),
    favorableDays: scores.filter(s => s.score >= 60).length,
    unfavorableDays: scores.filter(s => s.score < 40).length
  };
};

/**
 * Get cached weather data
 */
export const getCachedWeatherData = async (latitude, longitude, startDate, endDate) => {
  try {
    const cacheKey = `power_${latitude}_${longitude}_${startDate}_${endDate}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('[NASA POWER] Cache retrieval failed:', error);
    return null;
  }
};
