/**
 * Livestock Scenario System (UC61)
 * Gamified livestock management challenges and learning scenarios
 */
export class LivestockScenarioSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.scenarios = new Map();
    this.playerProgress = {
      completedScenarios: [],
      currentScenario: null,
      totalPoints: 0,
      achievements: []
    };
    
    this.initializeScenarios();
  }

  /**
   * Initialize scenario templates
   */
  initializeScenarios() {
    const scenarios = [
      {
        id: 'disease_outbreak',
        title: 'Disease Outbreak Response',
        difficulty: 'medium',
        category: 'health',
        description: 'A contagious disease has been detected in your herd. Respond quickly to prevent spread.',
        objectives: [
          { id: 'identify', text: 'Identify infected animals', points: 50 },
          { id: 'isolate', text: 'Isolate infected animals', points: 100 },
          { id: 'treat', text: 'Administer treatment', points: 100 },
          { id: 'prevent', text: 'Vaccinate healthy animals', points: 50 }
        ],
        initialState: {
          totalAnimals: 20,
          infectedCount: 3,
          timeLimit: 48, // hours
          spreadRate: 0.2 // 20% chance per day
        },
        rewards: {
          points: 300,
          xp: 500,
          unlock: 'advanced_health_monitoring'
        }
      },
      {
        id: 'feed_shortage',
        title: 'Emergency Feed Shortage',
        difficulty: 'hard',
        category: 'feed',
        description: 'Unexpected drought has reduced pasture quality. Manage limited feed resources.',
        objectives: [
          { id: 'assess', text: 'Assess current feed inventory', points: 30 },
          { id: 'prioritize', text: 'Prioritize animals by need', points: 70 },
          { id: 'supplement', text: 'Source emergency feed', points: 100 },
          { id: 'ration', text: 'Implement rationing plan', points: 100 }
        ],
        initialState: {
          feedInventory: 0.3, // 30% of normal
          pastureQuality: 0.2,
          timeLimit: 72,
          animalCount: 25
        },
        rewards: {
          points: 300,
          xp: 600,
          unlock: 'emergency_feed_planning'
        }
      },
      {
        id: 'breeding_decision',
        title: 'Optimal Breeding Strategy',
        difficulty: 'easy',
        category: 'breeding',
        description: 'Select the best breeding pairs to improve herd genetics.',
        objectives: [
          { id: 'analyze', text: 'Analyze genetic profiles', points: 50 },
          { id: 'select', text: 'Select optimal pairs', points: 100 },
          { id: 'schedule', text: 'Schedule breeding', points: 50 },
          { id: 'project', text: 'Project offspring traits', points: 50 }
        ],
        initialState: {
          availableMales: 5,
          availableFemales: 10,
          geneticGoal: 'milk_production'
        },
        rewards: {
          points: 250,
          xp: 400,
          unlock: 'genetic_optimization'
        }
      },
      {
        id: 'pasture_rotation',
        title: 'Rotational Grazing Challenge',
        difficulty: 'medium',
        category: 'pasture',
        description: 'Maximize pasture health through strategic rotation.',
        objectives: [
          { id: 'monitor', text: 'Monitor pasture NDVI', points: 40 },
          { id: 'plan', text: 'Create rotation schedule', points: 80 },
          { id: 'execute', text: 'Move animals on schedule', points: 80 },
          { id: 'recover', text: 'Allow pasture recovery', points: 50 }
        ],
        initialState: {
          pastures: 4,
          animals: 30,
          rotationDays: 7,
          targetNDVI: 0.6
        },
        rewards: {
          points: 250,
          xp: 450,
          unlock: 'advanced_grazing_management'
        }
      },
      {
        id: 'market_timing',
        title: 'Market Timing Decision',
        difficulty: 'hard',
        category: 'economics',
        description: 'Decide when to sell livestock based on market conditions.',
        objectives: [
          { id: 'analyze_market', text: 'Analyze market trends', points: 60 },
          { id: 'assess_animals', text: 'Assess animal readiness', points: 60 },
          { id: 'calculate', text: 'Calculate optimal timing', points: 80 },
          { id: 'execute', text: 'Execute sale decision', points: 100 }
        ],
        initialState: {
          readyAnimals: 10,
          currentPrice: 1200,
          priceVolatility: 0.15,
          feedCostPerDay: 50
        },
        rewards: {
          points: 300,
          xp: 550,
          unlock: 'market_analytics'
        }
      }
    ];

    scenarios.forEach(scenario => {
      this.scenarios.set(scenario.id, scenario);
    });
  }

  /**
   * Start scenario
   */
  startScenario(scenarioId) {
    const template = this.scenarios.get(scenarioId);
    if (!template) return null;

    const scenario = {
      ...template,
      instanceId: `instance_${Date.now()}`,
      startTime: Date.now(),
      status: 'active',
      currentObjective: 0,
      completedObjectives: [],
      decisions: [],
      state: { ...template.initialState },
      score: 0
    };

    this.playerProgress.currentScenario = scenario;

    return scenario;
  }

  /**
   * Make decision in scenario
   */
  makeDecision(decision) {
    const scenario = this.playerProgress.currentScenario;
    if (!scenario || scenario.status !== 'active') return null;

    // Record decision
    scenario.decisions.push({
      ...decision,
      timestamp: Date.now()
    });

    // Process decision based on scenario type
    const outcome = this.processDecision(scenario, decision);

    // Update scenario state
    this.updateScenarioState(scenario, outcome);

    // Check if objective completed
    this.checkObjectiveCompletion(scenario, decision);

    return outcome;
  }

  /**
   * Process decision and calculate outcome
   */
  processDecision(scenario, decision) {
    const outcomes = {
      disease_outbreak: this.processDiseaseDecision,
      feed_shortage: this.processFeedDecision,
      breeding_decision: this.processBreedingDecision,
      pasture_rotation: this.processPastureDecision,
      market_timing: this.processMarketDecision
    };

    const processor = outcomes[scenario.id];
    return processor ? processor.call(this, scenario, decision) : { success: false };
  }

  /**
   * Process disease outbreak decision
   */
  processDiseaseDecision(scenario, decision) {
    const { action, animalIds } = decision;

    switch (action) {
      case 'identify':
        const correctlyIdentified = animalIds.filter(id => 
          scenario.state.infectedAnimals?.includes(id)
        ).length;
        return {
          success: correctlyIdentified > 0,
          message: `Identified ${correctlyIdentified} infected animals`,
          points: correctlyIdentified * 15,
          consequence: 'Disease spread slowed'
        };

      case 'isolate':
        scenario.state.isolatedCount = (scenario.state.isolatedCount || 0) + animalIds.length;
        return {
          success: true,
          message: `Isolated ${animalIds.length} animals`,
          points: animalIds.length * 30,
          consequence: 'Prevented further spread'
        };

      case 'treat':
        scenario.state.treatedCount = (scenario.state.treatedCount || 0) + animalIds.length;
        return {
          success: true,
          message: `Treated ${animalIds.length} animals`,
          points: animalIds.length * 40,
          consequence: 'Animals recovering'
        };

      case 'vaccinate':
        return {
          success: true,
          message: `Vaccinated ${animalIds.length} healthy animals`,
          points: animalIds.length * 20,
          consequence: 'Herd protected'
        };

      default:
        return { success: false, message: 'Unknown action' };
    }
  }

  /**
   * Process feed shortage decision
   */
  processFeedDecision(scenario, decision) {
    const { action, data } = decision;

    switch (action) {
      case 'assess':
        return {
          success: true,
          message: `Current feed: ${scenario.state.feedInventory * 100}%`,
          points: 30,
          data: {
            daysRemaining: Math.floor(scenario.state.feedInventory * 30)
          }
        };

      case 'prioritize':
        scenario.state.priorityList = data.priorityList;
        return {
          success: true,
          message: 'Animals prioritized by need',
          points: 70,
          consequence: 'Efficient resource allocation'
        };

      case 'supplement':
        const cost = data.amount * 0.5;
        scenario.state.feedInventory += data.amount / 100;
        return {
          success: true,
          message: `Purchased ${data.amount}kg feed for $${cost}`,
          points: 100,
          cost,
          consequence: 'Feed crisis averted'
        };

      case 'ration':
        scenario.state.rationingActive = true;
        return {
          success: true,
          message: 'Rationing plan implemented',
          points: 100,
          consequence: 'Extended feed supply'
        };

      default:
        return { success: false };
    }
  }

  /**
   * Process breeding decision
   */
  processBreedingDecision(scenario, decision) {
    const { action, pairs } = decision;

    if (action === 'select_pairs') {
      const scores = pairs.map(pair => {
        const compatibility = Math.random() * 0.3 + 0.7; // 0.7-1.0
        const geneticScore = (pair.male.score + pair.female.score) / 2;
        return geneticScore * compatibility;
      });

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      return {
        success: avgScore > 70,
        message: `Selected ${pairs.length} breeding pairs`,
        points: Math.round(avgScore * 2),
        data: {
          avgGeneticScore: avgScore,
          projectedImprovement: (avgScore - 60) / 60 * 100
        },
        consequence: avgScore > 80 ? 'Excellent genetic improvement' : 'Good breeding choices'
      };
    }

    return { success: false };
  }

  /**
   * Process pasture rotation decision
   */
  processPastureDecision(scenario, decision) {
    const { action, data } = decision;

    if (action === 'create_schedule') {
      const schedule = data.schedule;
      const efficiency = this.calculateRotationEfficiency(schedule);

      return {
        success: efficiency > 0.7,
        message: `Rotation schedule created (${Math.round(efficiency * 100)}% efficient)`,
        points: Math.round(efficiency * 100),
        data: { efficiency },
        consequence: efficiency > 0.8 ? 'Optimal pasture utilization' : 'Good rotation plan'
      };
    }

    return { success: false };
  }

  /**
   * Calculate rotation efficiency
   */
  calculateRotationEfficiency(schedule) {
    // Simple efficiency calculation based on rest periods
    let totalRestDays = 0;
    schedule.forEach(rotation => {
      totalRestDays += rotation.restDays || 0;
    });

    const avgRestDays = totalRestDays / schedule.length;
    return Math.min(avgRestDays / 21, 1); // Optimal rest is 21 days
  }

  /**
   * Process market timing decision
   */
  processMarketDecision(scenario, decision) {
    const { action, data } = decision;

    if (action === 'sell') {
      const currentPrice = scenario.state.currentPrice;
      const optimalPrice = scenario.state.optimalPrice || currentPrice * 1.1;
      const efficiency = currentPrice / optimalPrice;

      const revenue = currentPrice * data.animalCount;
      const profit = revenue - (scenario.state.feedCostPerDay * data.daysWaited);

      return {
        success: efficiency > 0.9,
        message: `Sold ${data.animalCount} animals at $${currentPrice}/head`,
        points: Math.round(efficiency * 150),
        data: {
          revenue,
          profit,
          efficiency: efficiency * 100
        },
        consequence: efficiency > 0.95 ? 'Excellent timing!' : 'Good sale'
      };
    }

    return { success: false };
  }

  /**
   * Update scenario state
   */
  updateScenarioState(scenario, outcome) {
    if (outcome.success) {
      scenario.score += outcome.points || 0;
    }

    // Update time
    const elapsed = Date.now() - scenario.startTime;
    const hoursElapsed = elapsed / (1000 * 60 * 60);

    // Check time limit
    if (scenario.state.timeLimit && hoursElapsed >= scenario.state.timeLimit) {
      this.endScenario(scenario, 'timeout');
    }
  }

  /**
   * Check objective completion
   */
  checkObjectiveCompletion(scenario, decision) {
    const currentObj = scenario.objectives[scenario.currentObjective];
    
    if (currentObj && decision.objectiveId === currentObj.id) {
      scenario.completedObjectives.push(currentObj.id);
      scenario.score += currentObj.points;
      scenario.currentObjective++;

      // Check if all objectives completed
      if (scenario.currentObjective >= scenario.objectives.length) {
        this.endScenario(scenario, 'completed');
      }
    }
  }

  /**
   * End scenario
   */
  endScenario(scenario, reason) {
    scenario.status = reason === 'completed' ? 'completed' : 'failed';
    scenario.endTime = Date.now();
    scenario.duration = scenario.endTime - scenario.startTime;

    // Calculate final score
    const timeBonus = this.calculateTimeBonus(scenario);
    const finalScore = scenario.score + timeBonus;

    // Award rewards
    if (scenario.status === 'completed') {
      this.awardRewards(scenario, finalScore);
    }

    // Update progress
    this.playerProgress.completedScenarios.push({
      scenarioId: scenario.id,
      status: scenario.status,
      score: finalScore,
      completedAt: Date.now()
    });

    this.playerProgress.currentScenario = null;

    return {
      status: scenario.status,
      score: finalScore,
      timeBonus,
      rewards: scenario.status === 'completed' ? scenario.rewards : null
    };
  }

  /**
   * Calculate time bonus
   */
  calculateTimeBonus(scenario) {
    if (!scenario.state.timeLimit) return 0;

    const duration = (scenario.endTime - scenario.startTime) / (1000 * 60 * 60);
    const timeLimit = scenario.state.timeLimit;
    const efficiency = 1 - (duration / timeLimit);

    return efficiency > 0 ? Math.round(efficiency * 100) : 0;
  }

  /**
   * Award rewards
   */
  awardRewards(scenario, finalScore) {
    this.playerProgress.totalPoints += finalScore;

    if (scenario.rewards.xp && this.hub.player) {
      this.hub.player.addXP(scenario.rewards.xp);
    }

    if (scenario.rewards.unlock) {
      this.playerProgress.achievements.push(scenario.rewards.unlock);
    }
  }

  /**
   * Get available scenarios
   */
  getAvailableScenarios() {
    return Array.from(this.scenarios.values()).filter(scenario => {
      // Check if unlocked based on player progress
      return this.isScenarioUnlocked(scenario);
    });
  }

  /**
   * Check if scenario is unlocked
   */
  isScenarioUnlocked(scenario) {
    // Easy scenarios always unlocked
    if (scenario.difficulty === 'easy') return true;

    // Check prerequisites
    const completedCount = this.playerProgress.completedScenarios.length;
    
    if (scenario.difficulty === 'medium') return completedCount >= 1;
    if (scenario.difficulty === 'hard') return completedCount >= 3;

    return true;
  }

  /**
   * Get player progress
   */
  getProgress() {
    return {
      ...this.playerProgress,
      totalScenarios: this.scenarios.size,
      completionRate: (this.playerProgress.completedScenarios.length / this.scenarios.size) * 100
    };
  }

  /**
   * Update system
   */
  update(deltaTime) {
    const scenario = this.playerProgress.currentScenario;
    if (!scenario || scenario.status !== 'active') return;

    // Simulate scenario progression
    // Update disease spread, market prices, etc.
  }
}

export default LivestockScenarioSystem;
