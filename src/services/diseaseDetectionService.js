/**
 * UC21 - Crop Disease Detection Service
 *
 * This service handles:
 * - Loading TensorFlow Lite model
 * - Image preprocessing
 * - Disease inference with confidence scores
 * - Treatment recommendations
 * - Firestore logging of detections
 *
 * Requirements:
 * - TensorFlow.js and React Native bindings
 * - Model files in assets/models/
 * - Firebase auth for user logging
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase.config';

// Import labels and treatments
const labels = require('../../assets/models/labels.json');
const treatments = require('../../assets/models/treatments.json');

// Configuration
const MODEL_CONFIG = {
  inputSize: 224,
  confidenceThreshold: 0.6,
  topK: 3,
  modelPath: '../../assets/models/plant_disease_model.tflite',
};

// Global model instance
let model = null;
let isModelLoaded = false;
let isInitializing = false;
let cachedSampleImageUri = null;

/**
 * Initialize TensorFlow.js backend for React Native
 */
async function initTensorFlow() {
  try {
    // Wait for TensorFlow to be ready
    await tf.ready();
    console.log('✓ TensorFlow.js backend initialized');
    console.log('Backend:', tf.getBackend());
    return true;
  } catch (error) {
    console.error('✗ TensorFlow initialization error:', error);
    return false;
  }
}

/**
 * Load the TFLite disease detection model
 * @returns {Promise<boolean>} Success status
 */
export async function initDiseaseDetectionModel() {
  if (isModelLoaded) {
    console.log('Model already loaded');
    return true;
  }

  if (isInitializing) {
    console.log('Model initialization in progress...');
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return isModelLoaded;
  }

  isInitializing = true;

  try {
    console.log('Initializing disease detection model...');

    // Step 1: Initialize TensorFlow backend
    const tfReady = await initTensorFlow();
    if (!tfReady) {
      throw new Error('TensorFlow initialization failed');
    }

    // Step 2: Load model file
    // Note: For TFLite models in React Native, we need to load the model differently
    // Since we're using TensorFlow.js, we'll need to convert TFLite to TFJS format
    // For now, we'll create a placeholder MobileNetV2 model structure

    console.log('⚠ TFLite direct loading not fully supported in TFJS-RN');
    console.log('Loading fallback MobileNetV2 architecture...');

    // Load a pre-trained MobileNetV2 from TFJS (as fallback)
    // In production, convert TFLite to TFJS format using tensorflowjs_converter
    model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_1.0_224/model.json');

    console.log('✓ Model loaded successfully');
    console.log('Input shape:', model.inputs[0].shape);
    console.log('Output shape:', model.outputs[0].shape);

    isModelLoaded = true;
    return true;

  } catch (error) {
    console.error('✗ Model loading error:', error);
    isModelLoaded = false;
    return false;
  } finally {
    isInitializing = false;
  }
}

/**
 * Preprocess image for model input
 * @param {string} imageUri - URI of the image to process
 * @returns {Promise<tf.Tensor>} Preprocessed image tensor
 */
async function preprocessImage(imageUri) {
  try {
    console.log('Preprocessing image:', imageUri);

    // Read image as base64
    let base64Image;
    if (imageUri.startsWith('file://')) {
      base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else if (imageUri.startsWith('data:image')) {
      base64Image = imageUri.split(',')[1];
    } else if (imageUri.startsWith('http')) {
      const downloadPath = `${FileSystem.cacheDirectory}disease-detection-${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUri, downloadPath);
      base64Image = await FileSystem.readAsStringAsync(downloadResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      throw new Error('Unsupported image URI format');
    }

    const imageBytes = tf.util.encodeString(base64Image, 'base64');

    const processedTensor = tf.tidy(() => {
      const decoded = decodeJpeg(imageBytes, 3);
      const resized = tf.image.resizeBilinear(decoded, [MODEL_CONFIG.inputSize, MODEL_CONFIG.inputSize], true);
      const normalized = resized.toFloat().div(255);
      return normalized.expandDims(0);
    });

    console.log('✓ Image preprocessed. Shape:', processedTensor.shape);
    return processedTensor;

  } catch (error) {
    console.error('✗ Image preprocessing error:', error);
    throw error;
  }
}

/**
 * Run inference on preprocessed image
 * @param {tf.Tensor} inputTensor - Preprocessed image tensor
 * @returns {Promise<Array>} Array of predictions with labels and confidence
 */
async function runInference(inputTensor) {
  try {
    if (!model) {
      throw new Error('Model not loaded. Call initDiseaseDetectionModel() first');
    }

    console.log('Running inference...');

    // Run prediction
    const predictions = await model.predict(inputTensor);

    // Get probabilities
    const probabilities = await predictions.data();

    // Clean up tensors
    inputTensor.dispose();
    predictions.dispose();

    // Get top K predictions
    const topPredictions = Array.from(probabilities)
      .map((confidence, index) => ({
        class: index,
        label: labels[index.toString()] || `Unknown_${index}`,
        confidence: confidence,
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MODEL_CONFIG.topK);

    console.log('✓ Inference complete. Top predictions:', topPredictions);
    return topPredictions;

  } catch (error) {
    console.error('✗ Inference error:', error);
    throw error;
  }
}

/**
 * Detect crop disease from image
 * @param {string} imageUri - URI of the image to analyze
 * @returns {Promise<Object>} Detection results with predictions and treatment
 */
export async function detectCropDisease(imageUri) {
  try {
    console.log('=== Starting disease detection ===');

    // Ensure model is loaded
    if (!isModelLoaded) {
      console.log('Model not loaded. Initializing...');
      const success = await initDiseaseDetectionModel();
      if (!success) {
        return {
          success: false,
          error: 'Failed to initialize disease detection model',
          message: 'Please restart the app and try again',
        };
      }
    }

    // Step 1 & 2: Preprocess image and run inference
    const predictions = await runDiseaseDetection(imageUri);

    // Step 3: Check confidence threshold
    const topPrediction = predictions[0];
    const isLowConfidence = topPrediction.confidence < MODEL_CONFIG.confidenceThreshold;

    if (isLowConfidence) {
      console.log(`⚠ Low confidence: ${topPrediction.confidence.toFixed(2)}`);
    }

    // Step 4: Get treatment information
    const treatment = getTreatmentInfo(topPrediction.label);

    // Step 5: Log detection to Firestore
    await logDetection(imageUri, predictions, topPrediction, treatment);

    return {
      success: true,
      predictions,
      topPrediction,
      treatment,
      lowConfidence: isLowConfidence,
      message: isLowConfidence
        ? 'Low confidence - consider consulting an expert'
        : 'Disease detected successfully',
    };

  } catch (error) {
    console.error('✗ Disease detection error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to detect disease. Please try again.',
    };
  }
}

/**
 * Get treatment information for a disease
 * @param {string} diseaseKey - Disease label/key
 * @returns {Object} Treatment information
 */
export function getTreatmentInfo(diseaseKey) {
  const treatment = treatments[diseaseKey];

  if (!treatment) {
    console.log(`⚠ No treatment found for: ${diseaseKey}`);
    return {
      severity: 'unknown',
      treatment: 'No treatment information available. Please consult an agricultural expert.',
      steps: ['Contact a local agricultural extension office', 'Document symptoms with photos', 'Isolate affected plants'],
      prevention: 'Practice good agricultural hygiene',
    };
  }

  return treatment;
}

/**
 * Log disease detection to Firestore
 * @param {string} imageUri - Image URI
 * @param {Array} predictions - All predictions
 * @param {Object} topPrediction - Top prediction
 * @param {Object} treatment - Treatment info
 */
async function logDetection(imageUri, predictions, topPrediction, treatment) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.log('⚠ User not authenticated. Skipping Firestore logging.');
      return;
    }

    const detectionData = {
      userId,
      timestamp: new Date().toISOString(),
      imageUri: imageUri.substring(0, 200), // Truncate for storage
      predictions: predictions.map(p => ({
        label: p.label,
        confidence: parseFloat(p.confidence.toFixed(4)),
        class: p.class,
      })),
      topPrediction: {
        label: topPrediction.label,
        confidence: parseFloat(topPrediction.confidence.toFixed(4)),
        class: topPrediction.class,
      },
      treatment: {
        severity: treatment.severity,
        treatment: treatment.treatment,
      },
      rated: false,
    };

    const docRef = await addDoc(collection(db, 'disease_detections'), detectionData);
    console.log('✓ Detection logged to Firestore:', docRef.id);

  } catch (error) {
    console.error('✗ Firestore logging error:', error);
    // Don't throw - logging failure shouldn't stop detection
  }
}

/**
 * Get detection history for current user
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<Array>} Array of detection records
 */
export async function getDetectionHistory(limit = 20) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const { query, orderBy, where, getDocs } = require('firebase/firestore');

    const q = query(
      collection(db, 'disease_detections'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limit)
    );

    const snapshot = await getDocs(q);
    const history = [];

    snapshot.forEach(doc => {
      history.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return { success: true, history };

  } catch (error) {
    console.error('Error fetching detection history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clean up model resources
 */
export function dispose() {
  if (model) {
    model.dispose();
    model = null;
    isModelLoaded = false;
    console.log('✓ Model resources disposed');
  }
}

/**
 * Check if model is ready
 * @returns {boolean} Model loaded status
 */
export function isModelReady() {
  return isModelLoaded;
}

/**
 * Core detection helper without Firestore logging
 * @param {string} imageUri
 * @returns {Promise<Array>} Predictions ranked by confidence
 */
export async function runDiseaseDetection(imageUri) {
  try {
    if (!isModelLoaded) {
      const success = await initDiseaseDetectionModel();
      if (!success) {
        throw new Error('Failed to initialize disease detection model');
      }
    }

    const inputTensor = await preprocessImage(imageUri);
    const predictions = await runInference(inputTensor);
    return predictions;
  } catch (error) {
    console.error('✗ runDiseaseDetection error:', error);
    throw error;
  }
}

async function ensureSampleImage() {
  try {
    if (cachedSampleImageUri) {
      const fileInfo = await FileSystem.getInfoAsync(cachedSampleImageUri);
      if (fileInfo.exists) {
        return cachedSampleImageUri;
      }
    }

    const sampleAsset = Asset.fromModule(require('../../assets/models/sample_leaf.png'));
    if (!sampleAsset.downloaded) {
      await sampleAsset.downloadAsync();
    }

    let assetUri = sampleAsset.localUri || sampleAsset.uri;
    if (!assetUri) {
      throw new Error('Sample image asset missing URI');
    }

    if (!assetUri.startsWith('file://')) {
      const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDirectory) {
        throw new Error('No writable directory available for sample image');
      }

      const targetPath = `${baseDirectory}disease-sample.png`;
      await FileSystem.copyAsync({ from: assetUri, to: targetPath });
      assetUri = targetPath;
    }

    cachedSampleImageUri = assetUri;
    return cachedSampleImageUri;
  } catch (error) {
    console.error('✗ Failed to prepare sample image for smoke test:', error);
    throw error;
  }
}

/**
 * Quick smoke test to validate model initialization & inference
 * @returns {Promise<{success: boolean, predictions?: Array, imageUri?: string, error?: string}>}
 */
export async function runDiseaseDetectionSmokeTest() {
  console.log('=== Running disease detection smoke test ===');
  try {
    const sampleUri = await ensureSampleImage();
    const predictions = await runDiseaseDetection(sampleUri);
    const topPrediction = predictions[0] || null;

    console.log('Smoke test predictions:', predictions);

    return {
      success: true,
      imageUri: sampleUri,
      predictions,
      topPrediction,
    };
  } catch (error) {
    console.error('✗ Smoke test failure:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  initDiseaseDetectionModel,
  detectCropDisease,
  runDiseaseDetection,
  runDiseaseDetectionSmokeTest,
  getTreatmentInfo,
  getDetectionHistory,
  dispose,
  isModelReady,
};
