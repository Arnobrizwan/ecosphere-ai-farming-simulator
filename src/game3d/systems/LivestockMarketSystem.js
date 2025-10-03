/**
 * Livestock Market System (UC63)
 * Access livestock and feed market prices with trends and forecasts
 */
export class LivestockMarketSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.currentPrices = new Map();
    this.priceHistory = new Map();
    this.alerts = [];
    this.priceUpdateInterval = 3600000; // 1 hour
    this.lastUpdate = 0;
    
    this.initializePrices();
  }

  /**
   * Initialize market prices
   */
  initializePrices() {
    const basePrices = {
      // Livestock prices (per head)
      cattle: { price: 1500, volatility: 0.15 },
      sheep: { price: 200, volatility: 0.12 },
      goat: { price: 150, volatility: 0.12 },
      chicken: { price: 20, volatility: 0.10 },
      
      // Dairy products (per liter/kg)
      milk: { price: 0.50, volatility: 0.08 },
      cheese: { price: 8.00, volatility: 0.10 },
      
      // Feed prices (per kg)
      hay: { price: 0.30, volatility: 0.15 },
      grain: { price: 0.50, volatility: 0.20 },
      supplements: { price: 2.00, volatility: 0.10 }
    };

    Object.entries(basePrices).forEach(([commodity, data]) => {
      this.currentPrices.set(commodity, {
        price: data.price,
        volatility: data.volatility,
        lastUpdate: Date.now(),
        trend: 'stable'
      });
      
      this.priceHistory.set(commodity, [{
        price: data.price,
        timestamp: Date.now()
      }]);
    });
  }

  /**
   * Update market prices
   */
  updatePrices() {
    const now = Date.now();
    
    if (now - this.lastUpdate < this.priceUpdateInterval) {
      return; // Not time to update yet
    }

    this.currentPrices.forEach((data, commodity) => {
      const oldPrice = data.price;
      
      // Simulate price change
      const change = this.simulatePriceChange(data.volatility);
      const newPrice = Math.max(oldPrice * (1 + change), 0.01);
      
      // Update current price
      data.price = Math.round(newPrice * 100) / 100;
      data.lastUpdate = now;
      data.trend = this.determineTrend(oldPrice, newPrice);
      
      // Store in history
      const history = this.priceHistory.get(commodity);
      history.push({
        price: data.price,
        timestamp: now
      });
      
      // Keep last 90 days
      const cutoff = now - (90 * 24 * 60 * 60 * 1000);
      this.priceHistory.set(
        commodity,
        history.filter(h => h.timestamp >= cutoff)
      );
      
      // Check price alerts
      this.checkPriceAlerts(commodity, oldPrice, newPrice);
    });

    this.lastUpdate = now;
  }

  /**
   * Simulate price change
   */
  simulatePriceChange(volatility) {
    // Random walk with mean reversion
    const randomChange = (Math.random() - 0.5) * volatility;
    const meanReversion = -0.1 * randomChange; // Slight tendency to revert
    
    return randomChange + meanReversion;
  }

  /**
   * Determine price trend
   */
  determineTrend(oldPrice, newPrice) {
    const change = (newPrice - oldPrice) / oldPrice;
    
    if (change > 0.05) return 'rising';
    if (change < -0.05) return 'falling';
    return 'stable';
  }

  /**
   * Get current prices
   */
  getCurrentPrices() {
    const prices = {};
    this.currentPrices.forEach((data, commodity) => {
      prices[commodity] = data.price;
    });
    return prices;
  }

  /**
   * Get price data for commodity
   */
  getPriceData(commodity) {
    const current = this.currentPrices.get(commodity);
    const history = this.priceHistory.get(commodity);
    
    if (!current || !history) return null;

    return {
      commodity,
      currentPrice: current.price,
      trend: current.trend,
      lastUpdate: current.lastUpdate,
      history: history.slice(-30), // Last 30 data points
      forecast: this.generateForecast(commodity),
      statistics: this.calculateStatistics(history)
    };
  }

  /**
   * Generate price forecast
   */
  generateForecast(commodity, days = 7) {
    const history = this.priceHistory.get(commodity);
    if (!history || history.length < 7) return null;

    const recentPrices = history.slice(-7).map(h => h.price);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    
    // Simple linear regression for trend
    const trend = this.calculateTrend(recentPrices);
    
    const forecast = [];
    const now = Date.now();
    
    for (let i = 1; i <= days; i++) {
      const forecastPrice = avgPrice + (trend * i);
      forecast.push({
        day: i,
        date: now + (i * 24 * 60 * 60 * 1000),
        price: Math.round(forecastPrice * 100) / 100,
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Confidence decreases over time
      });
    }

    return forecast;
  }

  /**
   * Calculate price trend
   */
  calculateTrend(prices) {
    if (prices.length < 2) return 0;
    
    const n = prices.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += prices[i];
      sumXY += i * prices[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate price statistics
   */
  calculateStatistics(history) {
    if (history.length === 0) return null;

    const prices = history.map(h => h.price);
    const sorted = [...prices].sort((a, b) => a - b);
    
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Calculate standard deviation
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      average: Math.round(avg * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      volatility: ((stdDev / avg) * 100).toFixed(1) + '%'
    };
  }

  /**
   * Calculate optimal selling window
   */
  calculateOptimalSellingWindow(animalType) {
    const priceData = this.getPriceData(animalType);
    if (!priceData) return null;

    const currentPrice = priceData.currentPrice;
    const forecast = priceData.forecast;
    const stats = priceData.statistics;

    // Find best forecasted price
    const bestForecast = forecast.reduce((best, day) => 
      day.price > best.price ? day : best
    , forecast[0]);

    // Calculate expected value considering feed costs
    const feedCostPerDay = this.estimateFeedCost(animalType);
    
    const recommendations = forecast.map(day => {
      const daysToWait = day.day;
      const totalFeedCost = feedCostPerDay * daysToWait;
      const netRevenue = day.price - totalFeedCost;
      
      return {
        day: day.day,
        date: day.date,
        price: day.price,
        feedCost: totalFeedCost,
        netRevenue,
        confidence: day.confidence
      };
    });

    // Find optimal day
    const optimal = recommendations.reduce((best, day) => 
      day.netRevenue > best.netRevenue ? day : best
    , recommendations[0]);

    return {
      currentPrice,
      optimalDay: optimal.day,
      optimalPrice: optimal.price,
      expectedProfit: optimal.netRevenue - currentPrice,
      recommendation: optimal.day === 1 ? 'Sell now' : `Wait ${optimal.day} days`,
      confidence: optimal.confidence,
      alternatives: recommendations
    };
  }

  /**
   * Estimate daily feed cost
   */
  estimateFeedCost(animalType) {
    const dailyIntake = {
      cattle: 18,
      sheep: 2.5,
      goat: 3,
      chicken: 0.12
    };

    const intake = dailyIntake[animalType] || 10;
    const feedPrice = this.currentPrices.get('hay')?.price || 0.30;
    
    return intake * feedPrice;
  }

  /**
   * Set price alert
   */
  setPriceAlert(commodity, condition, threshold) {
    const alert = {
      id: `alert_${Date.now()}`,
      commodity,
      condition, // 'above', 'below'
      threshold,
      active: true,
      createdAt: Date.now()
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Check price alerts
   */
  checkPriceAlerts(commodity, oldPrice, newPrice) {
    this.alerts.forEach(alert => {
      if (!alert.active || alert.commodity !== commodity) return;

      let triggered = false;

      if (alert.condition === 'above' && newPrice >= alert.threshold && oldPrice < alert.threshold) {
        triggered = true;
      } else if (alert.condition === 'below' && newPrice <= alert.threshold && oldPrice > alert.threshold) {
        triggered = true;
      }

      if (triggered) {
        this.triggerPriceAlert(alert, newPrice);
      }
    });
  }

  /**
   * Trigger price alert
   */
  triggerPriceAlert(alert, currentPrice) {
    console.log(`[MARKET ALERT] ${alert.commodity} price ${alert.condition} ${alert.threshold}: ${currentPrice}`);

    if (this.hub.player.alertSystem) {
      this.hub.player.alertSystem.createAlert({
        type: 'market_price',
        severity: 'medium',
        title: `Price Alert: ${alert.commodity}`,
        message: `${alert.commodity} price is now ${currentPrice}, ${alert.condition} your threshold of ${alert.threshold}`,
        commodity: alert.commodity,
        price: currentPrice
      });
    }

    // Deactivate alert after triggering
    alert.active = false;
    alert.triggeredAt = Date.now();
  }

  /**
   * Get regional market comparison
   */
  getRegionalComparison(region = 'local') {
    // Simulate regional price differences
    const regionalMultipliers = {
      local: 1.0,
      regional: 1.05,
      national: 1.10,
      export: 1.20
    };

    const multiplier = regionalMultipliers[region] || 1.0;
    const comparison = {};

    this.currentPrices.forEach((data, commodity) => {
      comparison[commodity] = {
        local: data.price,
        regional: Math.round(data.price * multiplier * 100) / 100,
        difference: Math.round((data.price * multiplier - data.price) * 100) / 100,
        percentDiff: ((multiplier - 1) * 100).toFixed(1) + '%'
      };
    });

    return comparison;
  }

  /**
   * Calculate total market value of livestock
   */
  getTotalValue() {
    const animals = this.hub.getAllAnimals();
    let totalValue = 0;

    animals.forEach(animal => {
      const priceData = this.currentPrices.get(animal.type);
      if (priceData) {
        totalValue += priceData.price;
      }
    });

    return Math.round(totalValue);
  }

  /**
   * Generate market report
   */
  generateMarketReport() {
    const report = {
      timestamp: Date.now(),
      prices: {},
      trends: {},
      opportunities: [],
      alerts: this.alerts.filter(a => a.active)
    };

    // Collect price data
    this.currentPrices.forEach((data, commodity) => {
      report.prices[commodity] = {
        current: data.price,
        trend: data.trend
      };

      const priceData = this.getPriceData(commodity);
      if (priceData) {
        report.trends[commodity] = {
          forecast: priceData.forecast,
          statistics: priceData.statistics
        };
      }
    });

    // Identify opportunities
    report.opportunities = this.identifyOpportunities();

    return report;
  }

  /**
   * Identify market opportunities
   */
  identifyOpportunities() {
    const opportunities = [];

    // Check livestock prices
    ['cattle', 'sheep', 'goat', 'chicken'].forEach(animalType => {
      const priceData = this.getPriceData(animalType);
      if (!priceData) return;

      const stats = priceData.statistics;
      const current = priceData.currentPrice;

      // Buying opportunity (price below average)
      if (current < stats.average * 0.9) {
        opportunities.push({
          type: 'buy',
          commodity: animalType,
          reason: 'Price below average',
          currentPrice: current,
          averagePrice: stats.average,
          discount: ((1 - current / stats.average) * 100).toFixed(1) + '%',
          priority: 'medium'
        });
      }

      // Selling opportunity (price above average)
      if (current > stats.average * 1.1) {
        opportunities.push({
          type: 'sell',
          commodity: animalType,
          reason: 'Price above average',
          currentPrice: current,
          averagePrice: stats.average,
          premium: ((current / stats.average - 1) * 100).toFixed(1) + '%',
          priority: 'high'
        });
      }
    });

    return opportunities;
  }

  /**
   * Update system
   */
  update(deltaTime) {
    // Check if it's time to update prices
    const now = Date.now();
    if (now - this.lastUpdate >= this.priceUpdateInterval) {
      this.updatePrices();
    }
  }
}

export default LivestockMarketSystem;
