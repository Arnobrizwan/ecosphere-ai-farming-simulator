/**
 * Animal Health System (UC57)
 * Track livestock health indicators and detect early illness signs
 */
export class AnimalHealthSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.animals = new Map();
    this.healthRecords = new Map();
    this.alerts = [];
    this.aiDetectionEnabled = true;
  }

  /**
   * Register animal for health monitoring
   */
  registerAnimal(animal) {
    this.animals.set(animal.id, animal);
    this.healthRecords.set(animal.id, []);
  }

  /**
   * Record health observation
   */
  recordObservation(animalId, observation) {
    const animal = this.animals.get(animalId);
    if (!animal) return;

    const record = {
      timestamp: Date.now(),
      temperature: observation.temperature,
      behavior: observation.behavior,
      feedIntake: observation.feedIntake,
      notes: observation.notes || '',
      recordedBy: observation.recordedBy || 'system'
    };

    // Update animal health
    animal.health.temperature = observation.temperature;
    animal.health.behavior = observation.behavior;
    animal.health.feedIntake = observation.feedIntake;
    animal.health.lastCheckup = Date.now();

    // Store record
    const records = this.healthRecords.get(animalId);
    records.push(record);

    // Keep last 90 days
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
    this.healthRecords.set(
      animalId,
      records.filter(r => r.timestamp >= cutoff)
    );

    // Check for anomalies
    if (this.aiDetectionEnabled) {
      this.detectAnomalies(animalId, record);
    }

    return record;
  }

  /**
   * AI-powered anomaly detection
   */
  detectAnomalies(animalId, currentRecord) {
    const animal = this.animals.get(animalId);
    const records = this.healthRecords.get(animalId);

    if (records.length < 3) return; // Need baseline data

    const anomalies = [];

    // Temperature anomaly
    const normalTemp = this.getNormalRange(animal.type, 'temperature');
    if (currentRecord.temperature < normalTemp.min || currentRecord.temperature > normalTemp.max) {
      anomalies.push({
        type: 'temperature',
        severity: Math.abs(currentRecord.temperature - normalTemp.avg) > 1.5 ? 'high' : 'medium',
        message: `Abnormal temperature: ${currentRecord.temperature}°C (normal: ${normalTemp.min}-${normalTemp.max}°C)`,
        recommendation: 'Veterinary consultation recommended'
      });
    }

    // Feed intake anomaly
    const avgIntake = records.slice(-7).reduce((sum, r) => sum + r.feedIntake, 0) / Math.min(7, records.length);
    const intakeChange = ((currentRecord.feedIntake - avgIntake) / avgIntake) * 100;
    
    if (intakeChange < -30) {
      anomalies.push({
        type: 'feed_intake',
        severity: 'high',
        message: `Feed intake dropped by ${Math.abs(intakeChange).toFixed(0)}% (current: ${currentRecord.feedIntake}kg, avg: ${avgIntake.toFixed(1)}kg)`,
        recommendation: 'Check for illness or stress'
      });
    }

    // Behavior anomaly
    if (currentRecord.behavior !== 'normal') {
      anomalies.push({
        type: 'behavior',
        severity: currentRecord.behavior === 'lethargic' || currentRecord.behavior === 'aggressive' ? 'high' : 'medium',
        message: `Abnormal behavior observed: ${currentRecord.behavior}`,
        recommendation: 'Monitor closely and consider examination'
      });
    }

    // Create alerts for anomalies
    anomalies.forEach(anomaly => {
      this.createHealthAlert(animal, anomaly);
    });
  }

  /**
   * Get normal range for animal type
   */
  getNormalRange(animalType, metric) {
    const ranges = {
      cattle: {
        temperature: { min: 38.0, max: 39.5, avg: 38.5 },
        feedIntake: { min: 10, max: 25, avg: 18 }
      },
      sheep: {
        temperature: { min: 38.5, max: 40.0, avg: 39.0 },
        feedIntake: { min: 1.5, max: 3.5, avg: 2.5 }
      },
      goat: {
        temperature: { min: 38.5, max: 40.0, avg: 39.0 },
        feedIntake: { min: 2, max: 4, avg: 3 }
      },
      chicken: {
        temperature: { min: 40.5, max: 42.0, avg: 41.0 },
        feedIntake: { min: 0.1, max: 0.15, avg: 0.12 }
      }
    };

    return ranges[animalType]?.[metric] || { min: 0, max: 100, avg: 50 };
  }

  /**
   * Create health alert
   */
  createHealthAlert(animal, anomaly) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      animalId: animal.id,
      animalName: animal.name,
      animalType: animal.type,
      anomaly,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    };

    this.alerts.push(alert);

    console.log(`[HEALTH ALERT] ${anomaly.severity.toUpperCase()}: ${animal.name} - ${anomaly.message}`);

    // Integrate with alert system (UC40)
    if (this.hub.player.alertSystem) {
      this.hub.player.alertSystem.createAlert({
        type: 'animal_health',
        severity: anomaly.severity,
        title: `Health Alert: ${animal.name}`,
        message: anomaly.message,
        recommendation: anomaly.recommendation,
        animalId: animal.id
      });
    }

    // Create task for veterinary check if high severity (UC22)
    if (anomaly.severity === 'high' && this.hub.player.taskSystem) {
      this.hub.player.taskSystem.createTask({
        type: 'veterinary_check',
        title: `Check ${animal.name}`,
        animal: animal.id,
        priority: 'high',
        dueDate: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });
    }
  }

  /**
   * Get health alerts
   */
  getHealthAlerts(filter = {}) {
    let alerts = this.alerts;

    if (filter.unacknowledged) {
      alerts = alerts.filter(a => !a.acknowledged);
    }

    if (filter.unresolved) {
      alerts = alerts.filter(a => !a.resolved);
    }

    if (filter.severity) {
      alerts = alerts.filter(a => a.anomaly.severity === filter.severity);
    }

    if (filter.animalId) {
      alerts = alerts.filter(a => a.animalId === filter.animalId);
    }

    return alerts;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId, resolution) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      alert.resolution = resolution;
    }
  }

  /**
   * Record medication
   */
  recordMedication(animalId, medication) {
    const animal = this.animals.get(animalId);
    if (!animal) return;

    const medRecord = {
      id: `med_${Date.now()}`,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      startDate: medication.startDate || Date.now(),
      endDate: medication.endDate,
      administeredBy: medication.administeredBy,
      notes: medication.notes || ''
    };

    animal.health.medications.push(medRecord);

    return medRecord;
  }

  /**
   * Track recovery
   */
  trackRecovery(animalId) {
    const records = this.healthRecords.get(animalId);
    if (!records || records.length < 7) return null;

    const recent = records.slice(-7);
    const baseline = records.slice(-14, -7);

    if (baseline.length === 0) return null;

    const recentAvg = {
      temperature: recent.reduce((sum, r) => sum + r.temperature, 0) / recent.length,
      feedIntake: recent.reduce((sum, r) => sum + r.feedIntake, 0) / recent.length
    };

    const baselineAvg = {
      temperature: baseline.reduce((sum, r) => sum + r.temperature, 0) / baseline.length,
      feedIntake: baseline.reduce((sum, r) => sum + r.feedIntake, 0) / baseline.length
    };

    const improvement = {
      temperature: ((baselineAvg.temperature - recentAvg.temperature) / baselineAvg.temperature * 100).toFixed(1),
      feedIntake: ((recentAvg.feedIntake - baselineAvg.feedIntake) / baselineAvg.feedIntake * 100).toFixed(1)
    };

    return {
      period: '7 days',
      baseline: baselineAvg,
      recent: recentAvg,
      improvement,
      status: improvement.feedIntake > 0 && Math.abs(improvement.temperature) < 2 ? 'recovering' : 'monitoring'
    };
  }

  /**
   * Photo-based health assessment (integrates with UC21)
   */
  async assessFromPhoto(animalId, photoData) {
    // This would integrate with UC21 AI detection system
    // For now, return mock assessment
    return {
      animalId,
      confidence: 0.85,
      findings: [
        { type: 'coat_condition', status: 'good', confidence: 0.9 },
        { type: 'eye_clarity', status: 'normal', confidence: 0.8 },
        { type: 'posture', status: 'alert', confidence: 0.85 }
      ],
      overallHealth: 'good',
      recommendations: []
    };
  }

  /**
   * Get animal health summary
   */
  getHealthSummary(animalId) {
    const animal = this.animals.get(animalId);
    const records = this.healthRecords.get(animalId);
    const alerts = this.getHealthAlerts({ animalId, unresolved: true });

    if (!animal) return null;

    return {
      animal: {
        id: animal.id,
        name: animal.name,
        type: animal.type,
        age: animal.age
      },
      currentHealth: animal.health,
      recentRecords: records?.slice(-7) || [],
      activeAlerts: alerts,
      activeMedications: animal.health.medications.filter(m => 
        !m.endDate || m.endDate > Date.now()
      ),
      recovery: this.trackRecovery(animalId)
    };
  }

  /**
   * Update system
   */
  update(deltaTime) {
    // Periodic health checks could be triggered here
    // Check for overdue checkups, medication reminders, etc.
  }
}

export default AnimalHealthSystem;
