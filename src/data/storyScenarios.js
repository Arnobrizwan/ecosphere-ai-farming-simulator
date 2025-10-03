/**
 * Story-Driven Sandbox Scenarios with NASA Data Integration
 * Real-world farming challenges based on actual satellite data
 */

export const STORY_SCENARIOS = [
  {
    id: 'sc1',
    title: '🌾 The Perfect Start',
    story: 'Grandpa Jack hands you the deed to your inherited farm. "This land has been in our family for generations. The soil is rich, the weather is favorable. Show me what you can do!"',
    character: 'GRANDPA_JACK',
    difficulty: 'beginner',
    location: { lat: 23.8103, lon: 90.4125 }, // Manikganj, Bangladesh
    duration: '7 days',
    nasaData: {
      smap: { target: 0.30, range: [0.25, 0.35] }, // 30% soil moisture (ideal)
      rainfall: { target: 150, range: [120, 180] }, // mm per week
      temperature: { target: 28, range: [25, 32] }, // °C
      ndvi: { target: 0.6, range: [0.5, 0.7] } // Healthy crops
    },
    objectives: [
      { id: 'obj1', text: 'Check SMAP soil moisture data', type: 'nasa', layer: 'smap' },
      { id: 'obj2', text: 'Plant rice in 2 hectares', type: 'action' },
      { id: 'obj3', text: 'Monitor NDVI for crop health', type: 'nasa', layer: 'ndvi' },
      { id: 'obj4', text: 'Achieve 85%+ crop health', type: 'achievement' }
    ],
    rewards: { xp: 200, coins: 300, badge: 'Perfect Start' },
    tips: [
      'Use SMAP data to check if soil moisture is optimal (25-35%)',
      'Rice needs consistent moisture - check IMERG rainfall forecasts',
      'Monitor NDVI weekly to track crop growth'
    ]
  },

  {
    id: 'sc2',
    title: '💧 The Drought Crisis',
    story: 'Tom the weatherman calls with bad news: "A severe drought is coming! SMAP shows soil moisture dropping fast. You have one week to save your crops before they wither."',
    character: 'TOM_WEATHER',
    difficulty: 'intermediate',
    location: { lat: 24.3636, lon: 88.6241 }, // Rajshahi (drought-prone)
    duration: '7 days',
    nasaData: {
      smap: { target: 0.15, range: [0.10, 0.20] }, // Critical low moisture
      rainfall: { target: 20, range: [10, 30] }, // Very low rainfall
      temperature: { target: 38, range: [35, 42] }, // Heat wave
      ndvi: { target: 0.3, range: [0.2, 0.4] } // Stressed crops
    },
    objectives: [
      { id: 'obj1', text: 'Use SMAP to identify driest areas', type: 'nasa', layer: 'smap' },
      { id: 'obj2', text: 'Install drip irrigation in critical zones', type: 'action' },
      { id: 'obj3', text: 'Monitor LST (Land Surface Temperature)', type: 'nasa', layer: 'lst' },
      { id: 'obj4', text: 'Save at least 70% of crops', type: 'achievement' }
    ],
    rewards: { xp: 400, coins: 600, badge: 'Drought Survivor' },
    crisis: true,
    tips: [
      'SMAP shows real-time soil moisture - prioritize driest fields',
      'Use LST data to find hottest zones needing urgent irrigation',
      'Drip irrigation saves 60% more water than flood irrigation'
    ]
  },

  {
    id: 'sc3',
    title: '🌧️ Monsoon Madness',
    story: 'Sarah Chen analyzes IMERG satellite data: "A massive monsoon system is approaching! Rainfall will exceed 400mm this week. We need to prepare for flooding immediately!"',
    character: 'SARAH_TECH',
    difficulty: 'intermediate',
    location: { lat: 22.4569, lon: 91.9695 }, // Chittagong (monsoon-heavy)
    duration: '7 days',
    nasaData: {
      smap: { target: 0.45, range: [0.40, 0.50] }, // Saturated soil
      rainfall: { target: 450, range: [400, 500] }, // Heavy monsoon
      temperature: { target: 26, range: [24, 28] }, // Cool and wet
      ndvi: { target: 0.5, range: [0.4, 0.6] } // Waterlogged stress
    },
    objectives: [
      { id: 'obj1', text: 'Check IMERG 7-day rainfall forecast', type: 'nasa', layer: 'imerg' },
      { id: 'obj2', text: 'Dig drainage channels in low areas', type: 'action' },
      { id: 'obj3', text: 'Harvest mature crops early', type: 'action' },
      { id: 'obj4', text: 'Prevent waterlogging damage', type: 'achievement' }
    ],
    rewards: { xp: 450, coins: 700, badge: 'Monsoon Master' },
    crisis: true,
    tips: [
      'IMERG provides 30-minute rainfall updates - plan drainage',
      'SMAP over 40% means waterlogging risk - act fast',
      'Harvest early if NDVI drops below 0.4 (stress indicator)'
    ]
  },

  {
    id: 'sc4',
    title: '🔥 Heatwave Emergency',
    story: 'Dr. Emily Green warns: "NASA MODIS shows a severe heatwave forming. Land surface temperatures will hit 45°C! Your crops have 5 days before heat stress becomes critical."',
    character: 'DR_GREEN',
    difficulty: 'advanced',
    location: { lat: 25.7439, lon: 89.2752 }, // Rangpur (hot & dry)
    duration: '5 days',
    nasaData: {
      smap: { target: 0.12, range: [0.08, 0.16] }, // Extremely dry
      rainfall: { target: 5, range: [0, 10] }, // Almost none
      temperature: { target: 43, range: [40, 46] }, // Extreme heat
      ndvi: { target: 0.25, range: [0.15, 0.35] } // Severe stress
    },
    objectives: [
      { id: 'obj1', text: 'Monitor LST every 6 hours', type: 'nasa', layer: 'lst' },
      { id: 'obj2', text: 'Deploy shade nets on vulnerable crops', type: 'action' },
      { id: 'obj3', text: 'Emergency irrigation at night', type: 'action' },
      { id: 'obj4', text: 'Keep crop survival above 60%', type: 'achievement' }
    ],
    rewards: { xp: 600, coins: 1000, badge: 'Heat Warrior' },
    crisis: true,
    urgent: true,
    tips: [
      'LST above 42°C causes permanent crop damage',
      'Night irrigation reduces water loss by 50%',
      'NDVI below 0.2 means crops are dying - prioritize those areas'
    ]
  },

  {
    id: 'sc5',
    title: '🌱 The Precision Challenge',
    story: 'Marcus the market advisor challenges you: "I\'ll pay premium prices for perfectly grown wheat. Use NASA data to achieve 95%+ uniformity across your entire farm. Can you do it?"',
    character: 'MARCUS_TRADER',
    difficulty: 'advanced',
    location: { lat: 23.8103, lon: 90.4125 },
    duration: '14 days',
    nasaData: {
      smap: { target: 0.28, range: [0.26, 0.30] }, // Precise moisture
      rainfall: { target: 180, range: [160, 200] },
      temperature: { target: 22, range: [20, 24] }, // Cool for wheat
      ndvi: { target: 0.75, range: [0.70, 0.80] } // Excellent health
    },
    objectives: [
      { id: 'obj1', text: 'Use SMAP to map soil moisture variations', type: 'nasa', layer: 'smap' },
      { id: 'obj2', text: 'Create variable irrigation zones', type: 'action' },
      { id: 'obj3', text: 'Maintain NDVI above 0.70 everywhere', type: 'nasa', layer: 'ndvi' },
      { id: 'obj4', text: 'Achieve 95% uniformity score', type: 'achievement' }
    ],
    rewards: { xp: 800, coins: 1500, badge: 'Precision Farmer' },
    tips: [
      'Use SMAP 1km resolution to find micro-variations',
      'NDVI variance <0.05 across fields = uniform growth',
      'Adjust irrigation based on SMAP zones, not whole field'
    ]
  },

  {
    id: 'sc6',
    title: '🦗 Pest Invasion Detection',
    story: 'Anna Martinez rushes in: "My farm was destroyed by pests overnight! Dr. Green thinks we can use MODIS temperature data to predict where they\'ll strike next. Help me save my crops!"',
    character: 'ANNA_NEIGHBOR',
    difficulty: 'intermediate',
    location: { lat: 23.8103, lon: 90.4125 },
    duration: '10 days',
    nasaData: {
      smap: { target: 0.32, range: [0.28, 0.36] },
      rainfall: { target: 200, range: [180, 220] },
      temperature: { target: 30, range: [28, 33] }, // Pest-favorable temp
      ndvi: { target: 0.55, range: [0.45, 0.65] }
    },
    objectives: [
      { id: 'obj1', text: 'Use MODIS thermal data to find pest hotspots', type: 'nasa', layer: 'lst' },
      { id: 'obj2', text: 'Monitor NDVI drops (pest damage indicator)', type: 'nasa', layer: 'ndvi' },
      { id: 'obj3', text: 'Apply targeted pesticides to affected areas', type: 'action' },
      { id: 'obj4', text: 'Prevent NDVI from dropping below 0.40', type: 'achievement' }
    ],
    rewards: { xp: 500, coins: 800, badge: 'Pest Detective' },
    tips: [
      'Pests thrive at 28-33°C - use LST to predict activity',
      'NDVI drops >0.1 in 3 days = pest damage',
      'Target treatment where LST + low NDVI overlap'
    ]
  },

  {
    id: 'sc7',
    title: '🌾 Harvest Festival Race',
    story: 'The annual Harvest Festival is in 21 days! Anna challenges you to a friendly competition: "Whoever produces the highest yield using NASA data wins bragging rights and 2000 coins!"',
    character: 'ANNA_NEIGHBOR',
    difficulty: 'intermediate',
    location: { lat: 23.8103, lon: 90.4125 },
    duration: '21 days',
    nasaData: {
      smap: { target: 0.30, range: [0.25, 0.35] },
      rainfall: { target: 250, range: [220, 280] },
      temperature: { target: 27, range: [25, 30] },
      ndvi: { target: 0.70, range: [0.65, 0.75] }
    },
    objectives: [
      { id: 'obj1', text: 'Use all NASA layers for optimization', type: 'nasa', layer: 'all' },
      { id: 'obj2', text: 'Achieve yield >4 tons/hectare', type: 'achievement' },
      { id: 'obj3', text: 'Keep costs <$800/hectare', type: 'achievement' },
      { id: 'obj4', text: 'Beat Anna\'s yield of 3.8 tons', type: 'achievement' }
    ],
    rewards: { xp: 700, coins: 2000, badge: 'Festival Champion' },
    competitive: true,
    tips: [
      'Check SMAP daily - maintain 28-32% moisture for max yield',
      'IMERG forecasts help time fertilizer application',
      'NDVI >0.7 for final 7 days = premium harvest'
    ]
  },

  {
    id: 'sc8',
    title: '❄️ Unexpected Cold Snap',
    story: 'Tom Weather calls urgently: "A rare cold front is coming from the Himalayas! Temperatures will drop to 10°C. Your tropical crops are at risk. You have 48 hours to prepare!"',
    character: 'TOM_WEATHER',
    difficulty: 'advanced',
    location: { lat: 25.7439, lon: 89.2752 },
    duration: '3 days',
    nasaData: {
      smap: { target: 0.28, range: [0.25, 0.31] },
      rainfall: { target: 50, range: [40, 60] },
      temperature: { target: 12, range: [10, 15] }, // Unusually cold
      ndvi: { target: 0.45, range: [0.35, 0.55] }
    },
    objectives: [
      { id: 'obj1', text: 'Monitor MODIS temperature drops', type: 'nasa', layer: 'lst' },
      { id: 'obj2', text: 'Deploy frost protection covers', type: 'action' },
      { id: 'obj3', text: 'Harvest early what you can', type: 'action' },
      { id: 'obj4', text: 'Minimize crop loss to <30%', type: 'achievement' }
    ],
    rewards: { xp: 650, coins: 900, badge: 'Cold Snap Survivor' },
    crisis: true,
    urgent: true,
    tips: [
      'LST <15°C for 6+ hours = severe damage to tropical crops',
      'Harvest anything with NDVI >0.5 immediately',
      'Young crops (<30 days) won\'t survive - focus on mature ones'
    ]
  },

  {
    id: 'sc9',
    title: '🌍 Climate Change Adaptation',
    story: 'Dr. Green presents 30 years of NASA data: "Weather patterns have changed dramatically. Old farming methods won\'t work anymore. Can you adapt and thrive in this new climate reality?"',
    character: 'DR_GREEN',
    difficulty: 'advanced',
    location: { lat: 23.8103, lon: 90.4125 },
    duration: '30 days',
    nasaData: {
      smap: { target: 0.25, range: [0.15, 0.40] }, // Highly variable
      rainfall: { target: 200, range: [50, 400] }, // Erratic
      temperature: { target: 30, range: [22, 38] }, // Extreme swings
      ndvi: { target: 0.60, range: [0.40, 0.75] }
    },
    objectives: [
      { id: 'obj1', text: 'Analyze historical NASA data trends', type: 'nasa', layer: 'all' },
      { id: 'obj2', text: 'Implement climate-resilient practices', type: 'action' },
      { id: 'obj3', text: 'Maintain profitability despite extremes', type: 'achievement' },
      { id: 'obj4', text: 'Teach 3 adaptive strategies to Lily', type: 'teaching' }
    ],
    rewards: { xp: 1000, coins: 2500, badge: 'Climate Champion' },
    educational: true,
    tips: [
      'Use IMERG 10-year averages to predict rainfall patterns',
      'SMAP trends show shifting dry/wet zones',
      'Diversify crops based on temperature variance'
    ]
  },

  {
    id: 'sc10',
    title: '💦 Water Resource Management',
    story: 'Sarah Chen shows you the village\'s shrinking water table: "Five farms share one aquifer. Use SMAP and GRACE data to manage water sustainably, or everyone loses."',
    character: 'SARAH_TECH',
    difficulty: 'advanced',
    location: { lat: 23.8103, lon: 90.4125 },
    duration: '60 days',
    nasaData: {
      smap: { target: 0.26, range: [0.20, 0.32] },
      rainfall: { target: 220, range: [180, 260] },
      temperature: { target: 29, range: [26, 33] },
      ndvi: { target: 0.65, range: [0.55, 0.75] },
      grace: { target: -2, range: [-5, 0] } // cm groundwater change
    },
    objectives: [
      { id: 'obj1', text: 'Monitor GRACE groundwater trends', type: 'nasa', layer: 'grace' },
      { id: 'obj2', text: 'Reduce irrigation by 30%', type: 'achievement' },
      { id: 'obj3', text: 'Use SMAP for precision watering', type: 'nasa', layer: 'smap' },
      { id: 'obj4', text: 'Maintain yield above 80% of previous', type: 'achievement' }
    ],
    rewards: { xp: 900, coins: 1800, badge: 'Water Steward' },
    community: true,
    tips: [
      'GRACE shows regional groundwater depletion',
      'SMAP helps water only when soil <25% moisture',
      'IMERG forecasts reduce unnecessary irrigation'
    ]
  },

  {
    id: 'sc11',
    title: '🚁 Multi-Spectral Mastery',
    story: 'Marcus offers a premium contract: "I need satellite-verified premium crops. Use Landsat multi-spectral data to prove your produce is top quality. $5000 bonus if you succeed."',
    character: 'MARCUS_TRADER',
    difficulty: 'expert',
    location: { lat: 23.8103, lon: 90.4125 },
    duration: '45 days',
    nasaData: {
      smap: { target: 0.29, range: [0.27, 0.31] },
      rainfall: { target: 240, range: [220, 260] },
      temperature: { target: 26, range: [24, 28] },
      ndvi: { target: 0.80, range: [0.75, 0.85] },
      evi: { target: 0.60, range: [0.55, 0.65] } // Enhanced Vegetation Index
    },
    objectives: [
      { id: 'obj1', text: 'Use Landsat 8 for multi-band analysis', type: 'nasa', layer: 'landsat' },
      { id: 'obj2', text: 'Achieve NDVI >0.75 and EVI >0.55', type: 'nasa', layer: 'multispectral' },
      { id: 'obj3', text: 'Document chlorophyll levels via satellite', type: 'nasa', layer: 'chlorophyll' },
      { id: 'obj4', text: 'Earn premium quality certification', type: 'achievement' }
    ],
    rewards: { xp: 1200, coins: 5000, badge: 'Satellite Expert' },
    advanced: true,
    tips: [
      'Landsat NIR band shows internal plant health',
      'EVI more accurate than NDVI for dense crops',
      'Compare Red Edge vs Red bands for stress detection'
    ]
  },

  {
    id: 'sc12',
    title: '🎓 Teaching the Next Generation',
    story: 'Lily Park wants to learn: "I\'m writing my thesis on precision agriculture. Teach me how to use all NASA data sources to optimize a real farm. I\'ll help with the work!"',
    character: 'LILY_STUDENT',
    difficulty: 'intermediate',
    location: { lat: 23.8103, lon: 90.4125 },
    duration: '30 days',
    nasaData: {
      smap: { target: 0.30, range: [0.25, 0.35] },
      rainfall: { target: 230, range: [200, 260] },
      temperature: { target: 28, range: [25, 31] },
      ndvi: { target: 0.68, range: [0.60, 0.75] }
    },
    objectives: [
      { id: 'obj1', text: 'Explain SMAP technology to Lily', type: 'teaching' },
      { id: 'obj2', text: 'Show IMERG rainfall integration', type: 'teaching' },
      { id: 'obj3', text: 'Demonstrate MODIS crop monitoring', type: 'teaching' },
      { id: 'obj4', text: 'Complete Lily\'s thesis dataset', type: 'achievement' }
    ],
    rewards: { xp: 600, coins: 1000, badge: 'Master Teacher' },
    educational: true,
    tips: [
      'Lily takes notes - explain WHY not just HOW',
      'Show her real data patterns, not perfect examples',
      'Her thesis = your documentation for other farmers'
    ]
  }
];

/**
 * Get scenario by ID
 */
export const getScenarioById = (id) => {
  return STORY_SCENARIOS.find(s => s.id === id);
};

/**
 * Get scenarios by difficulty
 */
export const getScenariosByDifficulty = (difficulty) => {
  return STORY_SCENARIOS.filter(s => s.difficulty === difficulty);
};

/**
 * Get crisis scenarios
 */
export const getCrisisScenarios = () => {
  return STORY_SCENARIOS.filter(s => s.crisis === true);
};
