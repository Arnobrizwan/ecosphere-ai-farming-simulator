/**
 * Feed Planning System (UC58)
 * Optimize feed composition and scheduling based on weather and pasture conditions
 */
export class FeedPlanningSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.feedPlans = new Map();
    this.inventory = new Map();
    this.consumptionHistory = [];
  }

  /**
   * Generate feed plan for animals
   */
  generateFeedPlan(config) {
    const plan = {
      id: `plan_${Date.now()}`,
      animalType: config.animalType,
      animalCount: config.count,
      schedule: [],
      composition: this.calculateComposition(config),
      requirements: this.calculateRequirements(config),
      cost: 0,
      startDate: config.startDate || Date.now(),
      duration: config.duration || 30, // days
      createdAt: Date.now()
    };

    // Generate daily schedule
    plan.schedule = this.generateSchedule(plan);
    
    // Calculate total cost
    plan.cost = this.calculateCost(plan);

    this.feedPlans.set(plan.id, plan);

    return plan;
  }

  /**
   * Calculate feed composition based on conditions
   */
  calculateComposition(config) {
    const { animalType, count, pastureQuality = 0.7, weatherConditions = 'normal' } = config;

    // Base nutritional requirements (% of total)
    const baseComposition = this.getBaseComposition(animalType);

    // Adjust for pasture quality
    let pasturePercent = baseComposition.pasture * pastureQuality;
    const supplementNeeded = baseComposition.pasture - pasturePercent;

    // Adjust for weather
    if (weatherConditions === 'dry' || weatherConditions === 'drought') {
      pasturePercent *= 0.7; // Less pasture available
    } else if (weatherConditions === 'wet') {
      pasturePercent *= 1.1; // Better pasture growth
    }

    return {
      pasture: Math.round(pasturePercent * 100) / 100,
      hay: baseComposition.hay + supplementNeeded * 0.6,
      grain: baseComposition.grain + supplementNeeded * 0.3,
      supplements: baseComposition.supplements + supplementNeeded * 0.1,
      total: 1.0
    };
  }

  /**
   * Get base composition for animal type
   */
  getBaseComposition(animalType) {
    const compositions = {
      cattle: {
        pasture: 0.70,
        hay: 0.20,
        grain: 0.08,
        supplements: 0.02
      },
      sheep: {
        pasture: 0.75,
        hay: 0.18,
        grain: 0.05,
        supplements: 0.02
      },
      goat: {
        pasture: 0.65,
        hay: 0.25,
        grain: 0.08,
        supplements: 0.02
      },
      chicken: {
        pasture: 0.10,
        hay: 0.00,
        grain: 0.85,
        supplements: 0.05
      }
    };

    return compositions[animalType] || compositions.cattle;
  }

  /**
   * Calculate nutritional requirements
   */
  calculateRequirements(config) {
    const { animalType, count } = config;

    // Daily intake per animal (kg)
    const dailyIntake = {
      cattle: 18,
      sheep: 2.5,
      goat: 3,
      chicken: 0.12
    };

    const perAnimal = dailyIntake[animalType] || 10;
    const daily = perAnimal * count;

    return {
      perAnimal,
      daily,
      weekly: daily * 7,
      monthly: daily * 30
    };
  }

  /**
   * Generate feeding schedule
   */
  generateSchedule(plan) {
    const schedule = [];
    const startDate = plan.startDate;

    for (let day = 0; day < plan.duration; day++) {
      const date = startDate + (day * 24 * 60 * 60 * 1000);

      schedule.push({
        date,
        day: day + 1,
        morning: {
          time: '06:00',
          amount: plan.requirements.daily * 0.4,
          composition: plan.composition
        },
        afternoon: {
          time: '14:00',
          amount: plan.requirements.daily * 0.3,
          composition: plan.composition
        },
        evening: {
          time: '18:00',
          amount: plan.requirements.daily * 0.3,
          composition: plan.composition
        },
        totalAmount: plan.requirements.daily
      });
    }

    return schedule;
  }

  /**
   * Calculate feed cost
   */
  calculateCost(plan) {
    // Price per kg
    const prices = {
      pasture: 0, // Free grazing
      hay: 0.30,
      grain: 0.50,
      supplements: 2.00
    };

    const totalDaily = plan.requirements.daily;
    const composition = plan.composition;

    const dailyCost = 
      (totalDaily * composition.hay * prices.hay) +
      (totalDaily * composition.grain * prices.grain) +
      (totalDaily * composition.supplements * prices.supplements);

    return {
      daily: dailyCost,
      weekly: dailyCost * 7,
      monthly: dailyCost * 30,
      total: dailyCost * plan.duration
    };
  }

  /**
   * Track feed consumption
   */
  trackConsumption(animalId, amount, feedType) {
    const record = {
      timestamp: Date.now(),
      animalId,
      amount,
      feedType
    };

    this.consumptionHistory.push(record);

    // Update inventory
    this.updateInventory(feedType, -amount);

    // Keep last 90 days
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
    this.consumptionHistory = this.consumptionHistory.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Update feed inventory
   */
  updateInventory(feedType, amount) {
    const current = this.inventory.get(feedType) || 0;
    const newAmount = Math.max(0, current + amount);
    this.inventory.set(feedType, newAmount);

    // Check for low inventory
    if (newAmount < this.getMinimumStock(feedType)) {
      this.triggerLowInventoryAlert(feedType, newAmount);
    }
  }

  /**
   * Get minimum stock level
   */
  getMinimumStock(feedType) {
    const minimums = {
      hay: 500,      // kg
      grain: 300,    // kg
      supplements: 50 // kg
    };
    return minimums[feedType] || 100;
  }

  /**
   * Trigger low inventory alert
   */
  triggerLowInventoryAlert(feedType, currentAmount) {
    console.log(`[FEED ALERT] Low ${feedType} inventory: ${currentAmount}kg`);

    if (this.hub.player.alertSystem) {
      this.hub.player.alertSystem.createAlert({
        type: 'feed_inventory',
        severity: 'medium',
        title: `Low ${feedType} Stock`,
        message: `Only ${currentAmount}kg of ${feedType} remaining. Reorder recommended.`,
        action: 'order_feed'
      });
    }
  }

  /**
   * Adjust plan based on conditions
   */
  adjustPlan(planId, adjustments) {
    const plan = this.feedPlans.get(planId);
    if (!plan) return null;

    // Adjust composition if pasture quality changed
    if (adjustments.pastureQuality !== undefined) {
      plan.composition = this.calculateComposition({
        animalType: plan.animalType,
        count: plan.animalCount,
        pastureQuality: adjustments.pastureQuality,
        weatherConditions: adjustments.weatherConditions
      });
    }

    // Adjust for animal count change
    if (adjustments.animalCount !== undefined) {
      plan.animalCount = adjustments.animalCount;
      plan.requirements = this.calculateRequirements({
        animalType: plan.animalType,
        count: adjustments.animalCount
      });
    }

    // Recalculate schedule and cost
    plan.schedule = this.generateSchedule(plan);
    plan.cost = this.calculateCost(plan);
    plan.lastAdjusted = Date.now();

    return plan;
  }

  /**
   * Get purchasing recommendations
   */
  getPurchasingRecommendations() {
    const recommendations = [];

    this.inventory.forEach((amount, feedType) => {
      const minimum = this.getMinimumStock(feedType);
      const optimal = minimum * 2;

      if (amount < optimal) {
        const needed = optimal - amount;
        const cost = this.estimateCost(feedType, needed);

        recommendations.push({
          feedType,
          currentStock: amount,
          recommendedOrder: needed,
          estimatedCost: cost,
          urgency: amount < minimum ? 'high' : 'medium',
          daysRemaining: this.estimateDaysRemaining(feedType, amount)
        });
      }
    });

    return recommendations.sort((a, b) => 
      (a.urgency === 'high' ? 0 : 1) - (b.urgency === 'high' ? 0 : 1)
    );
  }

  /**
   * Estimate cost for feed purchase
   */
  estimateCost(feedType, amount) {
    const prices = {
      hay: 0.30,
      grain: 0.50,
      supplements: 2.00
    };

    return (prices[feedType] || 0.40) * amount;
  }

  /**
   * Estimate days remaining for feed type
   */
  estimateDaysRemaining(feedType, currentAmount) {
    // Calculate average daily consumption
    const recentConsumption = this.consumptionHistory
      .filter(r => r.feedType === feedType)
      .slice(-7);

    if (recentConsumption.length === 0) return 30; // Default estimate

    const avgDaily = recentConsumption.reduce((sum, r) => sum + r.amount, 0) / recentConsumption.length;

    return avgDaily > 0 ? Math.floor(currentAmount / avgDaily) : 30;
  }

  /**
   * Get feed plan
   */
  getFeedPlan(planId) {
    return this.feedPlans.get(planId);
  }

  /**
   * Get all active plans
   */
  getActivePlans() {
    const now = Date.now();
    return Array.from(this.feedPlans.values()).filter(plan => {
      const endDate = plan.startDate + (plan.duration * 24 * 60 * 60 * 1000);
      return now >= plan.startDate && now <= endDate;
    });
  }

  /**
   * Get total feed cost
   */
  getTotalCost() {
    return this.getActivePlans().reduce((sum, plan) => sum + plan.cost.daily, 0);
  }

  /**
   * Integrate with UC56 (Pasture Health)
   */
  updateFromPastureHealth(pastureId) {
    if (!this.hub.pastureSystem) return;

    const pastureHealth = this.hub.pastureSystem.getPastureHealth(pastureId);
    if (!pastureHealth) return;

    // Adjust plans based on pasture quality
    const pastureQuality = pastureHealth.ndvi;

    this.getActivePlans().forEach(plan => {
      this.adjustPlan(plan.id, { pastureQuality });
    });
  }

  /**
   * Integrate with UC15 (Weather)
   */
  updateFromWeather(weatherData) {
    const weatherConditions = this.assessWeatherConditions(weatherData);

    this.getActivePlans().forEach(plan => {
      this.adjustPlan(plan.id, { weatherConditions });
    });
  }

  /**
   * Assess weather conditions
   */
  assessWeatherConditions(weatherData) {
    if (weatherData.rainfall < 5) return 'dry';
    if (weatherData.rainfall < 2) return 'drought';
    if (weatherData.rainfall > 50) return 'wet';
    return 'normal';
  }

  /**
   * Update system
   */
  update(deltaTime) {
    // Check for scheduled feedings
    // Update inventory based on consumption
    // Generate alerts for low stock
  }
}

export default FeedPlanningSystem;
