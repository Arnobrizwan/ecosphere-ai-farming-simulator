import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.config';
import { storage } from '../../utils/storage';
import { locationService } from '../../services/location.service';

const { width, height } = Dimensions.get('window');

const BANGLADESH_CENTER = {
  latitude: 23.8103,
  longitude: 90.4125,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

const LOCATION_TYPES = [
  { id: 'point', label: 'Point', icon: '📍', description: 'Single location' },
  { id: 'area', label: 'Area', icon: '🗺️', description: 'Farm boundary' },
  { id: 'multiple', label: 'Multiple', icon: '📌', description: 'Multiple plots' },
  { id: 'manual', label: 'Manual', icon: '✍️', description: 'Enter coordinates' }
];

export default function LocationSelectionScreen({ navigation }) {
  const mapRef = useRef(null);
  const [userId, setUserId] = useState('');
  
  // Map state
  const [region, setRegion] = useState(BANGLADESH_CENTER);
  const [mapType, setMapType] = useState('standard'); // 'standard' or 'satellite'
  
  // Location state
  const [locationType, setLocationType] = useState('point');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState(0);
  const [loading, setLoading] = useState(false);

  // Manual entry state
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Permissions
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  useEffect(() => {
    loadUserData();
    requestLocationPermission();
    loadCachedLocation();
  }, []);

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const userLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(userLocation);
      
      // Center map on user location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...userLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get current location');
    }
  };

  const loadCachedLocation = async () => {
    const cached = await storage.get('lastLocation');
    if (cached) {
      setRegion(cached);
    }
  };

  const cacheLocation = async (location) => {
    await storage.save('lastLocation', location);
  };

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent.coordinate;
    
    if (locationType === 'point') {
      setSelectedPoint(coordinate);
      setShowBottomSheet(true);
    } else if (locationType === 'area' && isDrawing) {
      setPolygonPoints([...polygonPoints, coordinate]);
      
      // Calculate area if we have at least 3 points
      if (polygonPoints.length >= 2) {
        const area = calculatePolygonArea([...polygonPoints, coordinate]);
        setCalculatedArea(area);
      }
      setShowBottomSheet(true);
    } else if (locationType === 'multiple') {
      // Add to multiple points array
      setPolygonPoints([...polygonPoints, coordinate]);
      setShowBottomSheet(true);
    }
  };

  const calculatePolygonArea = (coordinates) => {
    const result = locationService.calculatePolygonArea(coordinates);
    return result.acres;
  };

  const toggleDrawing = () => {
    if (isDrawing) {
      // Finish drawing
      setIsDrawing(false);
      if (polygonPoints.length >= 3) {
        const area = calculatePolygonArea(polygonPoints);
        setCalculatedArea(area);
        setShowBottomSheet(true);
      } else {
        Alert.alert('Invalid Area', 'Please select at least 3 points to create an area');
        setPolygonPoints([]);
      }
    } else {
      // Start drawing
      setPolygonPoints([]);
      setIsDrawing(true);
      setShowBottomSheet(false);
    }
  };

  const clearSelection = () => {
    setSelectedPoint(null);
    setPolygonPoints([]);
    setIsDrawing(false);
    setCalculatedArea(0);
    setShowBottomSheet(false);
    setLocationName('');
  };

  const handleSaveLocation = async () => {
    if (!locationName.trim()) {
      Alert.alert('⚠️ Required', 'Please enter a name for this location');
      return;
    }

    if (locationType === 'point' && !selectedPoint) {
      Alert.alert('⚠️ Required', 'Please select a location on the map');
      return;
    }

    if (locationType === 'area' && polygonPoints.length < 3) {
      Alert.alert('⚠️ Required', 'Please draw an area with at least 3 points');
      return;
    }

    setLoading(true);

    try {
      // Prepare location data
      let geometry;

      if (locationType === 'point') {
        geometry = {
          type: 'Point',
          coordinates: [selectedPoint.longitude, selectedPoint.latitude]
        };
      } else if (locationType === 'area') {
        geometry = {
          type: 'Polygon',
          coordinates: [polygonPoints.map(p => [p.longitude, p.latitude])]
        };
      } else if (locationType === 'multiple') {
        geometry = {
          type: 'MultiPoint',
          coordinates: polygonPoints.map(p => [p.longitude, p.latitude])
        };
      }

      const locationData = {
        name: locationName.trim(),
        type: locationType,
        geometry,
        address: searchQuery || 'Custom location',
        adminArea: {
          country: 'Bangladesh',
          district: 'To be determined',
          upazila: 'To be determined'
        }
      };

      // Use location service to save (includes NASA POWER API integration)
      const result = await locationService.saveLocation(userId, locationData);

      if (result.success) {
        // Update user document with primary location
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          primaryLocationId: result.locationId,
          hasLocation: true
        });

        // Cache location
        await cacheLocation(region);

        Alert.alert(
          '🎉 Location Saved!',
          'Your farm location has been saved successfully with weather data from NASA POWER API.',
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'FarmConfig' }],
                });
              }
            }
          ]
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Save error:', error);

      // Use location service for offline save
      const offlineResult = await locationService.saveLocationOffline(userId, {
        name: locationName.trim(),
        type: locationType,
        geometry: locationType === 'point'
          ? { type: 'Point', coordinates: [selectedPoint.longitude, selectedPoint.latitude] }
          : { type: 'Polygon', coordinates: [polygonPoints.map(p => [p.longitude, p.latitude])] },
        address: searchQuery || 'Custom location'
      });

      Alert.alert(
        '📡 Offline',
        offlineResult.message || 'Location saved locally. Will sync when online.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Simplified search - would use geocoding API in production
    Alert.alert(
      '🔍 Search',
      'Address search feature coming soon. Use the map to select your location.',
      [{ text: 'OK' }]
    );
  };

  const handleManualEntry = async () => {
    if (!locationName.trim()) {
      Alert.alert('⚠️ Required', 'Please enter a location name');
      return;
    }

    if (!manualLatitude.trim() || !manualLongitude.trim()) {
      Alert.alert('⚠️ Required', 'Please enter both latitude and longitude');
      return;
    }

    setLoading(true);

    try {
      const result = await locationService.createLocationFromManualEntry(userId, {
        name: locationName.trim(),
        latitude: manualLatitude,
        longitude: manualLongitude
      });

      if (result.success) {
        // Update user document with primary location
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          primaryLocationId: result.locationId,
          hasLocation: true
        });

        Alert.alert(
          '🎉 Location Saved!',
          'Your farm location has been saved successfully with weather data from NASA POWER API.',
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'FarmConfig' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('❌ Error', result.error);
      }
    } catch (error) {
      console.error('Manual entry error:', error);
      Alert.alert('❌ Error', 'Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        mapType={mapType}
        onPress={handleMapPress}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
      >
        {/* Point Marker */}
        {locationType === 'point' && selectedPoint && (
          <Marker
            coordinate={selectedPoint}
            title={locationName || 'Selected Location'}
          >
            <Text style={styles.markerIcon}>🚜</Text>
          </Marker>
        )}

        {/* Polygon Area */}
        {locationType === 'area' && polygonPoints.length >= 3 && (
          <Polygon
            coordinates={polygonPoints}
            fillColor={`${COLORS.primaryGreen}40`}
            strokeColor={COLORS.primaryGreen}
            strokeWidth={3}
          />
        )}

        {/* Polygon Points */}
        {(locationType === 'area' || locationType === 'multiple') && polygonPoints.map((point, index) => (
          <Marker
            key={index}
            coordinate={point}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.polygonMarker}>
              <Text style={styles.polygonMarkerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Current Location */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.currentLocationMarker} />
          </Marker>
        )}
      </MapView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Map Type Toggle */}
      <TouchableOpacity
        style={styles.mapTypeButton}
        onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
      >
        <Text style={styles.mapTypeText}>
          {mapType === 'standard' ? '🛰️' : '🗺️'}
        </Text>
      </TouchableOpacity>

      {/* Current Location Button */}
      {hasLocationPermission && (
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={getCurrentLocation}
        >
          <Text style={styles.currentLocationText}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Location Type Selector */}
      <View style={styles.typeSelector}>
        {LOCATION_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeButton,
              locationType === type.id && styles.typeButtonActive
            ]}
            onPress={() => {
              setLocationType(type.id);
              clearSelection();
              if (type.id === 'manual') {
                setShowManualEntry(true);
              } else {
                setShowManualEntry(false);
              }
            }}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <Text style={[
              styles.typeLabel,
              locationType === type.id && styles.typeLabelActive
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Drawing Controls */}
      {locationType === 'area' && (
        <View style={styles.drawingControls}>
          <TouchableOpacity
            style={[styles.drawButton, isDrawing && styles.drawButtonActive]}
            onPress={toggleDrawing}
          >
            <Text style={styles.drawButtonText}>
              {isDrawing ? '✓ Finish' : '✏️ Draw Area'}
            </Text>
          </TouchableOpacity>
          {polygonPoints.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
              <Text style={styles.clearButtonText}>🗑️ Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Manual Entry Sheet */}
      {showManualEntry && (
        <View style={styles.bottomSheet}>
          <ScrollView style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>✍️ Manual Entry</Text>
            <Text style={styles.manualEntryInfo}>
              Enter coordinates manually if you're offline or prefer not to use the map.
            </Text>

            {/* Location Name */}
            <Text style={styles.inputLabel}>Location Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Main Farm, North Field"
              value={locationName}
              onChangeText={setLocationName}
            />

            {/* Latitude */}
            <Text style={styles.inputLabel}>Latitude *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 23.8103 (-90 to 90)"
              value={manualLatitude}
              onChangeText={setManualLatitude}
              keyboardType="numeric"
            />

            {/* Longitude */}
            <Text style={styles.inputLabel}>Longitude *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 90.4125 (-180 to 180)"
              value={manualLongitude}
              onChangeText={setManualLongitude}
              keyboardType="numeric"
            />

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>💡 How to get coordinates:</Text>
              <Text style={styles.infoBoxText}>1. Open Google Maps</Text>
              <Text style={styles.infoBoxText}>2. Long press on your location</Text>
              <Text style={styles.infoBoxText}>3. Tap on the coordinates to copy</Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleManualEntry}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? '⏳ Saving...' : '✓ Save Location'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowManualEntry(false);
                setManualLatitude('');
                setManualLongitude('');
                setLocationName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && !showManualEntry && (
        <View style={styles.bottomSheet}>
          <ScrollView style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>📍 Location Details</Text>

            {/* Location Name */}
            <Text style={styles.inputLabel}>Location Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Main Farm, North Field"
              value={locationName}
              onChangeText={setLocationName}
            />

            {/* Area Display */}
            {locationType === 'area' && calculatedArea > 0 && (
              <View style={styles.areaDisplay}>
                <Text style={styles.areaLabel}>Calculated Area:</Text>
                <Text style={styles.areaValue}>
                  {calculatedArea.toFixed(2)} acres
                </Text>
                <Text style={styles.areaSubValue}>
                  ({(calculatedArea * 0.404686).toFixed(2)} hectares)
                </Text>
              </View>
            )}

            {/* Coordinates Display */}
            {selectedPoint && (
              <View style={styles.coordsDisplay}>
                <Text style={styles.coordsLabel}>Coordinates:</Text>
                <Text style={styles.coordsValue}>
                  {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
                </Text>
              </View>
            )}

            {/* Points Count */}
            {polygonPoints.length > 0 && (
              <View style={styles.pointsDisplay}>
                <Text style={styles.pointsLabel}>
                  {locationType === 'area' ? 'Boundary Points:' : 'Selected Points:'}
                </Text>
                <Text style={styles.pointsValue}>{polygonPoints.length}</Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSaveLocation}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? '⏳ Saving...' : '✓ Confirm Location'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={clearSelection}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  searchButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 24,
  },
  mapTypeButton: {
    position: 'absolute',
    top: 120,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapTypeText: {
    fontSize: 24,
  },
  currentLocationButton: {
    position: 'absolute',
    top: 180,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationText: {
    fontSize: 24,
  },
  typeSelector: {
    position: 'absolute',
    top: 120,
    left: 20,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 10,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 5,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
  typeLabelActive: {
    color: COLORS.pureWhite,
  },
  drawingControls: {
    position: 'absolute',
    bottom: 300,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  drawButton: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  drawButtonActive: {
    backgroundColor: COLORS.accentYellow,
  },
  drawButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  clearButton: {
    width: 80,
    height: 50,
    backgroundColor: COLORS.earthBrown,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  markerIcon: {
    fontSize: 36,
  },
  polygonMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.pureWhite,
  },
  polygonMarkerText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.skyBlue,
    borderWidth: 3,
    borderColor: COLORS.pureWhite,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.6,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomSheetContent: {
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.pureWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  areaDisplay: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  areaLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 5,
  },
  areaValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  areaSubValue: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginTop: 2,
  },
  coordsDisplay: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
  },
  coordsLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 5,
  },
  coordsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  pointsDisplay: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 5,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  saveButton: {
    width: '100%',
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButtonText: {
    color: COLORS.earthBrown,
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualEntryInfo: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    marginBottom: 15,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: COLORS.earthBrown,
    marginBottom: 4,
  },
});
