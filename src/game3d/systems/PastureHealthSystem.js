/**
 * Pasture Health System (UC56)
 * Monitor pasture condition using NDVI and plan rotational grazing
 */
export class PastureHealthSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.pastures = new Map();
    this.ndviHistory = new Map();
    this.grazingSchedules = new Map();
  }

  /**
   * Register pasture for monitoring
   */
  registerPasture(pasture) {
    this.pastures.set(pasture.id, pasture);
    this.ndviHistory.set(pasture.id, []);
  }

  /**
   * Update pasture health from NDVI data
   */
  async updatePastureHealth(pastureId, ndviData) {
    const pasture = this.pastures.get(pastureId);
    if (!pasture) return;

    // Update NDVI
    pasture.health.ndvi = ndviData.value;
    
    // Calculate biomass (kg/ha) from NDVI
    // Empirical formula: Biomass = 1000 * (NDVI + 0.5)^3
    pasture.health.biomass = Math.round(1000 * Math.pow(ndviData.value + 0.5, 3));
    
    // Calculate growth rate (kg/ha/day)
    const history = this.ndviHistory.get(pastureId);
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      const daysSince = (Date.now() - lastEntry.timestamp) / (1000 * 60 * 60 * 24);
      const biomassDiff = pasture.health.biomass - lastEntry.biomass;
      pasture.health.growthRate = Math.round(biomassDiff / daysSince);
    }
    
    // Store history
    history.push({
      timestamp: Date.now(),
      ndvi: ndviData.value,
      biomass: pasture.health.biomass
    });
    
    // Keep last 90 days
    if (history.length > 90) {
      history.shift();
    }
    
    // Determine condition
    pasture.health.condition = this.assessCondition(pasture);
    
    // Check for issues
    this.checkForIssues(pasture);
  }

  /**
   * Assess pasture condition
   */
  assessCondition(pasture) {
    const ndvi = pasture.health.ndvi;
    
    if (ndvi > 0.6) return 'excellent';
    if (ndvi > 0.4) return 'good';
    if (ndvi > 0.2) return 'fair';
    if (ndvi > 0.1) return 'poor';
    return 'critical';
  }

  /**
   * Check for pasture issues
   */
  checkForIssues(pasture) {
    const issues = [];
    
    // Overgrazing detection
    const stocking = pasture.grazing.currentAnimals / pasture.grazing.capacity;
    if (stocking > 0.8 && pasture.health.ndvi < 0.3) {
      issues.push({
        type: 'overgrazing',
        severity: 'high',
        message: `${pasture.name} shows signs of overgrazing. NDVI: ${pasture.health.ndvi.toFixed(2)}, Stocking: ${Math.round(stocking * 100)}%`
      });
    }
    
    // Drought stress
    if (pasture.health.ndvi < 0.2 && pasture.health.growthRate < 10) {
      issues.push({
        type: 'drought_stress',
        severity: 'high',
        message: `${pasture.name} experiencing drought stress. Consider irrigation or moving animals.`
      });
    }
    
    // Low biomass
    if (pasture.health.biomass < 1000) {
      issues.push({
        type: 'low_biomass',
        severity: 'medium',
        message: `${pasture.name} has low grass biomass (${pasture.health.biomass} kg/ha). Rest period recommended.`
      });
    }
    
    // Trigger alerts
    issues.forEach(issue => {
      this.triggerAlert(pasture, issue);
    });
    
    return issues;
  }

  /**
   * Generate grazing rotation recommendations
   */
  getGrazingRecommendations() {
    const recommendations = [];
    
    this.pastures.forEach(pasture => {
      const rec = this.analyzePasture(pasture);
      if (rec) {
        recommendations.push(rec);
      }
    });
    
    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze individual pasture
   */
  analyzePasture(pasture) {
    const ndvi = pasture.health.ndvi;
    const biomass = pasture.health.biomass;
    const stocking = pasture.grazing.currentAnimals / pasture.grazing.capacity;
    
    // Ready for grazing
    if (ndvi > 0.5 && biomass > 2000 && pasture.grazing.currentAnimals === 0) {
      return {
        pastureId: pasture.id,
        pastureName: pasture.name,
        action: 'start_grazing',
        priority: 8,
        message: `${pasture.name} is ready for grazing. Excellent grass growth (NDVI: ${ndvi.toFixed(2)})`,
        capacity: pasture.grazing.capacity,
        estimatedDays: Math.floor(biomass / (pasture.grazing.capacity * 15)) // 15kg/animal/day
      };
    }
    
    // Needs rest
    if (ndvi < 0.3 && pasture.grazing.currentAnimals > 0) {
      return {
        pastureId: pasture.id,
        pastureName: pasture.name,
        action: 'move_animals',
        priority: 10,
        message: `${pasture.name} needs rest. Move animals to allow recovery.`,
        urgency: 'high'
      };
    }
    
    // Rotation recommended
    if (stocking > 0.6 && biomass < 1500) {
      return {
        pastureId: pasture.id,
        pastureName: pasture.name,
        action: 'rotate',
        priority: 7,
        message: `Consider rotating animals from ${pasture.name}. Grass is getting low.`,
        daysUntilCritical: Math.floor(biomass / (pasture.grazing.currentAnimals * 15))
      };
    }
    
    return null;
  }

  /**
   * Create grazing rotation schedule
   */
  createRotationSchedule(pastures, animalCount, rotationDays = 7) {
    const schedule = [];
    let currentDate = Date.now();
    
    pastures.forEach((pastureId, index) => {
      const pasture = this.pastures.get(pastureId);
      if (!pasture) return;
      
      schedule.push({
        pastureId,
        pastureName: pasture.name,
        startDate: currentDate,
        endDate: currentDate + (rotationDays * 24 * 60 * 60 * 1000),
        animalCount,
        expectedBiomassUse: animalCount * 15 * rotationDays,
        order: index + 1
      });
      
      currentDate += rotationDays * 24 * 60 * 60 * 1000;
    });
    
    return schedule;
  }

  /**
   * Compare with historical data
   */
  compareWithHistory(pastureId, daysBack = 365) {
    const history = this.ndviHistory.get(pastureId);
    if (!history || history.length === 0) return null;
    
    const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const historicalData = history.filter(entry => entry.timestamp >= cutoffDate);
    
    if (historicalData.length === 0) return null;
    
    const avgNDVI = historicalData.reduce((sum, entry) => sum + entry.ndvi, 0) / historicalData.length;
    const avgBiomass = historicalData.reduce((sum, entry) => sum + entry.biomass, 0) / historicalData.length;
    
    const pasture = this.pastures.get(pastureId);
    const currentNDVI = pasture.health.ndvi;
    const currentBiomass = pasture.health.biomass;
    
    return {
      period: `${daysBack} days`,
      historical: {
        avgNDVI: avgNDVI.toFixed(3),
        avgBiomass: Math.round(avgBiomass)
      },
      current: {
        ndvi: currentNDVI.toFixed(3),
        biomass: currentBiomass
      },
      comparison: {
        ndviChange: ((currentNDVI - avgNDVI) / avgNDVI * 100).toFixed(1) + '%',
        biomassChange: ((currentBiomass - avgBiomass) / avgBiomass * 100).toFixed(1) + '%',
        trend: currentNDVI > avgNDVI ? 'improving' : 'declining'
      }
    };
  }

  /**
   * Get pasture health
   */
  getPastureHealth(pastureId) {
    const pasture = this.pastures.get(pastureId);
    return pasture ? pasture.health : null;
  }

  /**
   * Get average health across all pastures
   */
  getAverageHealth() {
    if (this.pastures.size === 0) return 0;
    
    const totalNDVI = Array.from(this.pastures.values())
      .reduce((sum, p) => sum + p.health.ndvi, 0);
    
    return totalNDVI / this.pastures.size;
  }

  /**
   * Trigger alert
   */
  triggerAlert(pasture, issue) {
    console.log(`[PASTURE ALERT] ${issue.severity.toUpperCase()}: ${issue.message}`);
    
    // Integrate with alert system (UC40)
    if (this.hub.player.alertSystem) {
      this.hub.player.alertSystem.createAlert({
        type: 'pasture_health',
        severity: issue.severity,
        title: `Pasture Issue: ${pasture.name}`,
        message: issue.message,
        pastureId: pasture.id
      });
    }
  }

  /**
   * Update system
   */
  update(deltaTime) {
    // Periodic health checks (every hour in-game)
    // Implementation depends on game time system
  }
}

export default PastureHealthSystem;
