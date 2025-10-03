/**
 * Model Loader Utility
 *
 * Handles centralized model initialization on app startup with:
 * - Loading progress tracking
 * - Retry logic for failures
 * - Error handling and user feedback
 * - Background initialization
 */

import { initDiseaseDetectionModel, isModelReady } from '../services/diseaseDetectionService';

// Model loading state
let isLoading = false;
let loadError = null;
let loadAttempts = 0;

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Initialize all AI models on app startup
 * @param {Function} onProgress - Callback for progress updates (0-100)
 * @param {Function} onComplete - Callback when loading completes
 * @param {Function} onError - Callback if loading fails
 * @returns {Promise<boolean>} Success status
 */
export async function initializeModels(onProgress, onComplete, onError) {
  if (isModelReady()) {
    console.log('Models already loaded');
    if (onProgress) onProgress(100);
    if (onComplete) onComplete(true);
    return true;
  }

  if (isLoading) {
    console.log('Model initialization already in progress');
    return false;
  }

  isLoading = true;
  loadError = null;

  try {
    console.log('Starting model initialization...');
    if (onProgress) onProgress(10);

    // Initialize disease detection model
    const success = await loadDiseaseDetectionModelWithRetry(onProgress);

    if (success) {
      console.log('✓ All models initialized successfully');
      if (onProgress) onProgress(100);
      if (onComplete) onComplete(true);
      return true;
    } else {
      throw new Error('Failed to load disease detection model');
    }
  } catch (error) {
    console.error('✗ Model initialization failed:', error);
    loadError = error.message;

    if (onError) {
      onError(error);
    }

    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Load disease detection model with retry logic
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<boolean>} Success status
 */
async function loadDiseaseDetectionModelWithRetry(onProgress) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Disease detection model load attempt ${attempt}/${MAX_RETRIES}`);

      if (onProgress) {
        const progress = 10 + (attempt / MAX_RETRIES) * 80; // 10-90%
        onProgress(progress);
      }

      const success = await initDiseaseDetectionModel();

      if (success) {
        loadAttempts = attempt;
        return true;
      }

      // Wait before retry
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  return false;
}

/**
 * Check if models are currently loading
 * @returns {boolean} Loading status
 */
export function isLoadingModels() {
  return isLoading;
}

/**
 * Get the last error that occurred during loading
 * @returns {string|null} Error message
 */
export function getLoadError() {
  return loadError;
}

/**
 * Get number of load attempts made
 * @returns {number} Attempt count
 */
export function getLoadAttempts() {
  return loadAttempts;
}

/**
 * Preload models in background on app startup
 * This should be called from App.js or root component
 */
export async function preloadModelsOnStartup() {
  console.log('=== Preloading AI models on startup ===');

  return initializeModels(
    (progress) => {
      console.log(`Model loading progress: ${progress.toFixed(0)}%`);
    },
    (success) => {
      if (success) {
        console.log('✓ Background model loading complete');
      } else {
        console.log('✗ Background model loading failed');
      }
    },
    (error) => {
      console.error('Background model loading error:', error);
    }
  );
}

/**
 * Force reload models (useful for debugging or after errors)
 * @returns {Promise<boolean>} Success status
 */
export async function reloadModels() {
  console.log('Force reloading models...');
  isLoading = false;
  loadError = null;
  loadAttempts = 0;

  return initializeModels(
    (progress) => console.log(`Reload progress: ${progress}%`),
    (success) => console.log(`Reload ${success ? 'succeeded' : 'failed'}`),
    (error) => console.error('Reload error:', error)
  );
}

export default {
  initializeModels,
  isLoadingModels,
  getLoadError,
  getLoadAttempts,
  preloadModelsOnStartup,
  reloadModels,
};
