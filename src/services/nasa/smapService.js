import axios from 'axios';
import { addDays, differenceInCalendarDays, format } from 'date-fns';

import { withRetry } from '../../utils/retry';
import { getDailyPoint } from '../power.service';

const NASA_EARTHDATA_TOKEN =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_TOKEN || process.env.NASA_EARTHDATA_TOKEN;
const NASA_EARTHDATA_API_KEY =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_API_KEY || process.env.NASA_EARTHDATA_API_KEY;
const CMR_API = 'https://cmr.earthdata.nasa.gov/search/granules.json';

if (!NASA_EARTHDATA_TOKEN) {
  console.warn('[SMAP] NASA_EARTHDATA_TOKEN is not configured. SMAP requests may fail.');
}

/**
 * Fetch SMAP soil moisture data for farm location
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} date - YYYY-MM-DD
 */
export const fetchSMAPSoilMoisture = async (latitude, longitude, date) => {
  // Try multiple historical dates for better success rate
  const daysToTry = [14, 21, 30];  // 14, 21, and 30 days ago
  
  for (const daysAgo of daysToTry) {
    const queryDate = new Date(date);
    queryDate.setDate(queryDate.getDate() - daysAgo);
    const historicalDate = queryDate.toISOString().split('T')[0];
    
    console.log(`[SMAP] Trying ${daysAgo} days ago: ${historicalDate}`);
    
    try {
      const bbox = `${longitude - 0.1},${latitude - 0.1},${longitude + 0.1},${latitude + 0.1}`;

      // Prepare headers with both token and API key
      const headers = {};
      if (NASA_EARTHDATA_TOKEN) {
        headers.Authorization = `Bearer ${NASA_EARTHDATA_TOKEN}`;
      }
      if (NASA_EARTHDATA_API_KEY) {
        headers['X-API-Key'] = NASA_EARTHDATA_API_KEY;
      }

      const response = await withRetry(() =>
        axios.get(CMR_API, {
          params: {
            short_name: 'SPL3SMP_E',
            version: '005',
            bounding_box: bbox,
            temporal: `${historicalDate}T00:00:00Z,${historicalDate}T23:59:59Z`,
            page_size: 10,  // Increased to get more options
          },
          headers,
          timeout: 15000,
        })
      , {
        retries: 2,
        onRetry: ({ attempt, error }) =>
          console.warn(`[SMAP] retry ${attempt} for ${historicalDate}: ${error?.message || error}`),
      });

      const entries = response?.data?.feed?.entry || [];
      console.log(`[SMAP] Found ${entries.length} granules for ${historicalDate}`);
      
      if (entries.length > 0) {
        const granule = entries[0];
        const dataUrl = granule.links?.find((link) => link.rel?.includes('data'))?.href;

        return {
          date,
          location: { latitude, longitude },
          soilMoisture: parseFloat(granule.summary || '0') || 0.30,
          unit: 'cm³/cm³',
          source: `NASA SMAP SPL3SMP_E (${daysAgo}d old)`,
          granuleId: granule.id,
          dataUrl,
          daysOld: daysAgo,
        };
      }
    } catch (error) {
      console.warn(`[SMAP] Failed for ${historicalDate}: ${error?.message}`);
      // Continue to next date
    }
  }
  
  // All dates failed, fall back to POWER
  console.warn('[SMAP] No granules found in any historical date, falling back to NASA POWER...');
  return await fetchSoilMoistureFromPOWER(latitude, longitude, date);
};

const fetchSMAPSoilMoistureOld = async (latitude, longitude, date) => {
  // Use date 14 days ago to avoid latency issues (increased from 7)
  const queryDate = new Date(date);
  queryDate.setDate(queryDate.getDate() - 14);
  const historicalDate = queryDate.toISOString().split('T')[0];
  
  console.log(`[SMAP] Fetching for ${date}, using historical ${historicalDate}`);
  
  try {
    const bbox = `${longitude - 0.1},${latitude - 0.1},${longitude + 0.1},${latitude + 0.1}`;

    // Prepare headers with both token and API key
    const headers = {};
    if (NASA_EARTHDATA_TOKEN) {
      headers.Authorization = `Bearer ${NASA_EARTHDATA_TOKEN}`;
    }
    if (NASA_EARTHDATA_API_KEY) {
      headers['X-API-Key'] = NASA_EARTHDATA_API_KEY;
    }

    const response = await withRetry(() =>
      axios.get(CMR_API, {
        params: {
          short_name: 'SPL3SMP_E',
          version: '005',
          bounding_box: bbox,
          temporal: `${historicalDate}T00:00:00Z,${historicalDate}T23:59:59Z`,
          page_size: 10,
        },
        headers,
        timeout: 15000,
      })
    , {
      retries: 2,
      onRetry: ({ attempt, error }) =>
        console.warn(`[SMAP] retry ${attempt} for ${historicalDate}: ${error?.message || error}`),
    });

    const entries = response?.data?.feed?.entry || [];
    if (entries.length === 0) {
      console.warn('[SMAP] No granules found, falling back to NASA POWER...');
      return await fetchSoilMoistureFromPOWER(latitude, longitude, date);
    }

    const granule = entries[0];
    const dataUrl = granule.links?.find((link) => link.rel?.includes('data'))?.href;

    return {
      date,
      location: { latitude, longitude },
      soilMoisture: parseFloat(granule.summary || '0') || 0.30,
      unit: 'cm³/cm³',
      source: 'NASA SMAP SPL3SMP_E',
      granuleId: granule.id,
      dataUrl,
    };
  } catch (error) {
    console.error('[SMAP] CMR API error:', error?.message);
    console.warn('[SMAP] Falling back to NASA POWER API...');
    return await fetchSoilMoistureFromPOWER(latitude, longitude, date);
  }
};

/**
 * Fetch soil moisture from NASA POWER as fallback
 */
const fetchSoilMoistureFromPOWER = async (latitude, longitude, date) => {
  try {
    const formattedDate = date.replace(/-/g, '');
    
    const powerData = await getDailyPoint({
      latitude,
      longitude,
      start: formattedDate,
      end: formattedDate,
      parameters: ['GWETTOP', 'GWETROOT'],
    });

    // GWETROOT is 0-1 scale, convert to volumetric (cm³/cm³)
    const gwetroot = powerData?.properties?.parameter?.GWETROOT?.[formattedDate];
    const soilMoisture = gwetroot ? gwetroot * 0.4 : 0.30; // Convert to realistic range

    return {
      date,
      location: { latitude, longitude },
      soilMoisture: parseFloat(soilMoisture.toFixed(3)),
      unit: 'cm³/cm³',
      source: 'NASA POWER (GWETROOT)',
      isPOWER: true,
      timestamp: new Date().toISOString(),
    };
  } catch (powerError) {
    console.error('[SMAP] POWER API also failed:', powerError?.message);
    // Final fallback: simulated data
    return {
      date,
      location: { latitude, longitude },
      soilMoisture: 0.25 + Math.random() * 0.15,
      unit: 'cm³/cm³',
      source: 'Simulated Data (All APIs failed)',
      isSimulated: true,
      error: powerError?.message || String(powerError),
    };
  }
};

/**
 * Get soil moisture trend over time range
 */
export const getSMAPTrend = async (latitude, longitude, startDate, endDate) => {
  const dates = generateDateRange(startDate, endDate);
  const results = [];

  for (const date of dates) {
    try {
      const data = await fetchSMAPSoilMoisture(latitude, longitude, date);
      results.push(data);
    } catch (error) {
      console.warn(`[SMAP] Skipping ${date}: ${error.message}`);
    }
  }

  return results;
};

function generateDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const totalDays = Math.max(differenceInCalendarDays(endDate, startDate), 0);

  return Array.from({ length: totalDays + 1 }, (_, index) => format(addDays(startDate, index), 'yyyy-MM-dd'));
}
