/**
 * Location & Farm Area Management Service
 * Handles geofence storage, farm area calculations, and NASA POWER API integration
 */

import { collection, addDoc, doc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.config';
import { storage } from '../utils/storage';
import { getDailyPoint, getCurrentMonthRange } from './power.service';

/**
 * Calculate area of a polygon using the Shoelace formula
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} Area in both acres and hectares
 */
export const calculatePolygonArea = (coordinates) => {
  if (coordinates.length < 3) {
    return { acres: 0, hectares: 0, squareMeters: 0 };
  }

  let area = 0;
  const earthRadius = 6371000; // meters

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const lat1 = coordinates[i].latitude * Math.PI / 180;
    const lat2 = coordinates[j].latitude * Math.PI / 180;
    const lon1 = coordinates[i].longitude * Math.PI / 180;
    const lon2 = coordinates[j].longitude * Math.PI / 180;

    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * earthRadius * earthRadius / 2);

  // Convert to different units
  const squareMeters = area;
  const acres = area / 4046.86;
  const hectares = area / 10000;

  return {
    squareMeters: parseFloat(squareMeters.toFixed(2)),
    acres: parseFloat(acres.toFixed(2)),
    hectares: parseFloat(hectares.toFixed(2))
  };
};

/**
 * Calculate bounding box from coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} Bounding box {minLat, maxLat, minLon, maxLon, bbox}
 */
export const calculateBoundingBox = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLon = coordinates[0].longitude;
  let maxLon = coordinates[0].longitude;

  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLon = Math.min(minLon, coord.longitude);
    maxLon = Math.max(maxLon, coord.longitude);
  });

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    bbox: `${minLon},${minLat},${maxLon},${maxLat}` // Format for NASA POWER API
  };
};

/**
 * Get center point of coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} Center point {latitude, longitude}
 */
export const getCenterPoint = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const sum = coordinates.reduce((acc, coord) => ({
    latitude: acc.latitude + coord.latitude,
    longitude: acc.longitude + coord.longitude
  }), { latitude: 0, longitude: 0 });

  return {
    latitude: sum.latitude / coordinates.length,
    longitude: sum.longitude / coordinates.length
  };
};

/**
 * Save a new farm location with geofence
 * @param {string} userId - User ID
 * @param {Object} locationData - Location data
 * @returns {Promise<Object>} Result with location ID
 */
export const saveLocation = async (userId, locationData) => {
  try {
    // Validate required fields
    if (!locationData.name || !locationData.type || !locationData.geometry) {
      return {
        success: false,
        error: 'Missing required fields: name, type, or geometry'
      };
    }

    // Calculate additional metadata
    let area = null;
    let centerPoint = null;
    let boundingBox = null;

    if (locationData.type === 'area' && locationData.geometry.type === 'Polygon') {
      const coords = locationData.geometry.coordinates[0].map(c => ({
        latitude: c[1],
        longitude: c[0]
      }));
      area = calculatePolygonArea(coords);
      centerPoint = getCenterPoint(coords);
      boundingBox = calculateBoundingBox(coords);
    } else if (locationData.type === 'point') {
      const [lon, lat] = locationData.geometry.coordinates;
      centerPoint = { latitude: lat, longitude: lon };
    }

    // Prepare final location document
    const locationDoc = {
      ...locationData,
      area,
      centerPoint,
      boundingBox,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    // Save to Firestore
    const locationsRef = collection(db, 'users', userId, 'locations');
    const docRef = await addDoc(locationsRef, locationDoc);

    // Fetch NASA POWER data for the location
    try {
      const powerData = await fetchLocationWeatherData(centerPoint || locationDoc.geometry.coordinates);

      // Store weather data reference
      await updateDoc(docRef, {
        lastWeatherUpdate: new Date().toISOString(),
        weatherDataAvailable: true
      });

      // Cache weather data locally
      await storage.save(`weather_${docRef.id}`, powerData);
    } catch (weatherError) {
      console.warn('Weather data fetch failed, continuing without it:', weatherError);
    }

    return {
      success: true,
      locationId: docRef.id,
      location: locationDoc
    };
  } catch (error) {
    console.error('Save location error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Save location offline (for sync later)
 * @param {string} userId - User ID
 * @param {Object} locationData - Location data
 * @returns {Promise<Object>} Result
 */
export const saveLocationOffline = async (userId, locationData) => {
  try {
    const offlineData = {
      userId,
      locationData,
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Get existing offline queue
    const queue = await storage.get('offline_locations_queue') || [];
    queue.push(offlineData);

    await storage.save('offline_locations_queue', queue);

    return {
      success: true,
      message: 'Location saved offline. Will sync when online.'
    };
  } catch (error) {
    console.error('Offline save error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Sync offline locations to Firestore
 * @returns {Promise<Object>} Sync result
 */
export const syncOfflineLocations = async () => {
  try {
    const queue = await storage.get('offline_locations_queue') || [];

    if (queue.length === 0) {
      return { success: true, synced: 0 };
    }

    let syncedCount = 0;
    const failedItems = [];

    for (const item of queue) {
      if (item.synced) continue;

      const result = await saveLocation(item.userId, item.locationData);

      if (result.success) {
        syncedCount++;
        item.synced = true;
      } else {
        failedItems.push(item);
      }
    }

    // Update queue (remove synced items)
    await storage.save('offline_locations_queue', failedItems);

    return {
      success: true,
      synced: syncedCount,
      failed: failedItems.length
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get all locations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with locations array
 */
export const getUserLocations = async (userId) => {
  try {
    const locationsRef = collection(db, 'users', userId, 'locations');
    const q = query(locationsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);

    const locations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      locations
    };
  } catch (error) {
    console.error('Get locations error:', error);
    return {
      success: false,
      error: error.message,
      locations: []
    };
  }
};

/**
 * Update location
 * @param {string} userId - User ID
 * @param {string} locationId - Location ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Result
 */
export const updateLocation = async (userId, locationId, updates) => {
  try {
    const locationRef = doc(db, 'users', userId, 'locations', locationId);

    await updateDoc(locationRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Location updated successfully'
    };
  } catch (error) {
    console.error('Update location error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete (deactivate) location
 * @param {string} userId - User ID
 * @param {string} locationId - Location ID
 * @returns {Promise<Object>} Result
 */
export const deleteLocation = async (userId, locationId) => {
  try {
    const locationRef = doc(db, 'users', userId, 'locations', locationId);

    // Soft delete by marking as inactive
    await updateDoc(locationRef, {
      isActive: false,
      deletedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Location deleted successfully'
    };
  } catch (error) {
    console.error('Delete location error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fetch NASA POWER weather data for a location
 * @param {Object} coordinates - {latitude, longitude}
 * @returns {Promise<Object>} Weather data
 */
export const fetchLocationWeatherData = async (coordinates) => {
  try {
    const { start, end } = getCurrentMonthRange();

    const data = await getDailyPoint({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      start,
      end,
      parameters: ['T2M', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN', 'PRECTOTCORR', 'EVPTRNS']
    });

    return {
      success: true,
      data,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Weather data fetch error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get cached weather data for a location
 * @param {string} locationId - Location ID
 * @returns {Promise<Object>} Cached weather data or null
 */
export const getCachedWeatherData = async (locationId) => {
  try {
    const data = await storage.get(`weather_${locationId}`);
    return data;
  } catch (error) {
    console.error('Get cached weather error:', error);
    return null;
  }
};

/**
 * Manual entry: Create location from text coordinates
 * @param {string} userId - User ID
 * @param {Object} manualData - {name, latitude, longitude}
 * @returns {Promise<Object>} Result
 */
export const createLocationFromManualEntry = async (userId, manualData) => {
  try {
    const { name, latitude, longitude } = manualData;

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return {
        success: false,
        error: 'Invalid coordinates. Please enter valid numbers.'
      };
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return {
        success: false,
        error: 'Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180'
      };
    }

    const locationData = {
      name: name.trim(),
      type: 'point',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      address: 'Manual entry',
      adminArea: {
        country: 'Unknown',
        district: 'Unknown',
        upazila: 'Unknown'
      },
      entryMethod: 'manual'
    };

    return await saveLocation(userId, locationData);
  } catch (error) {
    console.error('Manual entry error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const locationService = {
  calculatePolygonArea,
  calculateBoundingBox,
  getCenterPoint,
  saveLocation,
  saveLocationOffline,
  syncOfflineLocations,
  getUserLocations,
  updateLocation,
  deleteLocation,
  fetchLocationWeatherData,
  getCachedWeatherData,
  createLocationFromManualEntry
};
