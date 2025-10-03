/**
 * Livestock Movement System (UC60)
 * Track animal locations and movement patterns using GPS/RFID
 */
export class LivestockMovementSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.trackedAnimals = new Map();
    this.locationHistory = new Map();
    this.geofences = new Map();
    this.alerts = [];
  }

  /**
   * Track animal with GPS/RFID
   */
  trackAnimal(animal) {
    this.trackedAnimals.set(animal.id, {
      animalId: animal.id,
      currentLocation: animal.location,
      lastUpdate: Date.now(),
      trackingEnabled: true,
      deviceId: `device_${animal.id}`
    });

    this.locationHistory.set(animal.id, []);
  }

  /**
   * Update animal location
   */
  updateLocation(animalId, location) {
    const tracking = this.trackedAnimals.get(animalId);
    if (!tracking) return;

    const previousLocation = tracking.currentLocation;
    
    // Update current location
    tracking.currentLocation = {
      lat: location.lat,
      lng: location.lng,
      altitude: location.altitude || 0,
      accuracy: location.accuracy || 10,
      timestamp: Date.now()
    };
    tracking.lastUpdate = Date.now();

    // Store in history
    const history = this.locationHistory.get(animalId);
    history.push({
      ...tracking.currentLocation,
      speed: this.calculateSpeed(previousLocation, tracking.currentLocation)
    });

    // Keep last 7 days
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.locationHistory.set(
      animalId,
      history.filter(loc => loc.timestamp >= cutoff)
    );

    // Update animal object
    const animal = this.hub.getAnimal(animalId);
    if (animal) {
      animal.location = tracking.currentLocation;
    }

    // Check geofences
    this.checkGeofences(animalId, tracking.currentLocation);

    // Analyze behavior
    this.analyzeBehavior(animalId);
  }

  /**
   * Calculate speed between locations
   */
  calculateSpeed(loc1, loc2) {
    if (!loc1 || !loc2) return 0;

    const distance = this.calculateDistance(loc1, loc2);
    const timeDiff = (loc2.timestamp - loc1.timestamp) / 1000; // seconds

    return timeDiff > 0 ? distance / timeDiff : 0; // m/s
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(loc1, loc2) {
    const R = 6371000; // Earth radius in meters
    const lat1 = loc1.lat * Math.PI / 180;
    const lat2 = loc2.lat * Math.PI / 180;
    const deltaLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const deltaLng = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Create geofence
   */
  createGeofence(config) {
    const geofence = {
      id: config.id || `fence_${Date.now()}`,
      name: config.name,
      type: config.type || 'circular', // circular, polygon
      center: config.center, // {lat, lng}
      radius: config.radius, // meters (for circular)
      polygon: config.polygon, // array of {lat, lng} (for polygon)
      action: config.action || 'alert', // alert, prevent
      createdAt: Date.now()
    };

    this.geofences.set(geofence.id, geofence);

    return geofence;
  }

  /**
   * Check if location is within geofence
   */
  isWithinGeofence(location, geofence) {
    if (geofence.type === 'circular') {
      const distance = this.calculateDistance(location, geofence.center);
      return distance <= geofence.radius;
    } else if (geofence.type === 'polygon') {
      return this.isPointInPolygon(location, geofence.polygon);
    }
    return false;
  }

  /**
   * Check if point is inside polygon (ray casting algorithm)
   */
  isPointInPolygon(point, polygon) {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      
      const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
        (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Check geofences for animal
   */
  checkGeofences(animalId, location) {
    const animal = this.hub.getAnimal(animalId);
    if (!animal) return;

    this.geofences.forEach(geofence => {
      const isInside = this.isWithinGeofence(location, geofence);
      const wasInside = animal.location.lastGeofence === geofence.id;

      // Boundary breach detection
      if (wasInside && !isInside) {
        this.triggerGeofenceAlert(animal, geofence, 'exit');
      } else if (!wasInside && isInside) {
        animal.location.lastGeofence = geofence.id;
      }
    });
  }

  /**
   * Trigger geofence alert
   */
  triggerGeofenceAlert(animal, geofence, action) {
    const alert = {
      id: `alert_${Date.now()}`,
      animalId: animal.id,
      animalName: animal.name,
      geofenceId: geofence.id,
      geofenceName: geofence.name,
      action,
      location: animal.location,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    console.log(`[MOVEMENT ALERT] ${animal.name} ${action}ed geofence: ${geofence.name}`);

    if (this.hub.player.alertSystem) {
      this.hub.player.alertSystem.createAlert({
        type: 'livestock_movement',
        severity: 'high',
        title: `Boundary Breach: ${animal.name}`,
        message: `${animal.name} has left ${geofence.name}. Current location: ${animal.location.lat.toFixed(6)}, ${animal.location.lng.toFixed(6)}`,
        animalId: animal.id,
        location: animal.location
      });
    }
  }

  /**
   * Analyze grazing patterns
   */
  analyzeGrazingPatterns(animalId, days = 7) {
    const history = this.locationHistory.get(animalId);
    if (!history || history.length === 0) return null;

    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLocations = history.filter(loc => loc.timestamp >= cutoff);

    if (recentLocations.length === 0) return null;

    // Calculate area covered
    const bounds = this.calculateBounds(recentLocations);
    const area = this.calculateArea(bounds);

    // Calculate average speed
    const avgSpeed = recentLocations.reduce((sum, loc) => sum + (loc.speed || 0), 0) / recentLocations.length;

    // Identify hotspots (frequently visited areas)
    const hotspots = this.identifyHotspots(recentLocations);

    // Calculate distance traveled
    let totalDistance = 0;
    for (let i = 1; i < recentLocations.length; i++) {
      totalDistance += this.calculateDistance(recentLocations[i - 1], recentLocations[i]);
    }

    return {
      period: `${days} days`,
      areaCovered: area, // square meters
      totalDistance: totalDistance, // meters
      avgSpeed: avgSpeed, // m/s
      hotspots,
      locationCount: recentLocations.length,
      bounds
    };
  }

  /**
   * Calculate bounds of locations
   */
  calculateBounds(locations) {
    const lats = locations.map(loc => loc.lat);
    const lngs = locations.map(loc => loc.lng);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }

  /**
   * Calculate area from bounds (approximate)
   */
  calculateArea(bounds) {
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    
    // Approximate conversion to meters (at equator)
    const latMeters = latDiff * 111000;
    const lngMeters = lngDiff * 111000;

    return latMeters * lngMeters;
  }

  /**
   * Identify location hotspots
   */
  identifyHotspots(locations, gridSize = 0.0001) {
    const grid = new Map();

    locations.forEach(loc => {
      const gridKey = `${Math.floor(loc.lat / gridSize)}_${Math.floor(loc.lng / gridSize)}`;
      grid.set(gridKey, (grid.get(gridKey) || 0) + 1);
    });

    // Get top 5 hotspots
    const hotspots = Array.from(grid.entries())
      .map(([key, count]) => {
        const [latGrid, lngGrid] = key.split('_').map(Number);
        return {
          lat: latGrid * gridSize,
          lng: lngGrid * gridSize,
          visits: count
        };
      })
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);

    return hotspots;
  }

  /**
   * Analyze behavior patterns
   */
  analyzeBehavior(animalId) {
    const patterns = this.analyzeGrazingPatterns(animalId, 1); // Last 24 hours
    if (!patterns) return;

    const animal = this.hub.getAnimal(animalId);
    if (!animal) return;

    // Detect unusual behavior
    const alerts = [];

    // Stationary for too long
    if (patterns.avgSpeed < 0.01 && patterns.locationCount > 10) {
      alerts.push({
        type: 'stationary',
        severity: 'medium',
        message: `${animal.name} has been stationary for extended period. Check for injury or illness.`
      });
    }

    // Excessive movement
    if (patterns.avgSpeed > 2.0) {
      alerts.push({
        type: 'excessive_movement',
        severity: 'medium',
        message: `${animal.name} showing unusual movement patterns. May indicate stress or predator presence.`
      });
    }

    // Trigger alerts
    alerts.forEach(alert => {
      if (this.hub.player.alertSystem) {
        this.hub.player.alertSystem.createAlert({
          type: 'animal_behavior',
          severity: alert.severity,
          title: `Behavior Alert: ${animal.name}`,
          message: alert.message,
          animalId: animal.id
        });
      }
    });
  }

  /**
   * Generate movement report
   */
  generateMovementReport(animalId, days = 7) {
    const animal = this.hub.getAnimal(animalId);
    const patterns = this.analyzeGrazingPatterns(animalId, days);

    if (!animal || !patterns) return null;

    return {
      animal: {
        id: animal.id,
        name: animal.name,
        type: animal.type
      },
      period: patterns.period,
      summary: {
        areaCovered: `${(patterns.areaCovered / 10000).toFixed(2)} hectares`,
        distanceTraveled: `${(patterns.totalDistance / 1000).toFixed(2)} km`,
        avgSpeed: `${(patterns.avgSpeed * 3.6).toFixed(2)} km/h`,
        locationUpdates: patterns.locationCount
      },
      hotspots: patterns.hotspots,
      pastureUtilization: this.calculatePastureUtilization(patterns),
      recommendations: this.generateMovementRecommendations(patterns)
    };
  }

  /**
   * Calculate pasture utilization
   */
  calculatePastureUtilization(patterns) {
    // Compare area covered to available pasture
    const totalPastureArea = Array.from(this.hub.pastures.values())
      .reduce((sum, p) => sum + p.area, 0);

    const utilizationPercent = (patterns.areaCovered / totalPastureArea) * 100;

    return {
      areaCovered: patterns.areaCovered,
      totalAvailable: totalPastureArea,
      utilizationPercent: utilizationPercent.toFixed(1),
      status: utilizationPercent > 80 ? 'high' : utilizationPercent > 50 ? 'good' : 'low'
    };
  }

  /**
   * Generate movement recommendations
   */
  generateMovementRecommendations(patterns) {
    const recommendations = [];

    if (patterns.areaCovered < 10000) {
      recommendations.push('Consider rotating to larger pasture for better grazing');
    }

    if (patterns.hotspots.length > 0) {
      recommendations.push('Hotspots identified - may indicate preferred grazing areas or water sources');
    }

    if (patterns.avgSpeed < 0.1) {
      recommendations.push('Low movement detected - ensure adequate pasture quality and water access');
    }

    return recommendations;
  }

  /**
   * Manual location update (fallback)
   */
  manualLocationUpdate(animalId, location, notes) {
    this.updateLocation(animalId, {
      ...location,
      manual: true,
      notes,
      accuracy: 50 // Lower accuracy for manual updates
    });
  }

  /**
   * Get real-time locations for map display
   */
  getRealTimeLocations() {
    const locations = [];

    this.trackedAnimals.forEach((tracking, animalId) => {
      const animal = this.hub.getAnimal(animalId);
      if (animal && tracking.trackingEnabled) {
        locations.push({
          animalId: animal.id,
          animalName: animal.name,
          animalType: animal.type,
          location: tracking.currentLocation,
          lastUpdate: tracking.lastUpdate,
          status: this.getTrackingStatus(tracking)
        });
      }
    });

    return locations;
  }

  /**
   * Get tracking status
   */
  getTrackingStatus(tracking) {
    const timeSinceUpdate = Date.now() - tracking.lastUpdate;
    
    if (timeSinceUpdate < 5 * 60 * 1000) return 'active'; // < 5 min
    if (timeSinceUpdate < 30 * 60 * 1000) return 'delayed'; // < 30 min
    return 'offline';
  }

  /**
   * Update system
   */
  update(deltaTime) {
    // Check for stale tracking data
    // Update real-time positions
    // Process movement patterns
  }
}

export default LivestockMovementSystem;
