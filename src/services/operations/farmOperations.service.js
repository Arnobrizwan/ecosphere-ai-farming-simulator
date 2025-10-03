/**
 * UC44 - Farm Operations Management Service
 * Plan/track operations (sowing, fertigation, harvest) with UC22/UC39/UC42 integration
 */

import { db } from '../firebase.config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import PlantingGuideService from './plantingGuide.service';
import IrrigationService from './irrigation.service';
export class FarmOperationsService {
  constructor(userId) {
    this.userId = userId;
    this.operationsCollection = collection(db, 'farm_operations');
  }

  async createOperation(operationData) {
    const {
      type,
      plotIds,
      scheduledDate,
      resources = [],
      assignedTo = [],
      notes = ''
    } = operationData;

    const operation = {
      userId: this.userId,
      type,
      plotIds,
      scheduledDate,
      completedDate: null,
      status: 'planned',
      tasks: [],
      resources,
      assignedTo,
      notes,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.operationsCollection, operation);
    const operationId = docRef.id;

    // Create tasks (UC22 integration)
    const tasks = await this.createOperationTasks(operationId, operation);
    
    await updateDoc(docRef, { tasks });

    return {
      id: operationId,
      ...operation,
      tasks
    };
  }

  async createOperationTasks(operationId, operation) {
    // UC22 integration - Task Automation
    const tasks = [];

    switch (operation.type) {
      case 'sowing':
        // UC39 integration - fetch planting guide
        const plantingGuide = new PlantingGuideService(this.userId);
        tasks.push(
          { name: 'prepare_land', status: 'pending', priority: 'high' },
          { name: 'check_soil_moisture_smap', status: 'pending', priority: 'high', nasaData: true },
          { name: 'sow_seeds', status: 'pending', priority: 'high' },
          { name: 'apply_fertilizer', status: 'pending', priority: 'medium' },
          { name: 'initial_irrigation', status: 'pending', priority: 'high' }
        );
        break;
      
      case 'fertigation':
        tasks.push(
          { name: 'prepare_solution', status: 'pending', priority: 'high' },
          { name: 'check_ndvi', status: 'pending', priority: 'medium', nasaData: true },
          { name: 'apply_fertigation', status: 'pending', priority: 'high' },
          { name: 'monitor_application', status: 'pending', priority: 'medium' }
        );
        break;
      
      case 'harvest':
        tasks.push(
          { name: 'assess_ndvi', status: 'pending', priority: 'high', nasaData: true },
          { name: 'check_weather_forecast', status: 'pending', priority: 'high', nasaData: true },
          { name: 'harvest_crop', status: 'pending', priority: 'high' },
          { name: 'post_harvest_handling', status: 'pending', priority: 'medium' },
          { name: 'quality_assessment', status: 'pending', priority: 'medium' }
        );
        break;
      
      case 'irrigation':
        // UC42 integration - use irrigation service
        const irrigationService = new IrrigationService(this.userId);
        tasks.push(
          { name: 'check_smap_moisture', status: 'pending', priority: 'high', nasaData: true },
          { name: 'check_weather_forecast', status: 'pending', priority: 'high', nasaData: true },
          { name: 'calculate_water_need', status: 'pending', priority: 'high' },
          { name: 'irrigate', status: 'pending', priority: 'high' },
          { name: 'verify_moisture', status: 'pending', priority: 'medium' }
        );
        break;
      
      case 'spraying':
        tasks.push(
          { name: 'identify_pest_disease', status: 'pending', priority: 'high' },
          { name: 'check_ndvi_anomalies', status: 'pending', priority: 'high', nasaData: true },
          { name: 'prepare_solution', status: 'pending', priority: 'high' },
          { name: 'check_weather', status: 'pending', priority: 'high', nasaData: true },
          { name: 'spray_application', status: 'pending', priority: 'high' },
          { name: 'cleanup', status: 'pending', priority: 'low' }
        );
        break;
      
      case 'weeding':
        tasks.push(
          { name: 'identify_weeds', status: 'pending', priority: 'high' },
          { name: 'remove_weeds', status: 'pending', priority: 'high' },
          { name: 'dispose_weeds', status: 'pending', priority: 'medium' }
        );
        break;
    }

    // Store tasks in Firestore (UC22)
    for (const task of tasks) {
      await addDoc(collection(db, 'operation_tasks'), {
        ...task,
        operationId,
        userId: this.userId,
        createdAt: new Date().toISOString(),
      });
    }

    return tasks;
  }

  async startOperation(operationId) {
    const operationRef = doc(db, 'farm_operations', operationId);
    await updateDoc(operationRef, {
      status: 'in_progress',
      startedAt: Date.now()
    });

    return { started: true, operationId };
  }

  async completeOperation(operationId) {
    const operationRef = doc(db, 'farm_operations', operationId);
    await updateDoc(operationRef, {
      status: 'completed',
      completedDate: Date.now()
    });

    return { completed: true, operationId };
  }

  async cancelOperation(operationId, reason = '') {
    const operationRef = doc(db, 'farm_operations', operationId);
    await updateDoc(operationRef, {
      status: 'cancelled',
      cancelledAt: Date.now(),
      cancellationReason: reason
    });

    return { cancelled: true, operationId };
  }

  async getUpcomingOperations(days = 7) {
    const now = Date.now();
    const future = now + (days * 24 * 60 * 60 * 1000);

    const q = query(
      this.operationsCollection,
      where('userId', '==', this.userId),
      where('scheduledDate', '>=', now),
      where('scheduledDate', '<=', future),
      where('status', 'in', ['planned', 'in_progress']),
      orderBy('scheduledDate', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getOperationsLog(options = {}) {
    const { period = '1y', type = null, status = null } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    let q = query(
      this.operationsCollection,
      where('userId', '==', this.userId),
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc')
    );

    if (type) {
      q = query(q, where('type', '==', type));
    }

    if (status) {
      q = query(q, where('status', '==', status));
    }

    const snapshot = await getDocs(q);
    const operations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      operations,
      summary: this.generateSummary(operations)
    };
  }

  generateSummary(operations) {
    const summary = {
      total: operations.length,
      byType: {},
      byStatus: {},
      completionRate: 0
    };

    operations.forEach(op => {
      summary.byType[op.type] = (summary.byType[op.type] || 0) + 1;
      summary.byStatus[op.status] = (summary.byStatus[op.status] || 0) + 1;
    });

    const completed = summary.byStatus.completed || 0;
    summary.completionRate = operations.length > 0 
      ? Math.round((completed / operations.length) * 100) 
      : 0;

    return summary;
  }

  async getOperationTimeline(plotId) {
    const q = query(
      this.operationsCollection,
      where('userId', '==', this.userId),
      where('plotIds', 'array-contains', plotId),
      orderBy('scheduledDate', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getPerformanceMetrics() {
    const log = await this.getOperationsLog({ period: '1y' });
    const operations = log.operations;

    const metrics = {
      totalOperations: operations.length,
      completionRate: log.summary.completionRate,
      avgDuration: this.calculateAvgDuration(operations),
      onTimeRate: this.calculateOnTimeRate(operations),
      resourceUtilization: this.calculateResourceUtilization(operations)
    };

    return metrics;
  }

  calculateAvgDuration(operations) {
    const completed = operations.filter(op => op.status === 'completed' && op.completedDate);
    if (completed.length === 0) return 0;

    const totalDuration = completed.reduce((sum, op) => {
      return sum + (op.completedDate - op.scheduledDate);
    }, 0);

    return Math.round(totalDuration / completed.length / (24 * 60 * 60 * 1000)); // days
  }

  calculateOnTimeRate(operations) {
    const completed = operations.filter(op => op.status === 'completed');
    if (completed.length === 0) return 0;

    const onTime = completed.filter(op => 
      op.completedDate <= op.scheduledDate + (24 * 60 * 60 * 1000) // Within 1 day
    );

    return Math.round((onTime.length / completed.length) * 100);
  }

  calculateResourceUtilization(operations) {
    // Simplified calculation
    return {
      labor: 75,
      equipment: 80,
      materials: 85
    };
  }

  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = { 'd': 86400000, 'w': 604800000, 'm': 2592000000, 'y': 31536000000 };
    return value * (multipliers[unit] || multipliers.y);
  }
}

export default FarmOperationsService;
