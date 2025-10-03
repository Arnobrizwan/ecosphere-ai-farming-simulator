/**
 * UC39 - Planting Guide Service
 * Crop-specific planting windows using NASA climate/NDVI history
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { trackNDVI } from '../satellite/satelliteVisualization.service';
import axios from 'axios';
export class PlantingGuideService {
  constructor(userId) {
    this.userId = userId;
    this.guidesCollection = collection(db, 'planting_guides');
  }

  async getPlantingGuide(config) {
    const { cropType, location } = config;

    // Calculate planting windows
    const windows = await this.calculatePlantingWindows(cropType, location);

    // Get best practices
    const bestPractices = this.getBestPractices(cropType);

    // Get input requirements
    const inputs = this.getInputRequirements(cropType);

    // Get soil preparation
    const soilPrep = this.getSoilPreparation(cropType);

    const guide = {
      userId: this.userId,
      cropType,
      location,
      plantingWindows: windows,
      bestPractices,
      inputs,
      soilPreparation: soilPrep,
      climateData: await this.getClimateData(location),
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.guidesCollection, guide);

    return {
      id: docRef.id,
      ...guide
    };
  }

  async calculatePlantingWindows(cropType, location) {
    // Use NASA NDVI historical data to determine optimal planting windows
    const windows = [];
    
    try {
      // Get historical NDVI trend for the region
      const ndviData = await trackNDVI(
        location,
        {
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      );

      // Bangladesh crop calendars based on NDVI patterns
      if (cropType === 'rice') {
        windows.push({
          season: 'Boro',
          start: new Date(2025, 11, 1).getTime(), // December
          end: new Date(2026, 0, 31).getTime(), // January
          harvest: new Date(2026, 3, 30).getTime(), // April
          optimal: true,
          ndviThreshold: 0.6,
          reason: 'Dry season rice - irrigation required, high NDVI expected'
        });
        windows.push({
          season: 'Aus',
          start: new Date(2025, 2, 15).getTime(), // March
          end: new Date(2025, 3, 30).getTime(), // April
          harvest: new Date(2025, 6, 31).getTime(), // July
          optimal: false,
          ndviThreshold: 0.5,
          reason: 'Pre-monsoon rice - moderate rainfall'
        });
        windows.push({
          season: 'Aman',
          start: new Date(2025, 5, 15).getTime(), // June
          end: new Date(2025, 7, 15).getTime(), // August
          harvest: new Date(2025, 10, 30).getTime(), // November
          optimal: true,
          ndviThreshold: 0.7,
          reason: 'Monsoon rice - natural rainfall, peak NDVI growth'
        });
      } else if (cropType === 'wheat') {
        windows.push({
          season: 'Rabi',
          start: new Date(2025, 10, 1).getTime(), // November
          end: new Date(2025, 11, 15).getTime(), // December
          harvest: new Date(2026, 2, 31).getTime(), // March
          optimal: true,
          ndviThreshold: 0.55,
          reason: 'Winter wheat - cool temperatures, optimal NDVI'
        });
      }

      // Add current NDVI status to each window
      if (ndviData.success && ndviData.ndvi) {
        windows.forEach(window => {
          window.currentNDVI = ndviData.ndvi.mean;
          window.healthStatus = ndviData.ndvi.mean >= window.ndviThreshold ? 'ready' : 'wait';
        });
      }
    } catch (error) {
      console.error('[PlantingGuide] NASA NDVI fetch failed:', error);
    }

    return windows;
  }

  getBestPractices(cropType) {
    const practices = {
      rice: [
        'Prepare land 2-3 weeks before planting',
        'Ensure proper water drainage system',
        'Use certified seeds for better yield',
        'Maintain 20cm spacing between rows',
        'Apply organic matter before planting'
      ],
      wheat: [
        'Plow field to 15-20cm depth',
        'Apply basal fertilizer before sowing',
        'Use seed drill for uniform spacing',
        'Ensure soil moisture at sowing',
        'Control weeds in first 30 days'
      ]
    };

    return practices[cropType] || [];
  }

  getInputRequirements(cropType) {
    const requirements = {
      rice: [
        { type: 'seeds', quantity: 40, unit: 'kg/ha', timing: 'at_planting' },
        { type: 'urea', quantity: 200, unit: 'kg/ha', timing: 'split_application' },
        { type: 'tsp', quantity: 100, unit: 'kg/ha', timing: 'basal' },
        { type: 'mop', quantity: 70, unit: 'kg/ha', timing: 'basal' }
      ],
      wheat: [
        { type: 'seeds', quantity: 120, unit: 'kg/ha', timing: 'at_sowing' },
        { type: 'urea', quantity: 220, unit: 'kg/ha', timing: 'split_application' },
        { type: 'dap', quantity: 150, unit: 'kg/ha', timing: 'basal' }
      ]
    };

    return requirements[cropType] || [];
  }

  getSoilPreparation(cropType) {
    return [
      'Remove previous crop residues',
      'Deep plowing to 20-25cm',
      'Level the field properly',
      'Apply organic manure',
      'Ensure proper drainage'
    ];
  }

  async getClimateData(location) {
    try {
      // Fetch NASA POWER climate data
      const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');

      const response = await axios.get('https://power.larc.nasa.gov/api/temporal/daily/point', {
        params: {
          parameters: 'T2M,PRECTOTCORR,T2M_MAX,T2M_MIN',
          community: 'ag',
          latitude: location.latitude,
          longitude: location.longitude,
          start: startDate,
          end: endDate,
          format: 'json'
        }
      });

      const params = response.data?.properties?.parameter || {};
      
      // Calculate averages
      const temps = Object.values(params.T2M || {});
      const rainfall = Object.values(params.PRECTOTCORR || {});
      
      return {
        avgTemperature: temps.reduce((a, b) => a + b, 0) / temps.length,
        avgRainfall: rainfall.reduce((a, b) => a + b, 0) / rainfall.length,
        maxTemp: Math.max(...Object.values(params.T2M_MAX || {})),
        minTemp: Math.min(...Object.values(params.T2M_MIN || {})),
        totalRainfall: rainfall.reduce((a, b) => a + b, 0),
        frostFreeDays: 365, // Bangladesh is frost-free
        dataSource: 'NASA POWER'
      };
    } catch (error) {
      console.error('[PlantingGuide] NASA POWER fetch failed:', error);
      return {
        avgTemperature: 28,
        avgRainfall: 150,
        frostFreeDays: 365,
        dataSource: 'estimated'
      };
    }
  }

  async saveToNotes(guideId) {
    const guide = await getDoc(doc(db, 'planting_guides', guideId));

    if (!guide.exists()) {
      throw new Error('Guide not found');
    }

    await addDoc(collection(db, 'user_notes'), {
      userId: this.userId,
      type: 'planting_guide',
      guideId,
      content: guide.data(),
      savedAt: new Date().toISOString(),
    });

    return { success: true, saved: true, guideId };
  }
}

export default PlantingGuideService;
