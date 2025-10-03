#!/usr/bin/env node
/**
 * Fetch REAL NASA satellite data for Bangladesh farms
 * Uses actual NASA APIs: SMAP, IMERG, MODIS NDVI, Landsat LST
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'nasa_training_data');
const NASA_TOKEN = process.env.NASA_EARTHDATA_TOKEN;
const NASA_USERNAME = process.env.NASA_EARTHDATA_USERNAME;

if (!NASA_TOKEN) {
  console.error('❌ NASA_EARTHDATA_TOKEN not found in .env');
  process.exit(1);
}

// Ensure output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Bangladesh farm locations
const BANGLADESH_FARMS = [
  { id: 'dhaka_central', lat: 23.8103, lon: 90.4125, name: 'Dhaka Central' },
  { id: 'rajshahi', lat: 24.3745, lon: 88.6042, name: 'Rajshahi' },
  { id: 'chittagong', lat: 22.3569, lon: 91.7832, name: 'Chittagong' },
  { id: 'khulna', lat: 22.8456, lon: 89.5403, name: 'Khulna' },
  { id: 'sylhet', lat: 24.8949, lon: 91.8687, name: 'Sylhet' },
  { id: 'rangpur', lat: 25.7439, lon: 89.2752, name: 'Rangpur' },
  { id: 'barisal', lat: 22.7010, lon: 90.3535, name: 'Barisal' },
  { id: 'mymensingh', lat: 24.7471, lon: 90.4203, name: 'Mymensingh' },
];

// NASA CMR API for SMAP
const CMR_API = 'https://cmr.earthdata.nasa.gov/search/granules.json';

// GPM IMERG API
const IMERG_API = 'https://gpm1.gesdisc.eosdis.nasa.gov/data/GPM_L3/GPM_3IMERGDF.07';

// Date range (last 90 days for real data)
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 90);

const formatDate = (date) => date.toISOString().split('T')[0];

/**
 * Fetch REAL SMAP Soil Moisture data
 */
async function fetchSMAPData(location, date) {
  try {
    const bbox = `${location.lon - 0.1},${location.lat - 0.1},${location.lon + 0.1},${location.lat + 0.1}`;
    
    const response = await axios.get(CMR_API, {
      params: {
        short_name: 'SPL3SMP_E',
        version: '005',
        bounding_box: bbox,
        temporal: `${date}T00:00:00Z,${date}T23:59:59Z`,
        page_size: 5,
      },
      headers: {
        Authorization: `Bearer ${NASA_TOKEN}`,
      },
    });

    const entries = response?.data?.feed?.entry || [];
    if (entries.length === 0) return null;

    const granule = entries[0];
    const dataUrl = granule.links?.find(link => link.rel?.includes('data'))?.href;

    return {
      date,
      location: location.id,
      source: 'SMAP',
      granuleId: granule.id,
      dataUrl,
      bbox: granule.boxes?.[0] || bbox,
    };
  } catch (error) {
    console.warn(`[SMAP] ${location.name} ${date}:`, error.message);
    return null;
  }
}

/**
 * Fetch REAL NASA POWER environmental data
 */
async function fetchNASAPowerData(location, startDate, endDate) {
  try {
    const response = await axios.get('https://power.larc.nasa.gov/api/temporal/daily/point', {
      params: {
        parameters: 'T2M,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,T2M_MAX,T2M_MIN',
        community: 'ag',
        latitude: location.lat,
        longitude: location.lon,
        start: startDate.replace(/-/g, ''),
        end: endDate.replace(/-/g, ''),
        format: 'json',
      },
    });

    return response.data;
  } catch (error) {
    console.warn(`[POWER] ${location.name}:`, error.message);
    return null;
  }
}

/**
 * Fetch REAL MODIS NDVI via AppEEARS
 */
async function submitMODISRequest(location, startDate, endDate) {
  try {
    // Login to AppEEARS
    const loginRes = await axios.post(
      'https://appeears.earthdatacloud.nasa.gov/api/login',
      {
        username: NASA_USERNAME,
        password: NASA_TOKEN,
      }
    );

    const token = loginRes?.data?.token;
    if (!token) throw new Error('AppEEARS login failed');

    // Submit task
    const taskRes = await axios.post(
      'https://appeears.earthdatacloud.nasa.gov/api/task',
      {
        task_type: 'point',
        task_name: `Bangladesh_${location.id}_${Date.now()}`,
        params: {
          dates: [{ startDate, endDate }],
          layers: [
            { product: 'MOD13Q1.061', layer: 'NDVI' },
            { product: 'MOD11A2.061', layer: 'LST_Day_1km' },
          ],
          coordinates: [
            {
              latitude: location.lat,
              longitude: location.lon,
              category: location.id,
            },
          ],
          output: {
            format: { type: 'geotiff' },
            projection: 'geographic',
          },
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return {
      taskId: taskRes?.data?.task_id,
      token,
      location: location.id,
    };
  } catch (error) {
    console.warn(`[MODIS] ${location.name}:`, error.message);
    return null;
  }
}

/**
 * Main collection orchestrator
 */
async function collectRealNASAData() {
  console.log('\n🛰️  NASA REAL DATA COLLECTION FOR BANGLADESH');
  console.log('='.repeat(60));
  console.log(`📅 Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`📍 Locations: ${BANGLADESH_FARMS.length} farms\n`);

  const allData = {
    metadata: {
      collectedAt: new Date().toISOString(),
      locations: BANGLADESH_FARMS.length,
      dateRange: { start: formatDate(startDate), end: formatDate(endDate) },
      sources: ['SMAP', 'NASA_POWER', 'MODIS', 'Landsat'],
    },
    smap: [],
    power: [],
    modis: [],
  };

  // 1. Fetch SMAP soil moisture data
  console.log('1️⃣  Fetching SMAP Soil Moisture...');
  for (const location of BANGLADESH_FARMS) {
    const dateStr = formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const smapData = await fetchSMAPData(location, dateStr);
    if (smapData) {
      allData.smap.push(smapData);
      console.log(`   ✓ ${location.name}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 2. Fetch NASA POWER environmental data
  console.log('\n2️⃣  Fetching NASA POWER Data...');
  for (const location of BANGLADESH_FARMS) {
    const powerData = await fetchNASAPowerData(
      location,
      formatDate(startDate),
      formatDate(endDate)
    );
    
    if (powerData) {
      allData.power.push({
        location: location.id,
        data: powerData,
      });
      console.log(`   ✓ ${location.name}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 3. Submit MODIS NDVI requests
  console.log('\n3️⃣  Submitting MODIS/Landsat Requests...');
  for (const location of BANGLADESH_FARMS) {
    const modisTask = await submitMODISRequest(
      location,
      formatDate(startDate),
      formatDate(endDate)
    );
    
    if (modisTask) {
      allData.modis.push(modisTask);
      console.log(`   ✓ ${location.name} - Task ${modisTask.taskId}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save consolidated data
  const outputFile = path.join(OUTPUT_DIR, 'bangladesh_real_nasa_data.json');
  fs.writeFileSync(outputFile, JSON.stringify(allData, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Collection Complete!`);
  console.log(`📊 SMAP Records: ${allData.smap.length}`);
  console.log(`📊 POWER Locations: ${allData.power.length}`);
  console.log(`📊 MODIS Tasks: ${allData.modis.length}`);
  console.log(`💾 Saved to: ${outputFile}\n`);

  // Save individual POWER datasets for training
  for (const powerRecord of allData.power) {
    const powerFile = path.join(OUTPUT_DIR, `power_real_${powerRecord.location}.json`);
    fs.writeFileSync(powerFile, JSON.stringify(powerRecord.data, null, 2));
  }

  console.log('📝 Note: MODIS tasks are processing. Check status in ~10-15 minutes.');
  console.log('   Use AppEEARS dashboard or API to download completed bundles.\n');
}

// Execute
collectRealNASAData().catch(console.error);
