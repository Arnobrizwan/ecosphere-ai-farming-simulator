import * as THREE from 'three';

/**
 * Task Automation System - Manages automated farm tasks and workers
 * Tasks are visible actions in 3D world with automated worker bots
 */
export class TaskAutomationSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.tasks = new Map();
    this.workers = [];
    this.taskQueue = [];
    this.completedTasks = [];
    this.taskTemplates = this.initTaskTemplates();
    this.nextTaskId = 1;
    this.smartTaskLinks = new Map();
  }

  /**
   * Initialize common task templates
   */
  initTaskTemplates() {
    return {
      dailyWatering: {
        name: 'Daily Watering',
        icon: '💧',
        type: 'water',
        schedule: { time: '06:00', frequency: 'daily' },
        resourceRequirements: { water: 50 },
        duration: 300 // 5 minutes
      },
      weeklyPlanting: {
        name: 'Weekly Planting',
        icon: '🌱',
        type: 'plant',
        schedule: { day: 'monday', time: '08:00', frequency: 'weekly' },
        resourceRequirements: { seeds: 10 },
        duration: 600
      },
      healthCheck: {
        name: 'Health Check',
        icon: '🔬',
        type: 'scan',
        schedule: { frequency: 'daily', time: '12:00' },
        resourceRequirements: {},
        duration: 180
      },
      smartIrrigation: {
        name: 'Smart Irrigation',
        icon: '💧',
        type: 'water',
        trigger: {
          type: 'soilMoisture',
          threshold: 25,
          checkFrequency: 'hourly'
        },
        resourceRequirements: { water: 30 },
        duration: 240
      }
    };
  }

  /**
   * Create a new task from template or custom config
   */
  createTask(config) {
    const task = {
      id: `task_${this.nextTaskId++}`,
      name: config.name,
      type: config.type,
      icon: config.icon || '⚙️',
      status: 'scheduled', // scheduled, active, paused, completed, failed
      targetPlots: config.targetPlots || [],
      schedule: config.schedule || null,
      trigger: config.trigger || null,
      resourceRequirements: config.resourceRequirements || {},
      duration: config.duration || 300,
      progress: 0,
      assignedWorker: null,
      createdAt: Date.now(),
      nextExecutionTime: this.calculateNextExecution(config.schedule),
      chain: config.chain || null, // For sequential tasks
      priority: config.priority || 'normal'
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task);
    
    return task;
  }

  /**
   * Calculate next execution time for scheduled tasks
   */
  calculateNextExecution(schedule) {
    if (!schedule) return null;
    
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    const nextExec = new Date(now);
    nextExec.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (nextExec <= now) {
      nextExec.setDate(nextExec.getDate() + 1);
    }
    
    return nextExec.getTime();
  }

  /**
   * Assign task to available worker
   */
  assignTaskToWorker(task) {
    const availableWorker = this.workers.find(w => w.status === 'idle');
    
    if (!availableWorker) {
      console.log('No available workers for task:', task.name);
      return false;
    }
    
    task.assignedWorker = availableWorker;
    task.status = 'active';
    availableWorker.assignTask(task);
    
    return true;
  }

  /**
   * Check if task conditions are met
   */
  async checkTaskConditions(task) {
    if (!task.trigger) return true;
    
    switch (task.trigger.type) {
      case 'soilMoisture':
        return await this.checkSoilMoistureTrigger(task);
      case 'rainfall':
        return await this.checkRainfallTrigger(task);
      case 'temperature':
        return await this.checkTemperatureTrigger(task);
      default:
        return true;
    }
  }

  async checkSoilMoistureTrigger(task) {
    // Check NASA SMAP data
    const nasaData = await this.getNASAData();
    
    for (const plot of task.targetPlots) {
      const moisture = plot.userData.soilMoisture || nasaData.smap?.[plot.id] || 50;
      
      if (moisture < task.trigger.threshold) {
        return true; // Condition met
      }
    }
    
    return false;
  }

  async checkRainfallTrigger(task) {
    const nasaData = await this.getNASAData();
    const rainfall = nasaData.imerg?.last7Days || 0;
    
    return rainfall < task.trigger.threshold;
  }

  async checkTemperatureTrigger(task) {
    const nasaData = await this.getNASAData();
    const temp = nasaData.lst?.current || 25;
    
    return temp > task.trigger.threshold;
  }

  async getNASAData() {
    // Mock NASA data - integrate with actual NASA service
    return {
      smap: { plot1: 20, plot2: 35, plot3: 15 },
      imerg: { last7Days: 5 },
      lst: { current: 32 }
    };
  }

  /**
   * Check resource availability
   */
  checkResources(task) {
    const required = task.resourceRequirements;
    const available = this.player.inventory || {};
    
    for (const [resource, amount] of Object.entries(required)) {
      if ((available[resource] || 0) < amount) {
        task.status = 'waiting';
        return {
          success: false,
          missing: resource,
          needed: amount,
          available: available[resource] || 0
        };
      }
    }
    
    return { success: true };
  }

  /**
   * Consume resources for task
   */
  consumeResources(task) {
    const required = task.resourceRequirements;
    
    for (const [resource, amount] of Object.entries(required)) {
      this.player.inventory[resource] -= amount;
    }
  }

  /**
   * Update system (call each frame)
   */
  update(deltaTime) {
    const now = Date.now();
    
    // Check scheduled tasks
    this.taskQueue.forEach(task => {
      if (task.status === 'scheduled' && task.nextExecutionTime && now >= task.nextExecutionTime) {
        this.activateTask(task);
      }
    });
    
    // Check condition-based tasks
    this.taskQueue.forEach(async task => {
      if (task.trigger && task.status === 'scheduled') {
        const conditionMet = await this.checkTaskConditions(task);
        if (conditionMet) {
          this.activateTask(task);
        }
      }
    });
    
    // Update active tasks
    this.tasks.forEach(task => {
      if (task.status === 'active' && task.assignedWorker) {
        // Worker handles execution
        task.progress = task.assignedWorker.getTaskProgress();
      }
    });
    
    // Update workers
    this.workers.forEach(worker => worker.update(deltaTime));
  }

  /**
   * Activate a task
   */
  activateTask(task) {
    // Check resources
    const resourceCheck = this.checkResources(task);
    if (!resourceCheck.success) {
      this.showAlert(`Not enough ${resourceCheck.missing}! Need ${resourceCheck.needed}, have ${resourceCheck.available}`);
      return false;
    }
    
    // Consume resources
    this.consumeResources(task);
    
    // Assign to worker
    const assigned = this.assignTaskToWorker(task);
    
    if (assigned) {
      this.showAlert(`Task activated: ${task.name}`);
      return true;
    }
    
    return false;
  }

  /**
   * Pause a task
   */
  pauseTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'active') {
      task.status = 'paused';
      if (task.assignedWorker) {
        task.assignedWorker.pauseTask();
      }
    }
  }

  /**
   * Resume a task
   */
  resumeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'active';
      if (task.assignedWorker) {
        task.assignedWorker.resumeTask();
      }
    }
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      if (task.assignedWorker) {
        task.assignedWorker.cancelTask();
      }
      
      this.tasks.delete(taskId);
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
    }
  }

  /**
   * Complete a task
   */
  completeTask(task) {
    task.status = 'completed';
    task.progress = 100;
    task.completedAt = Date.now();
    
    this.completedTasks.push(task);
    this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
    
    // Handle task chains
    if (task.chain && task.chain.next) {
      this.createTask(task.chain.next);
    }
    
    // Reschedule if recurring
    if (task.schedule && task.schedule.frequency) {
      const newTask = this.createTask({
        ...task,
        id: undefined // Generate new ID
      });
      newTask.nextExecutionTime = this.calculateNextExecution(task.schedule);
    }
  }

  /**
   * Get task statistics
   */
  getStatistics() {
    return {
      total: this.tasks.size,
      completed: this.completedTasks.length,
      active: Array.from(this.tasks.values()).filter(t => t.status === 'active').length,
      scheduled: Array.from(this.tasks.values()).filter(t => t.status === 'scheduled').length,
      failed: Array.from(this.tasks.values()).filter(t => t.status === 'failed').length,
      efficiency: this.calculateEfficiency()
    };
  }

  calculateEfficiency() {
    if (this.completedTasks.length === 0) return 0;
    
    const successfulTasks = this.completedTasks.filter(t => t.status === 'completed').length;
    return Math.round((successfulTasks / this.completedTasks.length) * 100);
  }

  showAlert(message) {
    // Integrate with game UI system
    console.log(`[TASK ALERT] ${message}`);
  }

  /**
   * Add worker to system
   */
  addWorker(worker) {
    this.workers.push(worker);
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get active tasks
   */
  getActiveTasks() {
    return Array.from(this.tasks.values()).filter(t => t.status === 'active');
  }

  /**
   * Synchronise smart task definitions from Firestore/SmartTaskService
   * @param {Array} smartTasks - raw smart task documents
   * @param {Object} options - config { mapper }
   */
  syncSmartTasks(smartTasks = [], options = {}) {
    if (!Array.isArray(smartTasks)) {
      return;
    }

    const { mapper } = options;
    const nextLinks = new Map();

    smartTasks.forEach((smartTask) => {
      try {
        const automationConfig = mapper ? mapper(smartTask) : smartTask?.automation;
        if (!automationConfig || !automationConfig.name) {
          return;
        }

        const smartId = smartTask.id || automationConfig.smartTaskId;
        if (!smartId) {
          return;
        }

        const existingTaskId = this.smartTaskLinks.get(smartId);
        let taskInstance = existingTaskId ? this.tasks.get(existingTaskId) : null;

        if (!taskInstance) {
          const created = this.createTask({
            ...automationConfig,
            chain: automationConfig.chain || null,
          });
          taskInstance = created;
        } else {
          this.updateTaskFromAutomation(taskInstance, automationConfig);
        }

        taskInstance.smartTaskId = smartId;
        nextLinks.set(smartId, taskInstance.id);
        this.applySmartTaskStatus(taskInstance, smartTask);
      } catch (error) {
        console.error('Failed to sync smart task', error);
      }
    });

    // Cancel tasks that no longer exist in smart tasks list
    this.smartTaskLinks.forEach((taskId, smartId) => {
      if (!nextLinks.has(smartId)) {
        this.cancelTask(taskId);
      }
    });

    this.smartTaskLinks = nextLinks;
  }

  updateTaskFromAutomation(task, automation = {}) {
    if (!task || !automation) {
      return;
    }

    task.name = automation.name || task.name;
    task.type = automation.type || task.type;
    task.icon = automation.icon || task.icon || '⚙️';
    task.targetPlots = automation.targetPlots || [];
    task.schedule = automation.schedule || null;
    task.trigger = automation.trigger || null;
    task.resourceRequirements = automation.resourceRequirements || {};
    task.duration = automation.duration || task.duration;
    task.priority = automation.priority || task.priority || 'normal';
  }

  applySmartTaskStatus(task, smartTask = {}) {
    if (!task) {
      return;
    }

    const manualOverride = smartTask.manualOverride;
    if (manualOverride?.active) {
      task.waitReason = manualOverride.reason || 'Manual override';
      this.pauseTask(task.id);
      task.status = 'paused';
      return;
    }

    const status = smartTask.status || 'scheduled';

    switch (status) {
      case 'active':
        if (task.status !== 'active') {
          this.activateTask(task);
        }
        break;
      case 'paused':
        this.pauseTask(task.id);
        break;
      case 'waiting':
        task.status = 'waiting';
        task.waitReason = smartTask.waitReason || 'Awaiting resources';
        break;
      case 'completed':
        task.status = 'completed';
        task.progress = 100;
        break;
      default:
        task.status = 'scheduled';
        break;
    }
  }
}

export default TaskAutomationSystem;
