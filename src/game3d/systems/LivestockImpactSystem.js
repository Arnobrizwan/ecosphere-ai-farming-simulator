/**
 * Livestock Impact System (UC62)
 * Calculate environmental and economic impact of livestock operations
 */
export class LivestockImpactSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.impactHistory = [];
    this.benchmarks = this.initializeBenchmarks();
  }

  /**
   * Initialize sustainability benchmarks
   */
  initializeBenchmarks() {
    return {
      cattle: {
        carbonFootprint: 2500, // kg CO2e per animal per year
        methaneEmissions: 100,  // kg CH4 per animal per year
        landUse: 2.0,           // hectares per animal
        waterUse: 50,           // liters per day per animal
        feedConversion: 6.0,    // kg feed per kg weight gain
        reproductionRate: 0.85  // calves per cow per year
      },
      sheep: {
        carbonFootprint: 500,
        methaneEmissions: 20,
        landUse: 0.5,
        waterUse: 8,
        feedConversion: 5.0,
        reproductionRate: 1.2
      },
      goat: {
        carbonFootprint: 400,
        methaneEmissions: 15,
        landUse: 0.4,
        waterUse: 6,
        feedConversion: 4.5,
        reproductionRate: 1.5
      },
      chicken: {
        carbonFootprint: 10,
        methaneEmissions: 0.1,
        landUse: 0.001,
        waterUse: 0.3,
        feedConversion: 2.0,
        reproductionRate: 15
      }
    };
  }

  /**
   * Calculate carbon footprint
   */
  calculateCarbonFootprint() {
    let totalCO2e = 0;

    this.hub.getAllAnimals().forEach(animal => {
      const benchmark = this.benchmarks[animal.type];
      if (!benchmark) return;

      // Base emissions
      const baseEmissions = benchmark.carbonFootprint;

      // Adjust for feed type
      const feedAdjustment = this.getFeedCarbonAdjustment(animal);

      // Adjust for management practices
      const managementAdjustment = this.getManagementAdjustment(animal);

      const animalFootprint = baseEmissions * feedAdjustment * managementAdjustment;
      totalCO2e += animalFootprint;
    });

    return {
      total: Math.round(totalCO2e),
      perAnimal: Math.round(totalCO2e / Math.max(this.hub.getAllAnimals().length, 1)),
      unit: 'kg CO2e/year'
    };
  }

  /**
   * Get feed carbon adjustment
   */
  getFeedCarbonAdjustment(animal) {
    // Pasture-based feeding has lower carbon footprint
    if (this.hub.feedSystem) {
      const plans = this.hub.feedSystem.getActivePlans();
      const animalPlan = plans.find(p => p.animalType === animal.type);
      
      if (animalPlan) {
        const pasturePercent = animalPlan.composition.pasture;
        return 1 - (pasturePercent * 0.3); // Up to 30% reduction
      }
    }

    return 1.0;
  }

  /**
   * Get management adjustment
   */
  getManagementAdjustment(animal) {
    let adjustment = 1.0;

    // Rotational grazing reduces emissions
    if (this.hub.pastureSystem) {
      const recommendations = this.hub.pastureSystem.getGrazingRecommendations();
      if (recommendations.length > 0) {
        adjustment *= 0.9; // 10% reduction
      }
    }

    // Good health management reduces emissions
    if (this.hub.animalHealthSystem) {
      const health = this.hub.animalHealthSystem.getHealthSummary(animal.id);
      if (health && health.activeAlerts.length === 0) {
        adjustment *= 0.95; // 5% reduction
      }
    }

    return adjustment;
  }

  /**
   * Calculate methane emissions
   */
  calculateMethaneEmissions() {
    let totalCH4 = 0;

    this.hub.getAllAnimals().forEach(animal => {
      const benchmark = this.benchmarks[animal.type];
      if (!benchmark) return;

      // Base emissions
      let emissions = benchmark.methaneEmissions;

      // Adjust for feed quality
      if (this.hub.pastureSystem) {
        const avgHealth = this.hub.pastureSystem.getAverageHealth();
        emissions *= (1 - avgHealth * 0.2); // Better pasture = lower emissions
      }

      totalCH4 += emissions;
    });

    return {
      total: Math.round(totalCH4),
      perAnimal: Math.round(totalCH4 / Math.max(this.hub.getAllAnimals().length, 1)),
      unit: 'kg CH4/year',
      co2Equivalent: Math.round(totalCH4 * 25) // CH4 is 25x more potent than CO2
    };
  }

  /**
   * Calculate land use efficiency
   */
  calculateLandUseEfficiency() {
    const animals = this.hub.getAllAnimals();
    const pastures = this.hub.getAllPastures();

    let requiredLand = 0;
    animals.forEach(animal => {
      const benchmark = this.benchmarks[animal.type];
      if (benchmark) {
        requiredLand += benchmark.landUse;
      }
    });

    const availableLand = pastures.reduce((sum, p) => sum + (p.area / 10000), 0); // Convert m² to hectares

    return {
      required: requiredLand.toFixed(2),
      available: availableLand.toFixed(2),
      efficiency: availableLand > 0 ? ((requiredLand / availableLand) * 100).toFixed(1) : 0,
      status: requiredLand <= availableLand ? 'adequate' : 'overstocked',
      unit: 'hectares'
    };
  }

  /**
   * Calculate economic performance
   */
  calculateEconomicPerformance() {
    const animals = this.hub.getAllAnimals();

    // Feed conversion ratio
    const fcr = this.calculateFeedConversionRatio();

    // Reproduction rate
    const reproductionRate = this.calculateReproductionRate();

    // Revenue estimation
    const revenue = this.estimateRevenue();

    // Cost estimation
    const costs = this.estimateCosts();

    return {
      feedConversionRatio: fcr,
      reproductionRate,
      revenue,
      costs,
      profit: revenue.total - costs.total,
      roi: costs.total > 0 ? ((revenue.total - costs.total) / costs.total * 100).toFixed(1) : 0
    };
  }

  /**
   * Calculate feed conversion ratio
   */
  calculateFeedConversionRatio() {
    // Simplified calculation
    const animals = this.hub.getAllAnimals();
    let totalFCR = 0;

    animals.forEach(animal => {
      const benchmark = this.benchmarks[animal.type];
      if (benchmark) {
        totalFCR += benchmark.feedConversion;
      }
    });

    const avgFCR = animals.length > 0 ? totalFCR / animals.length : 0;

    return {
      average: avgFCR.toFixed(2),
      status: avgFCR < 5 ? 'excellent' : avgFCR < 7 ? 'good' : 'needs improvement',
      unit: 'kg feed per kg gain'
    };
  }

  /**
   * Calculate reproduction rate
   */
  calculateReproductionRate() {
    if (!this.hub.breedingSystem) {
      return { rate: 0, status: 'no data' };
    }

    const animals = this.hub.getAllAnimals();
    const females = animals.filter(a => a.genetics.gender === 'female');
    const offspring = animals.filter(a => a.age < 1); // Less than 1 year old

    const rate = females.length > 0 ? offspring.length / females.length : 0;

    return {
      rate: rate.toFixed(2),
      offspring: offspring.length,
      breedingFemales: females.length,
      status: rate > 0.9 ? 'excellent' : rate > 0.7 ? 'good' : 'below target',
      unit: 'offspring per female per year'
    };
  }

  /**
   * Estimate revenue
   */
  estimateRevenue() {
    const animals = this.hub.getAllAnimals();
    
    // Get market prices
    let marketPrices = {
      cattle: 1500,
      sheep: 200,
      goat: 150,
      chicken: 20
    };

    if (this.hub.marketSystem) {
      marketPrices = this.hub.marketSystem.getCurrentPrices();
    }

    let totalRevenue = 0;
    const breakdown = {};

    animals.forEach(animal => {
      const price = marketPrices[animal.type] || 0;
      totalRevenue += price;
      breakdown[animal.type] = (breakdown[animal.type] || 0) + price;
    });

    return {
      total: Math.round(totalRevenue),
      breakdown,
      perAnimal: Math.round(totalRevenue / Math.max(animals.length, 1)),
      unit: 'USD'
    };
  }

  /**
   * Estimate costs
   */
  estimateCosts() {
    let feedCost = 0;
    let healthCost = 0;
    let maintenanceCost = 0;

    // Feed costs
    if (this.hub.feedSystem) {
      feedCost = this.hub.feedSystem.getTotalCost() * 365; // Annual
    }

    // Health costs (estimate)
    if (this.hub.animalHealthSystem) {
      const alerts = this.hub.animalHealthSystem.getHealthAlerts({ unresolved: true });
      healthCost = alerts.length * 100; // $100 per health issue
    }

    // Maintenance costs (estimate)
    const animals = this.hub.getAllAnimals();
    maintenanceCost = animals.length * 50; // $50 per animal per year

    const total = feedCost + healthCost + maintenanceCost;

    return {
      total: Math.round(total),
      breakdown: {
        feed: Math.round(feedCost),
        health: Math.round(healthCost),
        maintenance: Math.round(maintenanceCost)
      },
      unit: 'USD/year'
    };
  }

  /**
   * Compare against sustainability benchmarks
   */
  compareWithBenchmarks() {
    const current = {
      carbon: this.calculateCarbonFootprint(),
      methane: this.calculateMethaneEmissions(),
      landUse: this.calculateLandUseEfficiency(),
      economic: this.calculateEconomicPerformance()
    };

    const animals = this.hub.getAllAnimals();
    const animalCounts = {};
    animals.forEach(a => {
      animalCounts[a.type] = (animalCounts[a.type] || 0) + 1;
    });

    // Calculate benchmark totals
    let benchmarkCarbon = 0;
    let benchmarkMethane = 0;

    Object.entries(animalCounts).forEach(([type, count]) => {
      const benchmark = this.benchmarks[type];
      if (benchmark) {
        benchmarkCarbon += benchmark.carbonFootprint * count;
        benchmarkMethane += benchmark.methaneEmissions * count;
      }
    });

    return {
      carbon: {
        current: current.carbon.total,
        benchmark: Math.round(benchmarkCarbon),
        performance: ((1 - current.carbon.total / benchmarkCarbon) * 100).toFixed(1),
        status: current.carbon.total < benchmarkCarbon ? 'better' : 'worse'
      },
      methane: {
        current: current.methane.total,
        benchmark: Math.round(benchmarkMethane),
        performance: ((1 - current.methane.total / benchmarkMethane) * 100).toFixed(1),
        status: current.methane.total < benchmarkMethane ? 'better' : 'worse'
      },
      landUse: current.landUse,
      economic: current.economic
    };
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const comparison = this.compareWithBenchmarks();

    // Carbon footprint recommendations
    if (comparison.carbon.status === 'worse') {
      recommendations.push({
        category: 'carbon',
        priority: 'high',
        title: 'Reduce Carbon Footprint',
        description: `Your carbon emissions are ${Math.abs(comparison.carbon.performance)}% above benchmark`,
        actions: [
          'Increase pasture-based feeding',
          'Implement rotational grazing',
          'Improve feed quality'
        ]
      });
    }

    // Methane recommendations
    if (comparison.methane.status === 'worse') {
      recommendations.push({
        category: 'methane',
        priority: 'high',
        title: 'Reduce Methane Emissions',
        description: `Methane emissions are ${Math.abs(comparison.methane.performance)}% above benchmark`,
        actions: [
          'Improve pasture quality',
          'Optimize feed composition',
          'Consider feed additives'
        ]
      });
    }

    // Land use recommendations
    if (comparison.landUse.status === 'overstocked') {
      recommendations.push({
        category: 'land_use',
        priority: 'high',
        title: 'Land Use Optimization',
        description: 'Current stocking rate exceeds available land',
        actions: [
          'Reduce herd size',
          'Acquire additional pasture',
          'Implement intensive grazing management'
        ]
      });
    }

    // Economic recommendations
    const fcr = comparison.economic.feedConversionRatio;
    if (fcr.status === 'needs improvement') {
      recommendations.push({
        category: 'economic',
        priority: 'medium',
        title: 'Improve Feed Efficiency',
        description: `Feed conversion ratio (${fcr.average}) can be improved`,
        actions: [
          'Optimize feed composition',
          'Improve animal genetics through breeding',
          'Enhance health management'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate comprehensive impact report
   */
  generateImpactReport() {
    const report = {
      timestamp: Date.now(),
      environmental: {
        carbonFootprint: this.calculateCarbonFootprint(),
        methaneEmissions: this.calculateMethaneEmissions(),
        landUseEfficiency: this.calculateLandUseEfficiency()
      },
      economic: this.calculateEconomicPerformance(),
      comparison: this.compareWithBenchmarks(),
      recommendations: this.generateRecommendations(),
      summary: this.generateSummary()
    };

    // Store in history
    this.impactHistory.push(report);

    // Keep last 12 months
    const cutoff = Date.now() - (365 * 24 * 60 * 60 * 1000);
    this.impactHistory = this.impactHistory.filter(r => r.timestamp >= cutoff);

    return report;
  }

  /**
   * Generate summary
   */
  generateSummary() {
    const comparison = this.compareWithBenchmarks();
    
    const sustainabilityScore = this.calculateSustainabilityScore(comparison);

    return {
      sustainabilityScore,
      rating: this.getSustainabilityRating(sustainabilityScore),
      strengths: this.identifyStrengths(comparison),
      weaknesses: this.identifyWeaknesses(comparison)
    };
  }

  /**
   * Calculate sustainability score (0-100)
   */
  calculateSustainabilityScore(comparison) {
    let score = 50; // Base score

    // Carbon performance
    if (comparison.carbon.status === 'better') {
      score += Math.min(parseFloat(comparison.carbon.performance) / 2, 15);
    } else {
      score -= Math.min(Math.abs(parseFloat(comparison.carbon.performance)) / 2, 15);
    }

    // Methane performance
    if (comparison.methane.status === 'better') {
      score += Math.min(parseFloat(comparison.methane.performance) / 2, 15);
    } else {
      score -= Math.min(Math.abs(parseFloat(comparison.methane.performance)) / 2, 15);
    }

    // Land use
    if (comparison.landUse.status === 'adequate') {
      score += 10;
    } else {
      score -= 10;
    }

    // Economic performance
    const roi = parseFloat(comparison.economic.roi);
    if (roi > 20) score += 10;
    else if (roi > 10) score += 5;
    else if (roi < 0) score -= 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get sustainability rating
   */
  getSustainabilityRating(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Identify strengths
   */
  identifyStrengths(comparison) {
    const strengths = [];

    if (comparison.carbon.status === 'better') {
      strengths.push('Low carbon footprint');
    }
    if (comparison.methane.status === 'better') {
      strengths.push('Reduced methane emissions');
    }
    if (comparison.landUse.status === 'adequate') {
      strengths.push('Efficient land use');
    }
    if (parseFloat(comparison.economic.roi) > 15) {
      strengths.push('Strong economic performance');
    }

    return strengths;
  }

  /**
   * Identify weaknesses
   */
  identifyWeaknesses(comparison) {
    const weaknesses = [];

    if (comparison.carbon.status === 'worse') {
      weaknesses.push('High carbon emissions');
    }
    if (comparison.methane.status === 'worse') {
      weaknesses.push('Elevated methane levels');
    }
    if (comparison.landUse.status === 'overstocked') {
      weaknesses.push('Land overstocking');
    }
    if (parseFloat(comparison.economic.roi) < 5) {
      weaknesses.push('Low profitability');
    }

    return weaknesses;
  }

  /**
   * Update system
   */
  update(deltaTime) {
    // Periodic impact calculations
    // Could trigger monthly/quarterly reports
  }
}

export default LivestockImpactSystem;
