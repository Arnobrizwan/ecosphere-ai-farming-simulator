import axios from 'axios';
import JSZip from 'jszip';
import { fromArrayBuffer } from 'geotiff';

import { withRetry } from '../../utils/retry';

const APPEEARS_API = 'https://appeears.earthdatacloud.nasa.gov/api';
const NASA_USERNAME =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_USERNAME || process.env.NASA_EARTHDATA_USERNAME;
const NASA_TOKEN =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_TOKEN || process.env.NASA_EARTHDATA_TOKEN;

let sessionToken = null;

const ensureCredentials = () => {
  if (!NASA_USERNAME || !NASA_TOKEN) {
    console.warn('[MODIS] Missing NASA_EARTHDATA_USERNAME or NASA_EARTHDATA_TOKEN. Requests will fail.');
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loginToAppEEARS = async () => {
  ensureCredentials();

  if (sessionToken) {
    return sessionToken;
  }

  try {
    const response = await withRetry(
      () =>
        axios.post(`${APPEEARS_API}/login`, {
          username: NASA_USERNAME,
          password: NASA_TOKEN,
        }),
      {
        retries: 2,
        onRetry: ({ attempt, error }) =>
          console.warn(`[MODIS] login retry ${attempt}: ${error?.message || error}`),
      }
    );

    sessionToken = response?.data?.token;
    if (!sessionToken) {
      throw new Error('No token returned from AppEEARS login');
    }

    return sessionToken;
  } catch (error) {
    sessionToken = null;
    throw new Error(`AppEEARS login failed: ${error?.message || String(error)}`);
  }
};

const withAuth = async () => {
  const token = await loginToAppEEARS();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const submitMODISTask = async (latitude, longitude, startDate, endDate, taskName = 'Farm_NDVI') => {
  const authConfig = await withAuth();

  try {
    const taskConfig = {
      task_type: 'point',
      task_name: `${taskName}_${Date.now()}`,
      params: {
        dates: [
          {
            startDate,
            endDate,
          },
        ],
        layers: [
          {
            product: 'MOD13Q1.061',
            layer: 'NDVI',
          },
        ],
        coordinates: [
          {
            latitude,
            longitude,
            category: 'farm_location',
          },
        ],
        output: {
          format: { type: 'geotiff' },
          projection: 'geographic',
        },
      },
    };

    const response = await withRetry(() => axios.post(`${APPEEARS_API}/task`, taskConfig, authConfig), {
      retries: 3,
      onRetry: ({ attempt, error }) =>
        console.warn(`[MODIS] task submission retry ${attempt}: ${error?.message || error}`),
    });
    const taskId = response?.data?.task_id;

    if (!taskId) {
      throw new Error('MODIS task submission returned no task_id');
    }

    return taskId;
  } catch (error) {
    throw new Error(`MODIS task submission failed: ${error?.message || String(error)}`);
  }
};

export const checkTaskStatus = async (taskId) => {
  const authConfig = await withAuth();
  try {
    const response = await withRetry(() => axios.get(`${APPEEARS_API}/task/${taskId}`, authConfig), {
      retries: 4,
      onRetry: ({ attempt, error }) =>
        console.warn(`[MODIS] status retry ${attempt} for ${taskId}: ${error?.message || error}`),
    });
    return response?.data?.status;
  } catch (error) {
    throw new Error(`Failed to check MODIS task status: ${error?.message || String(error)}`);
  }
};

export const downloadMODISData = async (taskId, options = {}) => {
  const { pollIntervalMs = 5000, maxWaitMs = 10 * 60 * 1000 } = options;
  const startTime = Date.now();

  let status = await checkTaskStatus(taskId);
  while (status !== 'done') {
    if (status === 'error') {
      throw new Error('MODIS task failed');
    }

    if (Date.now() - startTime > maxWaitMs) {
      throw new Error('Timed out waiting for MODIS task to finish');
    }

    await sleep(pollIntervalMs);
    status = await checkTaskStatus(taskId);
  }

  const authConfig = await withAuth();
  try {
    const response = await withRetry(
      () =>
        axios.get(`${APPEEARS_API}/bundle/${taskId}`, {
          ...authConfig,
          responseType: 'arraybuffer',
        }),
      {
        retries: 3,
        onRetry: ({ attempt, error }) =>
          console.warn(`[MODIS] bundle retry ${attempt} for ${taskId}: ${error?.message || error}`),
      }
    );

    return await parseNDVIData(response.data);
  } catch (error) {
    throw new Error(`Failed to download MODIS data: ${error?.message || String(error)}`);
  }
};

async function parseNDVIData(bundleBuffer) {
  const zip = await JSZip.loadAsync(bundleBuffer);
  const geoTiffEntry = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.tif'));

  if (!geoTiffEntry) {
    throw new Error('MODIS bundle did not contain a GeoTIFF file');
  }

  const tiffBuffer = await zip.files[geoTiffEntry].async('arraybuffer');
  const tiff = await fromArrayBuffer(tiffBuffer);
  const image = await tiff.getImage();
  const raster = await image.readRasters();
  const band = Array.isArray(raster) ? raster[0] : raster;

  if (!band) {
    throw new Error('Unable to read NDVI band from GeoTIFF');
  }

  const noDataValue = parseFloat(image.getGDALNoData?.() ?? NaN);
  const scale = 0.0001; // MOD13 NDVI scale factor
  let sum = 0;
  let sumSq = 0;
  let min = Infinity;
  let max = -Infinity;
  let count = 0;

  for (let i = 0; i < band.length; i++) {
    const raw = band[i];
    if (!Number.isFinite(raw)) continue;
    if (!Number.isNaN(noDataValue) && raw === noDataValue) continue;
    if (raw <= -3000 || raw >= 10000) continue; // Filter fill values

    const ndvi = raw * scale;
    if (!Number.isFinite(ndvi)) continue;

    sum += ndvi;
    sumSq += ndvi * ndvi;
    if (ndvi < min) min = ndvi;
    if (ndvi > max) max = ndvi;
    count += 1;
  }

  if (count === 0) {
    throw new Error('No valid NDVI pixels parsed from MODIS GeoTIFF');
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  return {
    mean,
    min,
    max,
    standardDeviation: Math.sqrt(Math.max(variance, 0)),
    pixelCount: count,
    captureDate: image.getFileDirectory?.()?.DateTime || null,
    unit: 'NDVI (-1 to 1)',
  };
}

export const resetModisSession = () => {
  sessionToken = null;
};
