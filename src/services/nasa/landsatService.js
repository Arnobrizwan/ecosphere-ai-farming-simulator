import axios from 'axios';
import JSZip from 'jszip';
import { fromArrayBuffer } from 'geotiff';

import { withRetry } from '../../utils/retry';

const CMR_API = 'https://cmr.earthdata.nasa.gov/search/granules.json';
const NASA_TOKEN =
  process.env.EXPO_PUBLIC_NASA_EARTHDATA_TOKEN || process.env.NASA_EARTHDATA_TOKEN;

const BAND_RED_SUFFIX = 'sr_b4';
const BAND_NIR_SUFFIX = 'sr_b5';

if (!NASA_TOKEN) {
  console.warn('[LANDSAT] NASA_EARTHDATA_TOKEN is missing; Landsat search will fail.');
}

export const searchLandsatScenes = async (latitude, longitude, startDate, endDate, options = {}) => {
  const { maxScenes = 10, maxCloudCover = 20 } = options;

  try {
    const bbox = `${longitude - 0.1},${latitude - 0.1},${longitude + 0.1},${latitude + 0.1}`;

    const response = await withRetry(
      () =>
        axios.get(CMR_API, {
          params: {
            short_name: 'LANDSAT_OT_C2_L2',
            bounding_box: bbox,
            temporal: `${startDate}T00:00:00Z,${endDate}T23:59:59Z`,
            page_size: maxScenes,
            sort_key: '-start_date',
          },
          headers: {
            Authorization: `Bearer ${NASA_TOKEN}`,
          },
        }),
      {
        retries: 3,
        onRetry: ({ attempt, error }) =>
          console.warn(`[LANDSAT] search retry ${attempt}: ${error?.message || error}`),
      }
    );

    const entries = response?.data?.feed?.entry || [];

    return entries
      .map((granule) => ({
        id: granule.id,
        title: granule.title,
        date: granule.time_start,
        cloudCover: parseFloat(granule.cloud_cover || '0'),
        browseUrl: granule.links?.find((link) => link.rel === 'browse')?.href || null,
        dataUrls: granule.links?.filter((link) => link.rel?.includes('data')).map((link) => link.href) || [],
      }))
      .filter((scene) => scene.cloudCover < maxCloudCover);
  } catch (error) {
    throw new Error(`Landsat search failed: ${error?.message || String(error)}`);
  }
};

export const calculateLandsatNDVI = async (scene) => {
  if (!scene || !scene.dataUrls?.length) {
    throw new Error('Scene must include dataUrls for NDVI calculation');
  }

  const redBuffer = await fetchBand(scene.dataUrls, BAND_RED_SUFFIX);
  const nirBuffer = await fetchBand(scene.dataUrls, BAND_NIR_SUFFIX);

  const redRaster = await readGeoTiffBand(redBuffer);
  const nirRaster = await readGeoTiffBand(nirBuffer);

  if (redRaster.length !== nirRaster.length) {
    throw new Error('Landsat red and NIR rasters differ in size');
  }

  let sum = 0;
  let sumSq = 0;
  let min = Infinity;
  let max = -Infinity;
  let count = 0;

  for (let i = 0; i < redRaster.length; i++) {
    const red = redRaster[i];
    const nir = nirRaster[i];

    if (!Number.isFinite(red) || !Number.isFinite(nir)) continue;
    if (red + nir === 0) continue;

    const ndvi = (nir - red) / (nir + red);
    if (!Number.isFinite(ndvi) || ndvi < -1 || ndvi > 1) continue;

    sum += ndvi;
    sumSq += ndvi * ndvi;
    if (ndvi < min) min = ndvi;
    if (ndvi > max) max = ndvi;
    count += 1;
  }

  if (count === 0) {
    throw new Error('No valid pixels available for Landsat NDVI');
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  return {
    sceneId: scene.id,
    mean,
    min,
    max,
    standardDeviation: Math.sqrt(Math.max(variance, 0)),
    pixelCount: count,
  };
};

async function fetchBand(urls, suffix) {
  const loweredSuffix = suffix.toLowerCase();

  for (const url of urls) {
    const loweredUrl = url.toLowerCase();
    if (!loweredUrl.includes(loweredSuffix)) continue;

    const response = await withRetry(
      () =>
        axios.get(url, {
          headers: {
            Authorization: `Bearer ${NASA_TOKEN}`,
          },
          responseType: 'arraybuffer',
        }),
      {
        retries: 3,
        onRetry: ({ attempt, error }) =>
          console.warn(`[LANDSAT] band download retry ${attempt} (${suffix}): ${error?.message || error}`),
      }
    );

    const buffer = response.data;

    if (loweredUrl.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(buffer);
      const entryName = Object.keys(zip.files).find((name) => name.toLowerCase().includes(loweredSuffix));
      if (!entryName) {
        continue;
      }
      return await zip.files[entryName].async('arraybuffer');
    }

    return buffer;
  }

  throw new Error(`No data URL matched required Landsat band (${suffix})`);
}

async function readGeoTiffBand(buffer) {
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();
  const raster = await image.readRasters();

  const band = Array.isArray(raster) ? raster[0] : raster;
  if (!band) {
    throw new Error('Failed to read band data from GeoTIFF');
  }

  return band;
}

/**
 * Calculate NDWI (Normalized Difference Water Index)
 * NDWI = (Green - NIR) / (Green + NIR)
 * Higher values indicate water presence
 */
export const calculateNDWI = (green, nir) => {
  if (green + nir === 0) return 0;
  return (green - nir) / (green + nir);
};

/**
 * Calculate SAVI (Soil-Adjusted Vegetation Index)
 * SAVI = ((NIR - Red) / (NIR + Red + L)) × (1 + L)
 * L = 0.5 (soil brightness correction)
 */
export const calculateSAVI = (nir, red, L = 0.5) => {
  if (nir + red + L === 0) return 0;
  return ((nir - red) / (nir + red + L)) * (1 + L);
};

/**
 * Calculate EVI (Enhanced Vegetation Index)
 * EVI = 2.5 × ((NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1))
 */
export const calculateEVI = (nir, red, blue) => {
  const denominator = nir + 6 * red - 7.5 * blue + 1;
  if (denominator === 0) return 0;
  return 2.5 * ((nir - red) / denominator);
};

/**
 * Classify land cover based on NDVI values
 */
export const classifyLandCover = (ndvi) => {
  if (ndvi > 0.6) return { type: 'Dense Vegetation', confidence: 90 };
  if (ndvi > 0.3) return { type: 'Moderate Vegetation', confidence: 85 };
  if (ndvi > 0.1) return { type: 'Sparse Vegetation', confidence: 75 };
  if (ndvi < -0.1) return { type: 'Water/Urban', confidence: 70 };
  return { type: 'Bare Soil', confidence: 70 };
};

/**
 * Get vegetation health trend over time
 */
export const getVegetationTrend = async (latitude, longitude, startDate, endDate, options = {}) => {
  try {
    const scenes = await searchLandsatScenes(latitude, longitude, startDate, endDate, options);

    const trend = [];
    for (const scene of scenes.slice(0, 5)) { // Limit to 5 scenes for performance
      try {
        const ndvi = await calculateLandsatNDVI(scene);
        const landCover = classifyLandCover(ndvi.mean);

        trend.push({
          date: scene.date,
          ndvi: parseFloat(ndvi.mean.toFixed(4)),
          cloudCover: scene.cloudCover,
          landCover: landCover.type,
          confidence: landCover.confidence,
        });
      } catch (error) {
        console.warn(`[Landsat] Skipping scene ${scene.id}: ${error.message}`);
      }
    }

    return {
      latitude,
      longitude,
      period: { start: startDate, end: endDate },
      observations: trend.length,
      trend,
      source: 'Landsat 8/9 OLI Time Series',
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Vegetation trend analysis failed: ${error.message}`);
  }
};

export default {
  searchLandsatScenes,
  calculateLandsatNDVI,
  calculateNDWI,
  calculateSAVI,
  calculateEVI,
  classifyLandCover,
  getVegetationTrend,
};
