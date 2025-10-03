/**
 * NASA POWER API Service
 *
 * Provides access to NASA's Prediction Of Worldwide Energy Resources (POWER) API
 * for agricultural weather and climate data.
 *
 * API Documentation: https://power.larc.nasa.gov/docs/services/api/
 */

import axios from 'axios';

const NASA_POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';

/**
 * Fetch agricultural climate data for a location
 * @param {number} latitude - Latitude (-90 to 90)
 * @param {number} longitude - Longitude (-180 to 180)
 * @param {string} startDate - Start date (YYYYMMDD)
 * @param {string} endDate - End date (YYYYMMDD)
 * @returns {Promise<Object>} Climate data
 */
export async function getAgricultureData(latitude, longitude, startDate, endDate) {
  try {
    const parameters = [
      'T2M',          // Temperature at 2 Meters
      'T2M_MAX',      // Maximum Temperature at 2 Meters
      'T2M_MIN',      // Minimum Temperature at 2 Meters
      'PRECTOTCORR',  // Precipitation Corrected
      'RH2M',         // Relative Humidity at 2 Meters
      'WS2M',         // Wind Speed at 2 Meters
      'ALLSKY_SFC_SW_DWN', // Solar Radiation
    ].join(',');

    const response = await axios.get(NASA_POWER_BASE_URL, {
      params: {
        parameters,
        community: 'AG',  // Agriculture community
        longitude,
        latitude,
        start: startDate,
        end: endDate,
        format: 'JSON'
      },
      timeout: 30000
    });

    return {
      success: true,
      data: response.data.properties.parameter,
      metadata: {
        latitude: response.data.geometry.coordinates[1],
        longitude: response.data.geometry.coordinates[0],
        elevation: response.data.properties.parameter.elevation || null
      }
    };
  } catch (error) {
    console.error('NASA POWER API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current/recent agricultural conditions
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} daysBack - Number of days to look back (default: 7)
 * @returns {Promise<Object>} Recent climate data
 */
export async function getRecentConditions(latitude, longitude, daysBack = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const formatDate = (date) => {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  };

  return getAgricultureData(
    latitude,
    longitude,
    formatDate(startDate),
    formatDate(endDate)
  );
}

/**
 * Get climate suitability for a location
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} Suitability analysis
 */
export async function getClimateSuitability(latitude, longitude) {
  try {
    // Get last 30 days of data for analysis
    const result = await getRecentConditions(latitude, longitude, 30);

    if (!result.success) {
      return result;
    }

    const { T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M } = result.data;

    // Calculate averages
    const avgTemp = calculateAverage(Object.values(T2M));
    const avgPrecip = calculateSum(Object.values(PRECTOTCORR));
    const avgHumidity = calculateAverage(Object.values(RH2M));

    // Determine suitability (simple heuristic)
    const suitability = {
      temperature: {
        average: avgTemp.toFixed(1),
        suitable: avgTemp >= 15 && avgTemp <= 35,
        recommendation: avgTemp < 15 ? 'Too cold for most crops' : avgTemp > 35 ? 'Too hot, consider heat-tolerant varieties' : 'Suitable for most crops'
      },
      precipitation: {
        total: avgPrecip.toFixed(1),
        suitable: avgPrecip >= 10 && avgPrecip <= 200,
        recommendation: avgPrecip < 10 ? 'Low rainfall - irrigation required' : avgPrecip > 200 ? 'High rainfall - ensure good drainage' : 'Adequate rainfall'
      },
      humidity: {
        average: avgHumidity.toFixed(1),
        suitable: avgHumidity >= 40 && avgHumidity <= 80,
        recommendation: avgHumidity < 40 ? 'Low humidity - monitor for drought stress' : avgHumidity > 80 ? 'High humidity - watch for fungal diseases' : 'Optimal humidity range'
      }
    };

    return {
      success: true,
      suitability,
      rawData: result.data
    };
  } catch (error) {
    console.error('Climate suitability error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper: Calculate average of array
 */
function calculateAverage(arr) {
  const validValues = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (validValues.length === 0) return 0;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

/**
 * Helper: Calculate sum of array
 */
function calculateSum(arr) {
  const validValues = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  return validValues.reduce((a, b) => a + b, 0);
}

export default {
  getAgricultureData,
  getRecentConditions,
  getClimateSuitability
};
