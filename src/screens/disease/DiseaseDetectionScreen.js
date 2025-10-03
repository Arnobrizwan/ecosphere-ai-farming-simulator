/**
 * UC21 - Disease Detection Screen
 *
 * Features:
 * - Camera access for live photo capture
 * - Gallery image selection
 * - Disease detection with AI model
 * - Top 3 predictions with confidence scores
 * - Treatment recommendations with severity badges
 * - User feedback rating
 * - Firestore logging
 * - Low confidence warnings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { auth } from '../../services/firebase.config';
import {
  detectCropDisease,
  isModelReady,
  initDiseaseDetectionModel,
  runDiseaseDetectionSmokeTest,
} from '../../services/diseaseDetectionService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.config';

const DiseaseDetectionScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [rating, setRating] = useState(null);
  const [smokeTestReport, setSmokeTestReport] = useState({ status: 'idle' });
  const smokeStatus = smokeTestReport.status || 'idle';
  const smokeThemeStyle =
    smokeStatus === 'success'
      ? styles.smokeTestSuccess
      : smokeStatus === 'error'
      ? styles.smokeTestError
      : smokeStatus === 'idle'
      ? styles.smokeTestIdle
      : styles.smokeTestRunning;

  useEffect(() => {
    requestPermissions();
    checkModelStatus();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      setHasPermission(cameraStatus === 'granted' && galleryStatus === 'granted');

      if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library access are required for disease detection.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

  const checkModelStatus = async () => {
    try {
      if (isModelReady()) {
        setModelLoaded(true);
      } else {
        // Try to initialize
        const success = await initDiseaseDetectionModel();
        setModelLoaded(success);
      }
    } catch (error) {
      console.error('Model check error:', error);
      setModelLoaded(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    if (!modelLoaded || smokeStatus !== 'idle') {
      return () => {
        isCancelled = true;
      };
    }

    const runSmokeTest = async () => {
      setSmokeTestReport({ status: 'running' });

      try {
        const result = await runDiseaseDetectionSmokeTest();
        if (isCancelled) return;

        if (result.success) {
          setSmokeTestReport({
            status: 'success',
            predictions: result.predictions,
            topPrediction: result.topPrediction,
            imageUri: result.imageUri,
            completedAt: new Date().toISOString(),
          });
        } else {
          setSmokeTestReport({
            status: 'error',
            error: result.error || 'Unknown error during smoke test',
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setSmokeTestReport({
            status: 'error',
            error: error.message,
          });
        }
      }
    };

    runSmokeTest();

    return () => {
      isCancelled = true;
    };
  }, [modelLoaded, smokeStatus]);

  const handleSmokeTestRetry = () => {
    setSmokeTestReport((prev) => (prev.status === 'running' ? prev : { status: 'idle' }));
  };

  const handleTakePhoto = async () => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera access is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setDetectionResult(null);
        setRating(null);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Photo library access is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setDetectionResult(null);
        setRating(null);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const handleDetectDisease = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select or capture an image first');
      return;
    }

    if (!modelLoaded) {
      Alert.alert('Model Not Ready', 'AI model is still loading. Please wait...');
      return;
    }

    setIsDetecting(true);
    setDetectionResult(null);

    try {
      const result = await detectCropDisease(selectedImage);

      if (result.success) {
        setDetectionResult(result);

        // Show low confidence warning (UC21 Alternate A1)
        if (result.lowConfidence) {
          Alert.alert(
            'Low Confidence Detection',
            `The model is ${(result.topPrediction.confidence * 100).toFixed(1)}% confident about this diagnosis. Consider consulting an agricultural expert for confirmation.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Detection Failed', result.message || 'Please try again');
      }
    } catch (error) {
      console.error('Detection error:', error);
      Alert.alert('Error', 'Failed to detect disease. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleRating = async (helpful) => {
    setRating(helpful);

    // Update rating in Firestore
    try {
      const userId = auth.currentUser?.uid;
      if (userId && detectionResult) {
        // Note: We'd need the detection document ID to update it
        // For now, just update local state
        console.log('Rating submitted:', helpful);
      }
    } catch (error) {
      console.error('Rating error:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#D32F2F';
      case 'medium':
        return '#F57C00';
      case 'low':
        return '#FBC02D';
      case 'none':
        return '#388E3C';
      default:
        return '#757575';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'high':
        return '🔴 High Severity';
      case 'medium':
        return '🟠 Medium Severity';
      case 'low':
        return '🟡 Low Severity';
      case 'none':
        return '🟢 Healthy';
      default:
        return '⚪ Unknown';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disease Detection</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.smokeTestBanner, smokeThemeStyle]}>
        <Text style={styles.smokeTestTitle}>Model Self-Test</Text>

        {smokeStatus === 'running' && (
          <View style={styles.smokeTestRow}>
            <ActivityIndicator size="small" color={COLORS.pureWhite} />
            <Text style={[styles.smokeTestText, styles.smokeTestRowText]}>
              Verifying inference pipeline…
            </Text>
          </View>
        )}

        {smokeStatus === 'success' && (
          <View style={styles.smokeTestResultBlock}>
            <Text style={styles.smokeTestText}>Ready for on-device detection.</Text>
            {smokeTestReport.topPrediction && (
              <Text style={styles.smokeTestDetailText}>
                {`${smokeTestReport.topPrediction.label.replace(/_/g, ' ')} • ${(smokeTestReport.topPrediction.confidence * 100).toFixed(1)}%`}
              </Text>
            )}
          </View>
        )}

        {smokeStatus === 'error' && (
          <View style={styles.smokeTestResultBlock}>
            <Text style={styles.smokeTestText}>
              Smoke test failed: {smokeTestReport.error || 'Unknown error'}.
            </Text>
            <TouchableOpacity style={styles.smokeTestRetry} onPress={handleSmokeTestRetry}>
              <Text style={styles.smokeTestRetryText}>Retry Self-Test</Text>
            </TouchableOpacity>
          </View>
        )}

        {smokeStatus === 'idle' && (
          <Text style={styles.smokeTestText}>
            Preparing smoke test as soon as the model is ready…
          </Text>
        )}
      </View>

      {/* Model Status */}
      {!modelLoaded && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>⚠️ AI model is loading...</Text>
          <ActivityIndicator size="small" color={COLORS.primaryGreen} />
        </View>
      )}

      {/* Image Selection Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cameraButton]}
          onPress={handleTakePhoto}
        >
          <Text style={styles.actionButtonIcon}>📷</Text>
          <Text style={styles.actionButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.galleryButton]}
          onPress={handleSelectFromGallery}
        >
          <Text style={styles.actionButtonIcon}>🖼️</Text>
          <Text style={styles.actionButtonText}>Select Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewCard}>
          <Text style={styles.sectionTitle}>Selected Image</Text>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity
            style={[
              styles.detectButton,
              (!modelLoaded || isDetecting) && styles.detectButtonDisabled,
            ]}
            onPress={handleDetectDisease}
            disabled={!modelLoaded || isDetecting}
          >
            {isDetecting ? (
              <>
                <ActivityIndicator size="small" color={COLORS.pureWhite} />
                <Text style={styles.detectButtonText}>  Analyzing...</Text>
              </>
            ) : (
              <Text style={styles.detectButtonText}>🔍 Detect Disease</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Detection Results */}
      {detectionResult && detectionResult.success && (
        <View style={styles.resultsContainer}>
          {/* Top Prediction */}
          <View style={styles.topPredictionCard}>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <Text style={styles.diseaseName}>
              {detectionResult.topPrediction.label.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.confidence}>
              Confidence: {(detectionResult.topPrediction.confidence * 100).toFixed(1)}%
            </Text>

            {/* Severity Badge */}
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(detectionResult.treatment.severity) },
              ]}
            >
              <Text style={styles.severityText}>
                {getSeverityLabel(detectionResult.treatment.severity)}
              </Text>
            </View>
          </View>

          {/* Other Predictions */}
          {detectionResult.predictions.length > 1 && (
            <View style={styles.otherPredictionsCard}>
              <Text style={styles.sectionTitle}>Other Possibilities</Text>
              {detectionResult.predictions.slice(1).map((pred, index) => (
                <View key={index} style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>
                    {pred.label.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.predictionConfidence}>
                    {(pred.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Treatment Recommendations */}
          <View style={styles.treatmentCard}>
            <Text style={styles.sectionTitle}>Treatment Recommendations</Text>
            <Text style={styles.treatmentDescription}>
              {detectionResult.treatment.treatment}
            </Text>

            <Text style={styles.stepsTitle}>Steps:</Text>
            {detectionResult.treatment.steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            <Text style={styles.preventionTitle}>Prevention:</Text>
            <Text style={styles.preventionText}>{detectionResult.treatment.prevention}</Text>
          </View>

          {/* Feedback */}
          <View style={styles.feedbackCard}>
            <Text style={styles.sectionTitle}>Was this helpful?</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  rating === true && styles.feedbackButtonActive,
                ]}
                onPress={() => handleRating(true)}
              >
                <Text style={styles.feedbackButtonText}>👍 Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  rating === false && styles.feedbackButtonActive,
                ]}
                onPress={() => handleRating(false)}
              >
                <Text style={styles.feedbackButtonText}>👎 No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Instructions (when no image selected) */}
      {!selectedImage && (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to Use</Text>
          <Text style={styles.instructionsText}>
            1. Take a photo or select one from your gallery{'\n'}
            2. Ensure the affected leaf or plant part is clearly visible{'\n'}
            3. Tap "Detect Disease" to analyze{'\n'}
            4. Review the diagnosis and treatment recommendations{'\n'}
            5. Rate the result to help improve accuracy
          </Text>
          <Text style={styles.instructionsNote}>
            💡 Tip: Use well-lit photos with the affected area in focus for best results
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.pureWhite,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.primaryGreen,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  placeholder: {
    width: 40,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3CD',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    flex: 1,
  },
  smokeTestBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  smokeTestRunning: {
    backgroundColor: '#1D4ED8',
  },
  smokeTestSuccess: {
    backgroundColor: '#166534',
  },
  smokeTestError: {
    backgroundColor: '#B91C1C',
  },
  smokeTestIdle: {
    backgroundColor: '#374151',
  },
  smokeTestTitle: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  smokeTestText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    lineHeight: 16,
  },
  smokeTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smokeTestRowText: {
    marginLeft: 8,
  },
  smokeTestResultBlock: {
    marginTop: 4,
  },
  smokeTestDetailText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  smokeTestRetry: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignSelf: 'flex-start',
  },
  smokeTestRetryText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cameraButton: {
    backgroundColor: COLORS.primaryGreen,
  },
  galleryButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  detectButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryGreen,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectButtonDisabled: {
    backgroundColor: '#CCC',
  },
  detectButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginTop: 16,
  },
  topPredictionCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
  },
  confidence: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  severityBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  severityText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  otherPredictionsCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  predictionLabel: {
    fontSize: 14,
    color: COLORS.deepBlack,
    flex: 1,
  },
  predictionConfidence: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  treatmentCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  treatmentDescription: {
    fontSize: 15,
    color: COLORS.deepBlack,
    marginBottom: 16,
    lineHeight: 22,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginRight: 8,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    flex: 1,
    lineHeight: 20,
  },
  preventionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginTop: 16,
    marginBottom: 8,
  },
  preventionText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    lineHeight: 20,
  },
  feedbackCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  feedbackButtonActive: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: '#E8F5E9',
  },
  feedbackButtonText: {
    fontSize: 16,
  },
  instructionsCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    lineHeight: 22,
    marginBottom: 12,
  },
  instructionsNote: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
});

export default DiseaseDetectionScreen;
