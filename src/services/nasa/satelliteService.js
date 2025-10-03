import { getSMAPTrend } from './smapService';
import { submitMODISTask, downloadMODISData } from './modisService';
import { searchLandsatScenes, calculateLandsatNDVI } from './landsatService';
import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';

const SATELLITE_COLLECTION = 'satellite_data';

const ensureDb = () => {
  if (!db) {
    throw new Error('Firebase Firestore is not initialized. Ensure firebase.config.js exports a Firestore instance.');
  }
};

export const getCompleteSatelliteData = async (farmId, latitude, longitude, startDate, endDate, options = {}) => {
  const { landsatCloudCover = 20 } = options;
  ensureDb();

  try {
    const [soilMoisture, modisTaskId, rawLandsatScenes] = await Promise.all([
      getSMAPTrend(latitude, longitude, startDate, endDate),
      submitMODISTask(latitude, longitude, startDate, endDate),
      searchLandsatScenes(latitude, longitude, startDate, endDate, { maxCloudCover: landsatCloudCover }),
    ]);

    const modisNdvi = await downloadMODISData(modisTaskId, options.modis || {});

    const landsatScenes = [];
    let landsatNdviSum = 0;
    let landsatNdviCount = 0;

    for (const scene of rawLandsatScenes) {
      try {
        const stats = await calculateLandsatNDVI(scene);
        landsatScenes.push({ ...scene, ndvi: stats });
        landsatNdviSum += stats.mean;
        landsatNdviCount += 1;
      } catch (landsatError) {
        console.warn(`[SatelliteService] Failed to compute Landsat NDVI for ${scene.id}:`, landsatError?.message || landsatError);
      }
    }

    const landsatSummary = landsatNdviCount
      ? {
          averageMean: landsatNdviSum / landsatNdviCount,
          sceneCount: landsatNdviCount,
        }
      : null;

    const satelliteData = {
      farmId,
      location: { latitude, longitude },
      dateRange: { startDate, endDate },
      soilMoisture,
      modisNdvi,
      landsatScenes,
      landsatSummary,
      fetchedAt: new Date().toISOString(),
    };

    await addDoc(collection(db, SATELLITE_COLLECTION), satelliteData);

    return satelliteData;
  } catch (error) {
    console.error('[SatelliteService] error fetching data:', error);
    throw error;
  }
};

export const verifySatelliteEvidence = async (farmId, claimedYield, claimedSoilHealth) => {
  ensureDb();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const farmDoc = await getDoc(doc(db, 'farms', farmId));
  if (!farmDoc.exists()) {
    throw new Error(`Farm ${farmId} not found`);
  }

  const { latitude, longitude } = farmDoc.data().location || {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error(`Farm ${farmId} missing latitude/longitude`);
  }

  const satData = await getCompleteSatelliteData(farmId, latitude, longitude, startDate, endDate);

  const avgNDVI = satData.modisNdvi?.mean ?? satData.landsatSummary?.averageMean ?? null;
  const avgSoilMoisture = satData.soilMoisture.length
    ? satData.soilMoisture.reduce((sum, record) => sum + (record.soilMoisture || 0), 0) / satData.soilMoisture.length
    : null;

  const yieldValid = typeof avgNDVI === 'number' ? avgNDVI > 0.5 : false;
  const soilHealthValid = typeof avgSoilMoisture === 'number' ? avgSoilMoisture > 0.2 && avgSoilMoisture < 0.4 : false;

  return {
    verified: yieldValid && soilHealthValid,
    evidence: satData,
    yieldCheck: {
      claimed: claimedYield,
      ndvi: avgNDVI,
      valid: yieldValid,
    },
    soilCheck: {
      claimed: claimedSoilHealth,
      measured: avgSoilMoisture,
      valid: soilHealthValid,
    },
  };
};
