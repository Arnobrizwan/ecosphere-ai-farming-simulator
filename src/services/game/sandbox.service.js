/**
 * UC7 - Sandbox Mode Service
 * Free experimentation with farm parameters and NASA data
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { fetchSatelliteLayers } from '../satellite/satelliteVisualization.service';

const SANDBOX_COLLECTION = 'sandbox_scenarios';

/**
 * Default sandbox scenario
 */
const DEFAULT_SCENARIO = {
  name: 'Default Farm',
  cropType: 'rice',
  soilProperties: {
    type: 'loam',
    pH: 6.5,
    organicMatter: 3.5,
    drainage: 'moderate',
  },
  weather: {
    temperature: 28,
    humidity: 70,
    rainfall: 15,
    solarRadiation: 18,
  },
  farmSize: {
    width: 100,
    length: 100,
    unit: 'meters',
  },
  resources: {
    water: 1000,
    fertilizer: 500,
    seeds: 200,
  },
  nasaDataEnabled: true,
};

/**
 * Launch sandbox mode
 */
export const launchSandbox = async (userId, scenarioId = null) => {
  let scenario;

  if (scenarioId) {
    // Load existing scenario
    const docSnap = await getDoc(doc(db, SANDBOX_COLLECTION, scenarioId));

    if (!docSnap.exists()) {
      throw new Error('Scenario not found');
    }

    scenario = docSnap.data();
  } else {
    // Create new scenario
    scenario = { ...DEFAULT_SCENARIO };
  }

  // Initialize sandbox session
  const session = {
    userId,
    scenario,
    sessionId: `sandbox_${Date.now()}`,
    startedAt: new Date().toISOString(),
    status: 'active',
    changes: [],
  };

  await addDoc(collection(db, 'sandbox_sessions'), session);

  return {
    success: true,
    session,
  };
};

/**
 * Update scenario parameters
 */
export const updateScenarioParams = async (sessionId, updates) => {
  const q = query(
    collection(db, 'sandbox_sessions'),
    where('sessionId', '==', sessionId),
    where('status', '==', 'active'),
    limit(1)
  );
  const sessionQuery = await getDocs(q);

  if (sessionQuery.empty) {
    throw new Error('Active session not found');
  }

  const sessionDoc = sessionQuery.docs[0];
  const session = sessionDoc.data();

  // Apply updates
  const updatedScenario = applyUpdates(session.scenario, updates);

  // Track changes
  const change = {
    timestamp: new Date().toISOString(),
    updates,
    previousState: session.scenario,
  };

  await updateDoc(sessionDoc.ref, {
    scenario: updatedScenario,
    changes: [...session.changes, change],
    updatedAt: new Date().toISOString(),
  });

  // Simulate outcomes
  const outcomes = await simulateOutcomes(updatedScenario);

  return {
    success: true,
    scenario: updatedScenario,
    outcomes,
  };
};

/**
 * Apply parameter updates to scenario
 */
function applyUpdates(scenario, updates) {
  const updated = { ...scenario };

  if (updates.cropType) {
    updated.cropType = updates.cropType;
  }

  if (updates.soilProperties) {
    updated.soilProperties = { ...updated.soilProperties, ...updates.soilProperties };
  }

  if (updates.weather) {
    updated.weather = { ...updated.weather, ...updates.weather };
  }

  if (updates.farmSize) {
    updated.farmSize = { ...updated.farmSize, ...updates.farmSize };
  }

  if (updates.resources) {
    updated.resources = { ...updated.resources, ...updates.resources };
  }

  return updated;
}

/**
 * Simulate outcomes based on scenario parameters
 */
async function simulateOutcomes(scenario) {
  const { cropType, soilProperties, weather, farmSize, resources, nasaDataEnabled } = scenario;

  // Calculate yield potential
  const baseYield = getCropBaseYield(cropType);
  
  // Soil factor
  const soilFactor = calculateSoilFactor(soilProperties);
  
  // Weather factor
  const weatherFactor = calculateWeatherFactor(weather);
  
  // Resource factor
  const resourceFactor = calculateResourceFactor(resources, farmSize);

  // NASA data integration (if enabled)
  let nasaFactor = 1.0;
  if (nasaDataEnabled) {
    try {
      const satData = await fetchSatelliteLayers(
        {
          minLat: 23.8,
          maxLat: 23.9,
          minLon: 90.3,
          maxLon: 90.5,
        },
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        },
        ['smap', 'ndvi']
      );

      if (satData.success) {
        nasaFactor = calculateNASAFactor(satData.layers);
      }
    } catch (error) {
      console.warn('[Sandbox] NASA data fetch failed:', error);
    }
  }

  // Total yield
  const totalYield = baseYield * soilFactor * weatherFactor * resourceFactor * nasaFactor;
  const farmArea = (farmSize.width * farmSize.length) / 10000; // hectares
  const totalProduction = totalYield * farmArea;

  // Calculate efficiency metrics
  const waterEfficiency = (totalProduction / resources.water) * 100;
  const fertilizerEfficiency = (totalProduction / resources.fertilizer) * 100;

  return {
    estimatedYield: totalYield.toFixed(2),
    totalProduction: totalProduction.toFixed(2),
    unit: 'kg/hectare',
    efficiency: {
      water: waterEfficiency.toFixed(2),
      fertilizer: fertilizerEfficiency.toFixed(2),
      overall: ((soilFactor + weatherFactor + resourceFactor + nasaFactor) / 4 * 100).toFixed(2),
    },
    factors: {
      soil: soilFactor.toFixed(2),
      weather: weatherFactor.toFixed(2),
      resources: resourceFactor.toFixed(2),
      nasa: nasaFactor.toFixed(2),
    },
    recommendations: generateRecommendations(scenario, {
      soilFactor,
      weatherFactor,
      resourceFactor,
      nasaFactor,
    }),
  };
}

/**
 * Calculate factors
 */
function getCropBaseYield(cropType) {
  const baseYields = {
    rice: 4500,
    wheat: 3200,
    corn: 5800,
    jute: 2200,
    potato: 22000,
  };
  return baseYields[cropType] || 3000;
}

function calculateSoilFactor(soil) {
  let factor = 1.0;
  
  // pH factor
  if (soil.pH >= 6.0 && soil.pH <= 7.5) {
    factor *= 1.0;
  } else {
    factor *= 0.8;
  }
  
  // Organic matter
  if (soil.organicMatter > 3.0) {
    factor *= 1.1;
  } else if (soil.organicMatter < 2.0) {
    factor *= 0.9;
  }
  
  // Drainage
  if (soil.drainage === 'good') {
    factor *= 1.05;
  } else if (soil.drainage === 'poor') {
    factor *= 0.85;
  }
  
  return Math.min(factor, 1.2);
}

function calculateWeatherFactor(weather) {
  let factor = 1.0;
  
  // Temperature (optimal 25-30°C)
  if (weather.temperature >= 25 && weather.temperature <= 30) {
    factor *= 1.0;
  } else if (weather.temperature > 35) {
    factor *= 0.7;
  } else if (weather.temperature < 20) {
    factor *= 0.8;
  }
  
  // Humidity (optimal 60-80%)
  if (weather.humidity >= 60 && weather.humidity <= 80) {
    factor *= 1.0;
  } else {
    factor *= 0.9;
  }
  
  // Rainfall (optimal 10-30mm)
  if (weather.rainfall >= 10 && weather.rainfall <= 30) {
    factor *= 1.0;
  } else if (weather.rainfall < 5) {
    factor *= 0.7;
  } else if (weather.rainfall > 50) {
    factor *= 0.8;
  }
  
  return Math.min(factor, 1.15);
}

function calculateResourceFactor(resources, farmSize) {
  const farmArea = (farmSize.width * farmSize.length) / 10000;
  
  const waterPerHa = resources.water / farmArea;
  const fertilizerPerHa = resources.fertilizer / farmArea;
  
  let factor = 1.0;
  
  if (waterPerHa >= 5000) factor *= 1.0;
  else if (waterPerHa < 3000) factor *= 0.8;
  
  if (fertilizerPerHa >= 250) factor *= 1.0;
  else if (fertilizerPerHa < 150) factor *= 0.85;
  
  return Math.min(factor, 1.1);
}

function calculateNASAFactor(layers) {
  let factor = 1.0;
  
  if (layers.smap && layers.smap.length > 0) {
    const avgMoisture = layers.smap.reduce((sum, d) => sum + d.soilMoisture, 0) / layers.smap.length;
    
    if (avgMoisture >= 0.20 && avgMoisture <= 0.35) {
      factor *= 1.1;
    } else if (avgMoisture < 0.15) {
      factor *= 0.8;
    }
  }
  
  if (layers.ndvi && layers.ndvi.mean) {
    if (layers.ndvi.mean > 0.6) {
      factor *= 1.05;
    } else if (layers.ndvi.mean < 0.3) {
      factor *= 0.9;
    }
  }
  
  return Math.min(factor, 1.2);
}

function generateRecommendations(scenario, factors) {
  const recommendations = [];
  
  if (factors.soilFactor < 0.9) {
    recommendations.push({
      type: 'soil',
      priority: 'high',
      message: 'Consider adjusting soil pH or adding organic matter',
    });
  }
  
  if (factors.weatherFactor < 0.8) {
    recommendations.push({
      type: 'weather',
      priority: 'high',
      message: 'Weather conditions are suboptimal. Consider irrigation or crop protection.',
    });
  }
  
  if (factors.resourceFactor < 0.9) {
    recommendations.push({
      type: 'resources',
      priority: 'medium',
      message: 'Increase water or fertilizer allocation for better results',
    });
  }
  
  if (factors.nasaFactor < 0.9) {
    recommendations.push({
      type: 'satellite',
      priority: 'medium',
      message: 'Real-time satellite data indicates stress. Check soil moisture and NDVI.',
    });
  }
  
  return recommendations;
}

/**
 * Save custom scenario
 */
export const saveScenario = async (userId, sessionId, scenarioName) => {
  const q = query(
    collection(db, 'sandbox_sessions'),
    where('sessionId', '==', sessionId),
    limit(1)
  );
  const sessionQuery = await getDocs(q);

  if (sessionQuery.empty) {
    throw new Error('Session not found');
  }

  const session = sessionQuery.docs[0].data();

  const savedScenario = {
    ...session.scenario,
    name: scenarioName,
    userId,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, SANDBOX_COLLECTION), savedScenario);

  return {
    success: true,
    scenarioId: docRef.id,
    scenario: savedScenario,
  };
};

/**
 * Load saved scenario
 */
export const loadScenario = async (userId, scenarioId) => {
  const docSnap = await getDoc(doc(db, SANDBOX_COLLECTION, scenarioId));

  if (!docSnap.exists()) {
    throw new Error('Scenario not found');
  }

  const scenario = docSnap.data();
  
  if (scenario.userId !== userId) {
    throw new Error('Unauthorized');
  }

  return {
    success: true,
    scenario,
  };
};

/**
 * Get user's saved scenarios
 */
export const getUserScenarios = async (userId) => {
  const q = query(
    collection(db, SANDBOX_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  const scenarios = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    success: true,
    scenarios,
  };
};

/**
 * Enable NASA real-time data
 */
export const enableNASAData = async (sessionId, enabled = true) => {
  const q = query(
    collection(db, 'sandbox_sessions'),
    where('sessionId', '==', sessionId),
    limit(1)
  );
  const sessionQuery = await getDocs(q);

  if (sessionQuery.empty) {
    throw new Error('Session not found');
  }

  await updateDoc(sessionQuery.docs[0].ref, {
    'scenario.nasaDataEnabled': enabled,
  });

  return {
    success: true,
    nasaDataEnabled: enabled,
  };
};
