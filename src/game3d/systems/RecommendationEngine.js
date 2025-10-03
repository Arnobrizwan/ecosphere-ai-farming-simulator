/**
 * Recommendation Engine - AI-powered farming recommendations
 * Analyzes farm data, NASA satellite info, and player behavior to generate actionable quests
 */
export class RecommendationEngine {
  constructor() {
    this.recommendations = [];
    this.completedRecommendations = [];
    this.playerProfile = null;
    this.confidenceScores = {};
  }

  /**
   * Generate recommendations based on current farm state
   */
  async generateRecommendations(farmState, playerProfile) {
    this.playerProfile = playerProfile;
    
    // Gather all context
    const context = {
      plots: farmState.plots.map(p => ({
        id: p.id,
        crop: p.userData?.crop,
        health: p.userData?.cropHealth || 100,
        soilMoisture: p.userData?.soilMoisture || 50,
        lastWatered: p.userData?.lastWatered,
        plantedDate: p.userData?.plantedDate,
        position: p.position
      })),
      nasaData: await this.getNASAData(farmState.location),
      weather: await this.getWeatherForecast(farmState.location),
      inventory: playerProfile.inventory || {},
      season: this.getCurrentSeason(),
      playerLevel: playerProfile.level || 1,
      completedMissions: playerProfile.completedMissions || []
    };
    
    // Generate recommendations
    const recommendations = [];
    recommendations.push(...this.checkCriticalIssues(context));
    recommendations.push(...this.findOptimizations(context));
    recommendations.push(...this.identifyGrowthOpportunities(context));
    recommendations.push(...this.suggestPreventiveActions(context));
    
    // Rank by priority
    const ranked = this.rankRecommendations(recommendations);
    
    // Store top 5
    this.recommendations = ranked.slice(0, 5);
    
    return this.recommendations;
  }

  /**
   * Check for critical issues requiring immediate action
   */
  checkCriticalIssues(context) {
    const critical = [];
    
    // Drought risk
    const avgMoisture = context.plots.reduce((sum, p) => sum + p.soilMoisture, 0) / context.plots.length;
    if (avgMoisture < 20 && context.nasaData.imerg.last7DaysRain < 5) {
      const dryPlots = context.plots.filter(p => p.soilMoisture < 25);
      
      critical.push({
        id: `critical_drought_${Date.now()}`,
        priority: 'CRITICAL',
        type: 'irrigation',
        title: 'Drought Alert: Immediate Irrigation Needed',
        description: `Soil moisture at ${Math.round(avgMoisture)}%. No rain forecast for 5 days.`,
        reasoning: `NASA SMAP shows critically low soil moisture. IMERG data indicates no rainfall in past week. Your crops are at risk of severe stress.`,
        actions: [
          { type: 'water', plots: dryPlots.map(p => p.id), immediate: true },
          { type: 'schedule', task: 'daily_watering', duration: 7 }
        ],
        locations: dryPlots.map(p => p.position),
        reward: { xp: 100, coinsSaved: 50 },
        deadline: 24, // hours
        impact: 'Prevent 30% yield loss'
      });
    }
    
    // Disease outbreak risk
    if (context.weather.humidity > 80 && 
        context.weather.temp > 25 && 
        context.weather.temp < 32) {
      critical.push({
        id: `critical_disease_${Date.now()}`,
        priority: 'HIGH',
        type: 'disease_prevention',
        title: 'High Disease Risk Detected',
        description: 'Conditions favor fungal diseases. Preventive action recommended.',
        reasoning: `Temperature ${Math.round(context.weather.temp)}°C and humidity ${Math.round(context.weather.humidity)}% create ideal conditions for fungal growth.`,
        actions: [
          { type: 'scan_crops', plots: 'all' },
          { type: 'apply_fungicide', ifNeeded: true }
        ],
        locations: context.plots.map(p => p.position),
        reward: { xp: 150 },
        deadline: 48,
        impact: 'Prevent disease outbreak'
      });
    }
    
    // Crop stress
    context.plots.forEach(plot => {
      if (plot.health < 50 && plot.crop) {
        critical.push({
          id: `critical_stress_${plot.id}_${Date.now()}`,
          priority: 'HIGH',
          type: 'crop_rescue',
          title: `Plot ${plot.id}: Crop Stress Detected`,
          description: `Plant health at ${plot.health}%. Investigate immediately.`,
          reasoning: `NDVI analysis shows significant vegetation stress. Possible causes: water stress, nutrient deficiency, or disease.`,
          actions: [
            { type: 'scan', plot: plot.id },
            { type: 'diagnose', expected: 'nutrient_deficiency' }
          ],
          locations: [plot.position],
          reward: { xp: 80 },
          deadline: 12,
          impact: 'Save crop from failure'
        });
      }
    });
    
    return critical;
  }

  /**
   * Find optimization opportunities
   */
  findOptimizations(context) {
    const optimizations = [];
    
    // Water efficiency
    const overwatering = context.plots.filter(p => p.soilMoisture > 70);
    if (overwatering.length > 0) {
      optimizations.push({
        id: `opt_water_${Date.now()}`,
        priority: 'MEDIUM',
        type: 'efficiency',
        title: 'Water Efficiency Opportunity',
        description: `${overwatering.length} plots are overwatered. You could save 30L/day.`,
        reasoning: `Soil moisture above 70% is excessive for most crops. Reducing irrigation will save water without affecting yield.`,
        actions: [
          { type: 'adjust_irrigation', plots: overwatering.map(p => p.id), reduce: 30 }
        ],
        locations: overwatering.map(p => p.position),
        benefit: 'Save 210L water per week',
        reward: { xp: 60, coins: 25 },
        impact: 'Reduce water costs by 40%'
      });
    }
    
    // Harvest timing
    context.plots.forEach(plot => {
      if (plot.crop && this.isHarvestReady(plot, context)) {
        optimizations.push({
          id: `opt_harvest_${plot.id}_${Date.now()}`,
          priority: 'MEDIUM',
          type: 'harvest',
          title: `Plot ${plot.id}: Optimal Harvest Window`,
          description: `${plot.crop} has reached peak maturity. Harvest within 2 days for best yield.`,
          reasoning: `NDVI readings indicate peak vegetation health. Delaying harvest may reduce quality and yield.`,
          actions: [
            { type: 'harvest', plot: plot.id, deadline: 48 }
          ],
          locations: [plot.position],
          reward: { xp: 100, yieldBonus: 1.2 },
          deadline: 48,
          impact: '+20% yield bonus'
        });
      }
    });
    
    return optimizations;
  }

  /**
   * Identify growth opportunities
   */
  identifyGrowthOpportunities(context) {
    const opportunities = [];
    
    // Empty plots
    const emptyPlots = context.plots.filter(p => !p.crop);
    if (emptyPlots.length > 0 && this.isPlantingSeason(context.season)) {
      const suggestedCrops = this.recommendCrops(context);
      
      opportunities.push({
        id: `growth_expand_${Date.now()}`,
        priority: 'LOW',
        type: 'expansion',
        title: 'Expand Your Farm',
        description: `You have ${emptyPlots.length} unused plots. Optimal conditions for planting.`,
        reasoning: `Current season and weather conditions are ideal for ${suggestedCrops[0]}. Empty plots represent lost revenue opportunity.`,
        actions: [
          { type: 'suggest_crops', plots: emptyPlots.map(p => p.id) },
          { type: 'plant', suggested: suggestedCrops }
        ],
        locations: emptyPlots.map(p => p.position),
        benefit: 'Potential +40% revenue',
        reward: { xp: 120 },
        impact: 'Maximize farm productivity'
      });
    }
    
    // Crop diversification
    const uniqueCrops = new Set(context.plots.filter(p => p.crop).map(p => p.crop)).size;
    if (uniqueCrops === 1 && context.plots.length > 3) {
      opportunities.push({
        id: `growth_diversify_${Date.now()}`,
        priority: 'LOW',
        type: 'strategy',
        title: 'Diversify Your Crops',
        description: 'Growing only one crop type increases risk. Consider diversification.',
        reasoning: `Monoculture increases vulnerability to diseases and market fluctuations. Crop rotation improves soil health.`,
        actions: [
          { type: 'learn', topic: 'crop_rotation' },
          { type: 'plant_different', nextPlot: true }
        ],
        locations: [],
        benefit: 'Reduce disease risk, improve soil health',
        reward: { xp: 80 },
        impact: 'Long-term sustainability'
      });
    }
    
    return opportunities;
  }

  /**
   * Suggest preventive actions
   */
  suggestPreventiveActions(context) {
    const preventive = [];
    
    // Upcoming weather events
    if (context.weather.forecast && context.weather.forecast.includes('heavy_rain')) {
      preventive.push({
        id: `prev_rain_${Date.now()}`,
        priority: 'MEDIUM',
        type: 'preparation',
        title: 'Prepare for Heavy Rain',
        description: 'Heavy rainfall expected in 2 days. Ensure proper drainage.',
        reasoning: `IMERG forecast shows 50mm+ rainfall. Poor drainage can cause waterlogging and root rot.`,
        actions: [
          { type: 'check_drainage', plots: 'all' },
          { type: 'reduce_irrigation', days: 3 }
        ],
        locations: context.plots.map(p => p.position),
        reward: { xp: 70 },
        deadline: 48,
        impact: 'Prevent waterlogging damage'
      });
    }
    
    return preventive;
  }

  /**
   * Rank recommendations by priority and impact
   */
  rankRecommendations(recommendations) {
    return recommendations.sort((a, b) => {
      const priorityWeight = {
        CRITICAL: 1000,
        HIGH: 100,
        MEDIUM: 10,
        LOW: 1
      };
      
      const urgencyWeight = a.deadline ? (1 / a.deadline) * 100 : 0;
      const impactWeight = (a.reward?.xp || 0) + (a.reward?.coins || 0);
      const effortPenalty = a.actions.length * 5;
      
      const scoreA = priorityWeight[a.priority] + urgencyWeight + impactWeight - effortPenalty;
      const scoreB = priorityWeight[b.priority] + (b.deadline ? (1 / b.deadline) * 100 : 0) + 
                     ((b.reward?.xp || 0) + (b.reward?.coins || 0)) - (b.actions.length * 5);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Get NASA data (mock for now)
   */
  async getNASAData(location) {
    return {
      smap: {
        avgMoisture: 35,
        values: [30, 35, 40, 32, 38]
      },
      imerg: {
        last7DaysRain: 12,
        forecast: []
      },
      ndvi: {
        avg: 0.6,
        values: [0.5, 0.6, 0.7, 0.6, 0.65]
      },
      lst: {
        current: 28,
        forecast: [29, 30, 31, 28, 27]
      }
    };
  }

  /**
   * Get weather forecast (mock)
   */
  async getWeatherForecast(location) {
    return {
      temp: 28,
      humidity: 65,
      windSpeed: 10,
      forecast: []
    };
  }

  /**
   * Get current season
   */
  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Check if harvest is ready
   */
  isHarvestReady(plot, context) {
    if (!plot.plantedDate) return false;
    
    const daysSincePlanting = (Date.now() - plot.plantedDate) / (1000 * 60 * 60 * 24);
    const maturityDays = { rice: 120, wheat: 90, corn: 100 };
    
    return daysSincePlanting >= (maturityDays[plot.crop] || 90) * 0.9;
  }

  /**
   * Check if it's planting season
   */
  isPlantingSeason(season) {
    return season === 'spring' || season === 'fall';
  }

  /**
   * Recommend crops based on context
   */
  recommendCrops(context) {
    const seasonalCrops = {
      spring: ['rice', 'corn', 'wheat'],
      summer: ['rice', 'vegetables'],
      fall: ['wheat', 'barley'],
      winter: ['wheat']
    };
    
    return seasonalCrops[context.season] || ['rice'];
  }

  /**
   * Track recommendation outcome
   */
  trackOutcome(recommendationId, outcome) {
    const rec = this.recommendations.find(r => r.id === recommendationId);
    if (!rec) return;
    
    rec.outcome = outcome;
    rec.completedAt = Date.now();
    
    this.completedRecommendations.push(rec);
    
    // Update confidence scores
    if (outcome.success) {
      this.confidenceScores[rec.type] = (this.confidenceScores[rec.type] || 0.5) + 0.1;
    }
  }

  /**
   * Get recommendation by ID
   */
  getRecommendation(id) {
    return this.recommendations.find(r => r.id === id);
  }

  /**
   * Remove recommendation
   */
  removeRecommendation(id) {
    this.recommendations = this.recommendations.filter(r => r.id !== id);
  }
}

export default RecommendationEngine;
