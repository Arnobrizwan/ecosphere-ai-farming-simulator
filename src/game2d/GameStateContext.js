import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { Dimensions } from 'react-native';

const WEATHER_SEQUENCE = ['Sunny', 'Partly Cloudy', 'Overcast', 'Rain'];
export const CROP_TYPES = ['wheat', 'corn', 'soy'];

function shouldStartExpanded() {
  return Dimensions.get('window').width >= 520;
}

const GameStateContext = createContext(undefined);

const initialState = {
  activeScene: 'Dashboard',
  overlayExpanded: shouldStartExpanded(),
  tick: 0,
  resources: {
    water: 68,
    soilHealth: 82,
    energy: 74,
    credits: 1450,
    research: 18,
  },
  inventory: {
    wheat: 0,
    corn: 0,
    soy: 0,
  },
  market: {
    wheat: 12,
    corn: 9,
    soy: 15,
    lastAdjustedTick: 0,
  },
  weather: {
    condition: 'Sunny',
    temperature: 27,
    humidity: 42,
    rainfallChance: 10,
  },
  fields: Array.from({ length: 6 }).map((_, index) => ({
    id: index,
    status: 'fallow',
    crop: null,
    growth: 0,
    soilMoisture: 55 + Math.round(Math.random() * 10),
    lastWorkedAt: Date.now(),
  })),
  campaign: {
    activeMissionId: null,
    completedMissions: [],
    unlockedMissions: ['m1_1'],
  },
  tutorial: {
    crop: {
      introAcknowledged: false,
      tilled: false,
      planted: false,
      watered: false,
      harvested: false,
      sold: false,
    },
  },
  lastAutomationMessage: null,
  completedTasks: {},
  alerts: [],
  sceneStats: {},
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value));
}

function growthProfile(condition) {
  switch (condition) {
    case 'Rain':
      return { growth: 12, moistureDelta: 7 };
    case 'Overcast':
      return { growth: 9, moistureDelta: 4 };
    case 'Partly Cloudy':
      return { growth: 7, moistureDelta: 2 };
    default:
      return { growth: 5, moistureDelta: -2 };
  }
}

function updateWeather(currentWeather, tick) {
  if (tick % 6 !== 0) {
    return currentWeather;
  }
  const nextIndex = (WEATHER_SEQUENCE.indexOf(currentWeather.condition) + 1) % WEATHER_SEQUENCE.length;
  const condition = WEATHER_SEQUENCE[nextIndex];
  return {
    condition,
    temperature: 23 + Math.round(Math.random() * 8),
    humidity: clampPercentage(35 + Math.round(Math.random() * 35)),
    rainfallChance:
      condition === 'Rain'
        ? 80
        : condition === 'Overcast'
        ? 45
        : condition === 'Partly Cloudy'
        ? 25
        : 10,
  };
}

function adjustMarket(market, tick) {
  if (tick - market.lastAdjustedTick < 4) {
    return market;
  }
  const updated = { ...market, lastAdjustedTick: tick };
  CROP_TYPES.forEach((crop) => {
    const volatility = crop === 'soy' ? 3 : crop === 'wheat' ? 2 : 2.5;
    const delta = Math.random() * volatility - volatility / 2;
    updated[crop] = Math.max(4, Math.round((updated[crop] + delta) * 10) / 10);
  });
  return updated;
}

function markTutorial(state, updates) {
  return {
    ...state.tutorial,
    crop: {
      ...state.tutorial.crop,
      ...updates,
    },
  };
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_SCENE': {
      const scene = action.payload?.scene;
      if (!scene) {
        return state;
      }
      const nextSceneStats = { ...state.sceneStats };
      const previousStats = nextSceneStats[scene] || { visits: 0 };
      nextSceneStats[scene] = {
        visits: (previousStats.visits || 0) + 1,
        lastVisitedAt: new Date().toISOString(),
      };
      const shouldAutoExpand = previousStats.visits ? state.overlayExpanded : true;
      return {
        ...state,
        activeScene: scene,
        overlayExpanded: shouldAutoExpand,
        sceneStats: nextSceneStats,
      };
    }
    case 'TOGGLE_OVERLAY': {
      return {
        ...state,
        overlayExpanded: !state.overlayExpanded,
      };
    }
    case 'SET_OVERLAY_VISIBILITY': {
      const expanded = action.payload?.expanded;
      if (typeof expanded !== 'boolean' || state.overlayExpanded === expanded) {
        return state;
      }
      return {
        ...state,
        overlayExpanded: expanded,
      };
    }
    case 'MARK_TASK_COMPLETE': {
      const scene = action.payload?.scene;
      const taskId = action.payload?.taskId;
      if (!scene || !taskId) {
        return state;
      }
      const existing = state.completedTasks[scene] || [];
      if (existing.includes(taskId)) {
        return state;
      }
      return {
        ...state,
        completedTasks: {
          ...state.completedTasks,
          [scene]: [...existing, taskId],
        },
      };
    }
    case 'ADVANCE_TICK': {
      const tick = state.tick + 1;
      const weather = updateWeather(state.weather, tick);
      const growth = growthProfile(weather.condition);
      const nextResources = {
        water: clampPercentage(state.resources.water + randomBetween(-2.4, 3.2)),
        soilHealth: clampPercentage(state.resources.soilHealth + randomBetween(-1.2, 2.3)),
        energy: clampPercentage(state.resources.energy + randomBetween(-3.5, 4.0)),
        credits: Math.max(0, Math.round((state.resources.credits + randomBetween(-12, 16)) * 100) / 100),
        research: clampPercentage(state.resources.research + randomBetween(-1.1, 2.5)),
      };
      const fields = state.fields.map((field) => {
        if (field.status === 'growing') {
          const moisture = clampPercentage(field.soilMoisture + growth.moistureDelta - 2);
          const growthGain = growth.growth + (moisture < 35 ? -3 : 0);
          const nextGrowth = clampPercentage(field.growth + Math.max(0, growthGain));
          if (nextGrowth >= 100) {
            return {
              ...field,
              status: 'ready',
              growth: 100,
              soilMoisture: moisture,
            };
          }
          return {
            ...field,
            growth: nextGrowth,
            soilMoisture: moisture,
          };
        }
        if (field.status === 'fallow') {
          return {
            ...field,
            soilMoisture: clampPercentage(field.soilMoisture + growth.moistureDelta / 3),
          };
        }
        if (field.status === 'tilled') {
          return {
            ...field,
            soilMoisture: clampPercentage(field.soilMoisture + growth.moistureDelta / 2),
          };
        }
        return field;
      });
      return {
        ...state,
        tick,
        resources: nextResources,
        weather,
        fields,
        market: adjustMarket(state.market, tick),
      };
    }
    case 'QUEUE_ALERT': {
      if (!action.payload) {
        return state;
      }
      const nextAlerts = [...state.alerts, { id: `${Date.now()}-${state.alerts.length}`, ...action.payload }];
      if (nextAlerts.length > 8) {
        nextAlerts.shift();
      }
      return {
        ...state,
        alerts: nextAlerts,
      };
    }
    case 'TILL_FIELD': {
      const { fieldId } = action.payload || {};
      if (typeof fieldId !== 'number') {
        return state;
      }
      let didTill = false;
      const fields = state.fields.map((field) => {
        if (field.id !== fieldId || field.status !== 'fallow') {
          return field;
        }
        didTill = true;
        return {
          ...field,
          status: 'tilled',
          soilMoisture: clampPercentage(field.soilMoisture - 4),
          lastWorkedAt: Date.now(),
        };
      });
      if (!didTill) {
        return state;
      }
      return {
        ...state,
        fields,
        tutorial: markTutorial(state, { tilled: true }),
      };
    }
    case 'PLANT_FIELD': {
      const { fieldId, cropType } = action.payload || {};
      if (typeof fieldId !== 'number' || !CROP_TYPES.includes(cropType)) {
        return state;
      }
      let didPlant = false;
      const fields = state.fields.map((field) => {
        if (field.id !== fieldId || field.status !== 'tilled') {
          return field;
        }
        didPlant = true;
        return {
          ...field,
          status: 'growing',
          crop: cropType,
          growth: 5,
          soilMoisture: clampPercentage(field.soilMoisture - 6 + Math.round(Math.random() * 6)),
          lastWorkedAt: Date.now(),
        };
      });
      if (!didPlant) {
        return state;
      }
      return {
        ...state,
        fields,
        tutorial: markTutorial(state, { planted: true }),
      };
    }
    case 'WATER_FIELD': {
      const { fieldId } = action.payload || {};
      if (typeof fieldId !== 'number') {
        return state;
      }
      let didWater = false;
      const fields = state.fields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        didWater = true;
        return {
          ...field,
          soilMoisture: clampPercentage(field.soilMoisture + 18),
          lastWorkedAt: Date.now(),
        };
      });
      if (!didWater) {
        return state;
      }
      return {
        ...state,
        fields,
        tutorial: markTutorial(state, { watered: true }),
      };
    }
    case 'HARVEST_FIELD': {
      const { fieldId } = action.payload || {};
      if (typeof fieldId !== 'number') {
        return state;
      }
      let harvestedCrop = null;
      const fields = state.fields.map((field) => {
        if (field.id !== fieldId || field.status !== 'ready') {
          return field;
        }
        harvestedCrop = field.crop;
        return {
          ...field,
          status: 'fallow',
          crop: null,
          growth: 0,
          soilMoisture: clampPercentage(field.soilMoisture - 8),
          lastWorkedAt: Date.now(),
        };
      });
      if (!harvestedCrop) {
        return state;
      }
      const yieldAmount = 12 + Math.round(Math.random() * 8);
      return {
        ...state,
        fields,
        inventory: {
          ...state.inventory,
          [harvestedCrop]: (state.inventory[harvestedCrop] || 0) + yieldAmount,
        },
        tutorial: markTutorial(state, { harvested: true }),
      };
    }
    case 'SELL_PRODUCE': {
      const { cropType, amount } = action.payload || {};
      if (!CROP_TYPES.includes(cropType)) {
        return state;
      }
      const available = state.inventory[cropType] || 0;
      const sellAmount = Math.min(amount > 0 ? amount : available, available);
      if (sellAmount <= 0) {
        return state;
      }
      const price = state.market[cropType] || 0;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [cropType]: available - sellAmount,
        },
        resources: {
          ...state.resources,
          credits: Math.round((state.resources.credits + price * sellAmount) * 100) / 100,
        },
        tutorial: markTutorial(state, { sold: true }),
      };
    }
    case 'RESET_FIELD': {
      const { fieldId } = action.payload || {};
      if (typeof fieldId !== 'number') {
        return state;
      }
      const fields = state.fields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        return {
          ...field,
          status: 'fallow',
          crop: null,
          growth: 0,
          soilMoisture: clampPercentage(field.soilMoisture - 3),
          lastWorkedAt: Date.now(),
        };
      });
      return { ...state, fields };
    }
    case 'START_CAMPAIGN_MISSION': {
      const { missionId } = action.payload || {};
      if (!missionId) {
        return state;
      }
      return {
        ...state,
        campaign: {
          ...state.campaign,
          activeMissionId: missionId,
          unlockedMissions: Array.from(new Set([...state.campaign.unlockedMissions, missionId])),
        },
      };
    }
    case 'COMPLETE_CAMPAIGN_MISSION': {
      const { missionId, nextMissionId } = action.payload || {};
      if (!missionId) {
        return state;
      }
      const completed = state.campaign.completedMissions.includes(missionId)
        ? state.campaign.completedMissions
        : [...state.campaign.completedMissions, missionId];
      const unlocked = nextMissionId
        ? Array.from(new Set([...state.campaign.unlockedMissions, nextMissionId]))
        : state.campaign.unlockedMissions;
      return {
        ...state,
        campaign: {
          ...state.campaign,
          activeMissionId: null,
          completedMissions: completed,
          unlockedMissions: unlocked,
        },
      };
    }
    case 'ABORT_CAMPAIGN_MISSION': {
      if (!state.campaign.activeMissionId) {
        return state;
      }
      return {
        ...state,
        campaign: {
          ...state.campaign,
          activeMissionId: null,
        },
      };
    }
    case 'MARK_TUTORIAL_FLAG': {
      const { key, value } = action.payload || {};
      if (!(key in state.tutorial.crop)) {
        return state;
      }
      return {
        ...state,
        tutorial: markTutorial(state, { [key]: value ?? true }),
      };
    }
    case 'AUTO_PROGRESS_CROP': {
      const marketOrder = [...CROP_TYPES].sort((a, b) => (state.market[b] || 0) - (state.market[a] || 0));

      const fallowField = state.fields.find((field) => field.status === 'fallow');
      if (fallowField) {
        const fields = state.fields.map((field) => {
          if (field.id !== fallowField.id) {
            return field;
          }
          return {
            ...field,
            status: 'tilled',
            soilMoisture: clampPercentage(field.soilMoisture - 4),
            lastWorkedAt: Date.now(),
          };
        });
        return {
          ...state,
          fields,
          tutorial: markTutorial(state, { tilled: true }),
          lastAutomationMessage: `Auto-tilled plot ${fallowField.id + 1}.`,
        };
      }

      const tilledField = state.fields.find((field) => field.status === 'tilled');
      if (tilledField) {
        const bestCrop = marketOrder[0];
        const fields = state.fields.map((field) => {
          if (field.id !== tilledField.id) {
            return field;
          }
          return {
            ...field,
            status: 'growing',
            crop: bestCrop,
            growth: 5,
            soilMoisture: clampPercentage(field.soilMoisture - 5 + Math.round(Math.random() * 5)),
            lastWorkedAt: Date.now(),
          };
        });
        return {
          ...state,
          fields,
          tutorial: markTutorial(state, { planted: true }),
          lastAutomationMessage: `Auto-planted ${bestCrop.toUpperCase()} on plot ${tilledField.id + 1}.`,
        };
      }

      const dryField = state.fields.find((field) => field.status === 'growing' && field.soilMoisture < 55);
      if (dryField) {
        const fields = state.fields.map((field) => {
          if (field.id !== dryField.id) {
            return field;
          }
          return {
            ...field,
            soilMoisture: clampPercentage(field.soilMoisture + 18),
            lastWorkedAt: Date.now(),
          };
        });
        return {
          ...state,
          fields,
          tutorial: markTutorial(state, { watered: true }),
          lastAutomationMessage: `Auto-watered plot ${dryField.id + 1} to stabilise moisture.`,
        };
      }

      const readyField = state.fields.find((field) => field.status === 'ready');
      if (readyField) {
        const fields = state.fields.map((field) => {
          if (field.id !== readyField.id) {
            return field;
          }
          return {
            ...field,
            status: 'fallow',
            crop: null,
            growth: 0,
            soilMoisture: clampPercentage(field.soilMoisture - 8),
            lastWorkedAt: Date.now(),
          };
        });
        const yieldAmount = 12 + Math.round(Math.random() * 8);
        const crop = readyField.crop || marketOrder[0];
        return {
          ...state,
          fields,
          inventory: {
            ...state.inventory,
            [crop]: (state.inventory[crop] || 0) + yieldAmount,
          },
          tutorial: markTutorial(state, { harvested: true }),
          lastAutomationMessage: `Auto-harvested plot ${readyField.id + 1} for ${yieldAmount} units of ${crop}.`,
        };
      }

      const bestCropWithInventory = marketOrder.find((crop) => (state.inventory[crop] || 0) > 0);
      if (bestCropWithInventory) {
        const quantity = state.inventory[bestCropWithInventory];
        const price = state.market[bestCropWithInventory] || 0;
        return {
          ...state,
          inventory: {
            ...state.inventory,
            [bestCropWithInventory]: 0,
          },
          resources: {
            ...state.resources,
            credits: Math.round((state.resources.credits + price * quantity) * 100) / 100,
          },
          tutorial: markTutorial(state, { sold: true }),
          lastAutomationMessage: `Auto-sold ${quantity} units of ${bestCropWithInventory} at ₹${price}/unit.`,
        };
      }

      return {
        ...state,
        lastAutomationMessage: 'All crop loops are current. No automation needed.',
      };
    }
    default:
      return state;
  }
}

export function GameStateProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'ADVANCE_TICK' });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleDimensionChange = ({ window }) => {
      if (!window) {
        return;
      }
      if (window.width < 420) {
        dispatch({ type: 'SET_OVERLAY_VISIBILITY', payload: { expanded: false } });
      } else if (window.width >= 520) {
        dispatch({ type: 'SET_OVERLAY_VISIBILITY', payload: { expanded: true } });
      }
    };
    const subscription = Dimensions.addEventListener('change', handleDimensionChange);
    return () => {
      if (typeof subscription?.remove === 'function') {
        subscription.remove();
      } else {
        Dimensions.removeEventListener?.('change', handleDimensionChange);
      }
    };
  }, []);

  const setActiveScene = useCallback((scene) => {
    if (!scene) {
      return;
    }
    dispatch({ type: 'SET_SCENE', payload: { scene } });
  }, []);

  const toggleOverlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_OVERLAY' });
  }, []);

  const markTaskComplete = useCallback((scene, taskId) => {
    if (!scene || !taskId) {
      return;
    }
    dispatch({ type: 'MARK_TASK_COMPLETE', payload: { scene, taskId } });
  }, []);

  const pushAlert = useCallback((alert) => {
    if (!alert) {
      return;
    }
    dispatch({ type: 'QUEUE_ALERT', payload: alert });
  }, []);

  const tillField = useCallback((fieldId) => {
    dispatch({ type: 'TILL_FIELD', payload: { fieldId } });
  }, []);

  const plantField = useCallback((fieldId, cropType) => {
    dispatch({ type: 'PLANT_FIELD', payload: { fieldId, cropType } });
  }, []);

  const waterField = useCallback((fieldId) => {
    dispatch({ type: 'WATER_FIELD', payload: { fieldId } });
  }, []);

  const harvestField = useCallback((fieldId) => {
    dispatch({ type: 'HARVEST_FIELD', payload: { fieldId } });
  }, []);

  const sellProduce = useCallback((cropType, amount) => {
    dispatch({ type: 'SELL_PRODUCE', payload: { cropType, amount } });
  }, []);

  const resetField = useCallback((fieldId) => {
    dispatch({ type: 'RESET_FIELD', payload: { fieldId } });
  }, []);

  const startCampaignMission = useCallback((missionId) => {
    dispatch({ type: 'START_CAMPAIGN_MISSION', payload: { missionId } });
  }, []);

  const completeCampaignMission = useCallback((missionId, nextMissionId = null) => {
    dispatch({ type: 'COMPLETE_CAMPAIGN_MISSION', payload: { missionId, nextMissionId } });
  }, []);

  const abortCampaignMission = useCallback(() => {
    dispatch({ type: 'ABORT_CAMPAIGN_MISSION' });
  }, []);

  const acknowledgeCropTutorial = useCallback((key, value = true) => {
    dispatch({ type: 'MARK_TUTORIAL_FLAG', payload: { key, value } });
  }, []);

  const autoProgressCrop = useCallback(() => {
    dispatch({ type: 'AUTO_PROGRESS_CROP' });
  }, []);

  const value = useMemo(
    () => ({
      state,
      setActiveScene,
      toggleOverlay,
      markTaskComplete,
      pushAlert,
      tillField,
      plantField,
      waterField,
      harvestField,
      sellProduce,
      resetField,
      acknowledgeCropTutorial,
      autoProgressCrop,
      startCampaignMission,
      completeCampaignMission,
      abortCampaignMission,
    }),
    [
      state,
      setActiveScene,
      toggleOverlay,
      markTaskComplete,
      pushAlert,
      tillField,
      plantField,
      waterField,
      harvestField,
      sellProduce,
      resetField,
      acknowledgeCropTutorial,
      autoProgressCrop,
      startCampaignMission,
      completeCampaignMission,
      abortCampaignMission,
    ],
  );

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}

export default GameStateContext;
