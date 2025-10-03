import axios from 'axios';
import { addDays, differenceInCalendarDays, format } from 'date-fns';

import { withRetry } from '../../utils/retry';

const NASA_EARTHDATA_TOKEN =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_TOKEN || process.env.NASA_EARTHDATA_TOKEN;
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
  try {
    const bbox = `${longitude - 0.1},${latitude - 0.1},${longitude + 0.1},${latitude + 0.1}`;

    const response = await withRetry(() =>
      axios.get(CMR_API, {
        params: {
          short_name: 'SPL3SMP_E',
          version: '005',
          bounding_box: bbox,
          temporal: `${date}T00:00:00Z,${date}T23:59:59Z`,
          page_size: 1,
        },
        headers: {
          Authorization: `Bearer ${NASA_EARTHDATA_TOKEN}`,
        },
      })
    , {
      retries: 3,
      onRetry: ({ attempt, error }) =>
        console.warn(`[SMAP] retry ${attempt} for ${date}: ${error?.message || error}`),
    });

    const entries = response?.data?.feed?.entry || [];
    if (entries.length === 0) {
      throw new Error('No SMAP data available for this date/location');
    }

    const granule = entries[0];
    const dataUrl = granule.links?.find((link) => link.rel?.includes('data'))?.href;
    if (!dataUrl) {
      throw new Error('No data URL found in SMAP granule');
    }

    return {
      date,
      location: { latitude, longitude },
      soilMoisture: parseFloat(granule.summary || '0'),
      unit: 'cm³/cm³',
      source: 'NASA SMAP SPL3SMP_E',
      granuleId: granule.id,
      dataUrl,
    };
  } catch (error) {
    console.error('[SMAP] fetch error:', error);
    throw new Error(`Failed to fetch SMAP data: ${error?.message || String(error)}`);
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
