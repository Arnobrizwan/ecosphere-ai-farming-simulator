/**
 * NASA POWER API Integration
 * Fetches agro-climate time series data for ET and growth calculations
 * API Docs: https://power.larc.nasa.gov/docs/services/api/
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// NASA POWER API Base URL
const POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily';

// Parameter mapping: code → {name, unit, description}
export const POWER_PARAMETERS = {
  T2M: {
    name: 'Temperature at 2 Meters',
    unit: '°C',
    description: 'Average daily air temperature at 2m above ground',
  },
  RH2M: {
    name: 'Relative Humidity at 2 Meters',
    unit: '%',
    description: 'Average daily relative humidity at 2m above ground',
  },
  WS2M: {
    name: 'Wind Speed at 2 Meters',
    unit: 'm/s',
    description: 'Average daily wind speed at 2m above ground',
  },
  ALLSKY_SFC_SW_DWN: {
    name: 'Solar Radiation',
    unit: 'MJ/m²/day',
    description: 'All-sky surface shortwave downward irradiance',
  },
  PRECTOTCORR: {
    name: 'Precipitation',
    unit: 'mm/day',
    description: 'Precipitation corrected (total daily)',
  },
  T2M_MAX: {
    name: 'Maximum Temperature',
    unit: '°C',
    description: 'Daily maximum temperature at 2m',
  },
  T2M_MIN: {
    name: 'Minimum Temperature',
    unit: '°C',
    description: 'Daily minimum temperature at 2m',
  },
  EVPTRNS: {
    name: 'Evapotranspiration',
    unit: 'mm/day',
    description: 'Evapotranspiration energy flux',
  },
};

// Default parameters for agro-climate
const DEFAULT_PARAMS = ['T2M', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN', 'PRECTOTCORR'];

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Generate cache key for API requests
 */
const getCacheKey = (endpoint, params) => {
  return `power_cache_${endpoint}_${JSON.stringify(params)}`;
};

/**
 * Get cached data if available and not expired
 */
const getCachedData = async (cacheKey) => {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp < CACHE_DURATION) {
      console.log('✅ Using cached POWER data');
      return data;
    }

    // Cache expired, remove it
    await AsyncStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

/**
 * Save data to cache
 */
const setCachedData = async (cacheKey, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('✅ Cached POWER data');
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

/**
 * Fallback sample data for Dhaka (if API fails)
 */
const getSampleData = (parameters) => {
  const sampleData = {
    properties: {
      parameter: {},
    },
    messages: ['Using sample data (API unavailable)'],
  };

  parameters.forEach((param) => {
    // Generate 30 days of sample data
    const dates = {};
    const baseDate = new Date('2025-08-01');

    for (let i = 0; i < 30; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

      // Generate realistic sample values based on parameter
      let value;
      switch (param) {
        case 'T2M':
          value = 28 + Math.random() * 4; // 28-32°C
          break;
        case 'RH2M':
          value = 70 + Math.random() * 20; // 70-90%
          break;
        case 'WS2M':
          value = 2 + Math.random() * 3; // 2-5 m/s
          break;
        case 'ALLSKY_SFC_SW_DWN':
          value = 18 + Math.random() * 6; // 18-24 MJ/m²/day
          break;
        case 'PRECTOTCORR':
          value = Math.random() < 0.3 ? Math.random() * 20 : 0; // 30% chance of rain
          break;
        default:
          value = Math.random() * 10;
      }

      dates[dateStr] = parseFloat(value.toFixed(2));
    }

    sampleData.properties.parameter[param] = dates;
  });

  return sampleData;
};

/**
 * Fetch daily data for a specific point (lat/lon)
 *
 * @param {Object} options - Query parameters
 * @param {number} options.latitude - Latitude (-90 to 90)
 * @param {number} options.longitude - Longitude (-180 to 180)
 * @param {string} options.start - Start date (YYYYMMDD)
 * @param {string} options.end - End date (YYYYMMDD)
 * @param {string[]} options.parameters - Parameter codes (default: DEFAULT_PARAMS)
 * @returns {Promise<Object>} Normalized time series data
 */
export const getDailyPoint = async ({
  latitude,
  longitude,
  start,
  end,
  parameters = DEFAULT_PARAMS,
}) => {
  const params = {
    parameters: parameters.join(','),
    community: 'ag',
    latitude,
    longitude,
    start,
    end,
    format: 'json',
  };

  const cacheKey = getCacheKey('point', params);

  // Try cache first
  const cachedData = await getCachedData(cacheKey);
  if (cachedData) {
    return normalizeResponse(cachedData, parameters);
  }

  // Build URL
  const queryString = new URLSearchParams(params).toString();
  const url = `${POWER_BASE_URL}/point?${queryString}`;

  console.log('🔍 Try It URL (Daily Point):');
  console.log(url);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.properties || !data.properties.parameter) {
      throw new Error('Invalid POWER API response structure');
    }

    // Cache successful response
    await setCachedData(cacheKey, data);

    return normalizeResponse(data, parameters);
  } catch (error) {
    console.error('❌ POWER API Error:', error.message);
    console.log('⚠️ Using fallback sample data');

    const sampleData = getSampleData(parameters);
    return normalizeResponse(sampleData, parameters);
  }
};

/**
 * Fetch daily data for a regional bounding box
 *
 * @param {Object} options - Query parameters
 * @param {string} options.bbox - Bounding box "lon_min,lat_min,lon_max,lat_max"
 * @param {string} options.start - Start date (YYYYMMDD)
 * @param {string} options.end - End date (YYYYMMDD)
 * @param {string[]} options.parameters - Parameter codes (default: DEFAULT_PARAMS)
 * @returns {Promise<Object>} Normalized regional data
 */
export const getDailyRegional = async ({
  bbox,
  start,
  end,
  parameters = DEFAULT_PARAMS,
}) => {
  const params = {
    parameters: parameters.join(','),
    community: 'ag',
    bbox,
    start,
    end,
    format: 'json',
  };

  const cacheKey = getCacheKey('regional', params);

  // Try cache first
  const cachedData = await getCachedData(cacheKey);
  if (cachedData) {
    return normalizeResponse(cachedData, parameters);
  }

  // Build URL
  const queryString = new URLSearchParams(params).toString();
  const url = `${POWER_BASE_URL}/regional?${queryString}`;

  console.log('🔍 Try It URL (Daily Regional):');
  console.log(url);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.properties || !data.properties.parameter) {
      throw new Error('Invalid POWER API response structure');
    }

    // Cache successful response
    await setCachedData(cacheKey, data);

    return normalizeResponse(data, parameters);
  } catch (error) {
    console.error('❌ POWER API Error:', error.message);
    console.log('⚠️ Using fallback sample data');

    const sampleData = getSampleData(parameters);
    return normalizeResponse(sampleData, parameters);
  }
};

/**
 * Normalize API response to {date, value}[] arrays per parameter
 *
 * @param {Object} rawData - Raw POWER API response
 * @param {string[]} parameters - Parameter codes
 * @returns {Object} Normalized data structure
 */
const normalizeResponse = (rawData, parameters) => {
  const normalized = {
    parameters: {},
    metadata: {
      messages: rawData.messages || [],
      source: 'NASA POWER API',
    },
  };

  parameters.forEach((param) => {
    const paramData = rawData.properties?.parameter?.[param];

    if (!paramData) {
      console.warn(`⚠️ Parameter ${param} not found in response`);
      normalized.parameters[param] = [];
      return;
    }

    // Convert {YYYYMMDD: value} to [{date, value}] array
    const series = Object.entries(paramData).map(([dateStr, value]) => ({
      date: formatDate(dateStr),
      value: value === -999 ? null : value, // -999 is POWER's "missing data" flag
    }));

    normalized.parameters[param] = series.sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
  });

  return normalized;
};

/**
 * Format YYYYMMDD to YYYY-MM-DD
 */
const formatDate = (dateStr) => {
  if (dateStr.includes('-')) return dateStr; // Already formatted
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
};

/**
 * Get current month date range (YYYYMMDD format)
 */
export const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const start = `${year}${month}01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const end = `${year}${month}${String(lastDay).padStart(2, '0')}`;

  return { start, end };
};

/**
 * Demo: Fetch data for Dhaka, Bangladesh
 */
export const demoFetchDhaka = async () => {
  console.log('🌍 Demo: Fetching POWER data for Dhaka...');

  const { start, end } = getCurrentMonthRange();

  const data = await getDailyPoint({
    latitude: 23.81,
    longitude: 90.41,
    start,
    end,
    parameters: DEFAULT_PARAMS,
  });

  console.log('📊 Demo Results:');
  Object.entries(data.parameters).forEach(([param, series]) => {
    console.log(`  ${param}: ${series.length} days of data`);
    if (series.length > 0) {
      console.log(`    First: ${series[0].date} = ${series[0].value} ${POWER_PARAMETERS[param].unit}`);
      console.log(`    Last: ${series[series.length - 1].date} = ${series[series.length - 1].value} ${POWER_PARAMETERS[param].unit}`);
    }
  });

  return data;
};

/**
 * Get parameter info for UI display
 */
export const getParameterInfo = (paramCode) => {
  return POWER_PARAMETERS[paramCode] || {
    name: paramCode,
    unit: '',
    description: 'Unknown parameter',
  };
};

/**
 * Get all available parameters as array
 */
export const getAllParameters = () => {
  return Object.entries(POWER_PARAMETERS).map(([code, info]) => ({
    code,
    ...info,
  }));
};
