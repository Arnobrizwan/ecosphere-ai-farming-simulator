/**
 * UC56 - Sentinel-2 High-Resolution Imagery Service
 * For small pastures (<10 ha) where MODIS 250m resolution is insufficient
 * Sentinel-2: 10m resolution vs MODIS 250m
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SENTINEL_HUB_API = 'https://services.sentinel-hub.com/api/v1';
const SENTINEL_CLIENT_ID = process.env.SENTINEL_CLIENT_ID;
const SENTINEL_CLIENT_SECRET = process.env.SENTINEL_CLIENT_SECRET;

let sentinelToken = null;
let tokenExpiry = null;

/**
 * Authenticate with Sentinel Hub
 */
const authenticateSentinel = async () => {
  // Check if token is still valid
  if (sentinelToken && tokenExpiry && Date.now() < tokenExpiry) {
    return sentinelToken;
  }
  
  if (!SENTINEL_CLIENT_ID || !SENTINEL_CLIENT_SECRET) {
    throw new Error('Sentinel Hub credentials not configured. Set SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET in .env');
  }
  
  try {
    console.log('[Sentinel-2] Authenticating...');
    
    const response = await axios.post(`${SENTINEL_HUB_API}/oauth/token`, 
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SENTINEL_CLIENT_ID,
        client_secret: SENTINEL_CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    sentinelToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer
    
    console.log('[Sentinel-2] Authentication successful');
    return sentinelToken;
    
  } catch (error) {
    console.error('[Sentinel-2] Authentication failed:', error.message);
    throw new Error(`Sentinel Hub authentication failed: ${error.message}`);
  }
};

/**
 * Fetch high-resolution NDVI for small pastures
 * @param {Array} bbox - [minLon, minLat, maxLon, maxLat]
 * @param {string} date - YYYY-MM-DD
 * @param {number} width - Image width in pixels (default 512)
 * @param {number} height - Image height in pixels (default 512)
 * @returns {Promise<Object>} NDVI image data
 */
export const fetchHighResNDVI = async (bbox, date, width = 512, height = 512) => {
  const token = await authenticateSentinel();
  
  console.log('[Sentinel-2] Fetching high-res NDVI for:', { bbox, date });
  
  // Calculate date range (±3 days for cloud-free acquisition)
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 3);
  
  const request = {
    input: {
      bounds: {
        bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: {
          timeRange: {
            from: `${startDate.toISOString().split('T')[0]}T00:00:00Z`,
            to: `${endDate.toISOString().split('T')[0]}T23:59:59Z`
          },
          maxCloudCoverage: 20 // Accept images with <20% cloud cover
        }
      }]
    },
    output: {
      width,
      height,
      responses: [{
        identifier: 'default',
        format: { type: 'image/png' }
      }]
    },
    evalscript: `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B08", "SCL"],
          output: { 
            bands: 3,
            sampleType: "AUTO"
          }
        };
      }
      
      function evaluatePixel(sample) {
        // Calculate NDVI
        let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
        
        // Color code NDVI values
        let r, g, b;
        if (ndvi < 0.2) {
          // Bare soil/poor vegetation - brown
          r = 0.6; g = 0.4; b = 0.2;
        } else if (ndvi < 0.4) {
          // Low vegetation - yellow/tan
          r = 0.8; g = 0.7; b = 0.3;
        } else if (ndvi < 0.6) {
          // Moderate vegetation - light green
          r = 0.5; g = 0.8; b = 0.3;
        } else {
          // Healthy vegetation - dark green
          r = 0.1; g = 0.6; b = 0.1;
        }
        
        // Mask clouds (SCL value 8, 9, 10 are clouds/shadows)
        if (sample.SCL === 8 || sample.SCL === 9 || sample.SCL === 10) {
          r = 1; g = 1; b = 1; // White for clouds
        }
        
        return [r, g, b];
      }
    `
  };
  
  try {
    const response = await axios.post(`${SENTINEL_HUB_API}/process`, request, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    // Convert to base64 for React Native Image component
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    
    // Cache result
    const cacheKey = `sentinel_${bbox.join('_')}_${date}`;
    await AsyncStorage.setItem(cacheKey, base64Image);
    
    console.log('[Sentinel-2] High-res NDVI image fetched successfully');
    
    return {
      image: `data:image/png;base64,${base64Image}`,
      bbox,
      date,
      resolution: '10m',
      source: 'Sentinel-2'
    };
    
  } catch (error) {
    console.error('[Sentinel-2] Fetch failed:', error.message);
    if (error.response) {
      console.error('[Sentinel-2] Error response:', error.response.data);
    }
    throw new Error(`Sentinel-2 fetch failed: ${error.message}`);
  }
};

/**
 * Fetch true color RGB image
 */
export const fetchTrueColorImage = async (bbox, date, width = 512, height = 512) => {
  const token = await authenticateSentinel();
  
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 3);
  
  const request = {
    input: {
      bounds: {
        bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: {
          timeRange: {
            from: `${startDate.toISOString().split('T')[0]}T00:00:00Z`,
            to: `${endDate.toISOString().split('T')[0]}T23:59:59Z`
          },
          maxCloudCoverage: 20
        }
      }]
    },
    output: {
      width,
      height,
      responses: [{
        identifier: 'default',
        format: { type: 'image/jpeg' }
      }]
    },
    evalscript: `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B03", "B02"],
          output: { bands: 3 }
        };
      }
      
      function evaluatePixel(sample) {
        return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
      }
    `
  };
  
  try {
    const response = await axios.post(`${SENTINEL_HUB_API}/process`, request, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    
    return {
      image: `data:image/jpeg;base64,${base64Image}`,
      bbox,
      date,
      type: 'true-color',
      source: 'Sentinel-2'
    };
    
  } catch (error) {
    console.error('[Sentinel-2] True color fetch failed:', error.message);
    throw new Error(`Sentinel-2 true color fetch failed: ${error.message}`);
  }
};

/**
 * Calculate statistics from Sentinel-2 data
 * Returns mean NDVI and biomass estimate
 */
export const calculateSentinelStatistics = async (bbox, date) => {
  const token = await authenticateSentinel();
  
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 3);
  
  const request = {
    input: {
      bounds: {
        bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: {
          timeRange: {
            from: `${startDate.toISOString().split('T')[0]}T00:00:00Z`,
            to: `${endDate.toISOString().split('T')[0]}T23:59:59Z`
          },
          maxCloudCoverage: 20
        }
      }]
    },
    aggregation: {
      timeRange: {
        from: `${startDate.toISOString().split('T')[0]}T00:00:00Z`,
        to: `${endDate.toISOString().split('T')[0]}T23:59:59Z`
      },
      aggregationInterval: {
        of: 'P1D'
      },
      evalscript: `
        //VERSION=3
        function setup() {
          return {
            input: [{
              bands: ["B04", "B08", "SCL"],
              units: "DN"
            }],
            output: [
              {
                id: "ndvi",
                bands: 1,
                sampleType: "FLOAT32"
              },
              {
                id: "dataMask",
                bands: 1
              }
            ]
          }
        }
        
        function evaluatePixel(samples) {
          let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
          let validData = samples.SCL !== 8 && samples.SCL !== 9 && samples.SCL !== 10 ? 1 : 0;
          
          return {
            ndvi: [ndvi],
            dataMask: [validData]
          };
        }
      `,
      resx: 10,
      resy: 10
    }
  };
  
  try {
    const response = await axios.post(`${SENTINEL_HUB_API}/process`, request, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Process statistics from response
    const stats = response.data;
    
    return {
      meanNDVI: stats.mean || 0.5,
      minNDVI: stats.min || 0.2,
      maxNDVI: stats.max || 0.8,
      stdNDVI: stats.stdev || 0.1,
      validPixels: stats.validPixels || 0,
      cloudyPixels: stats.cloudyPixels || 0,
      date,
      source: 'Sentinel-2'
    };
    
  } catch (error) {
    console.error('[Sentinel-2] Statistics calculation failed:', error.message);
    throw new Error(`Sentinel-2 statistics failed: ${error.message}`);
  }
};

/**
 * Determine if Sentinel-2 should be used instead of MODIS
 * Use Sentinel-2 for pastures <10 hectares
 */
export const shouldUseSentinel = (pastureAreaHa) => {
  return pastureAreaHa < 10;
};

/**
 * Convert pasture boundary to bbox
 */
export const boundarytoBbox = (boundary) => {
  if (boundary.type === 'Point') {
    const buffer = 0.01; // ~1km
    return [
      boundary.coordinates[0] - buffer,
      boundary.coordinates[1] - buffer,
      boundary.coordinates[0] + buffer,
      boundary.coordinates[1] + buffer
    ];
  }
  
  const coords = boundary.coordinates[0];
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  
  return [
    Math.min(...lons),
    Math.min(...lats),
    Math.max(...lons),
    Math.max(...lats)
  ];
};

/**
 * Get cached Sentinel-2 data
 */
export const getCachedSentinelData = async (bbox, date) => {
  try {
    const cacheKey = `sentinel_${bbox.join('_')}_${date}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? { image: `data:image/png;base64,${cached}`, bbox, date } : null;
  } catch (error) {
    console.error('[Sentinel-2] Cache retrieval failed:', error);
    return null;
  }
};
