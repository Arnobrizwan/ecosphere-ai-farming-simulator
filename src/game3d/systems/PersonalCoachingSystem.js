/**
 * Personal Coaching System - Adaptive AI coach that learns player behavior
 * Provides contextual advice, gentle corrections, and personalized guidance
 */
export class PersonalCoachingSystem {
  constructor() {
    this.playerProfile = null;
    this.behaviorHistory = [];
    this.activeAdvice = null;
    this.interventionQueue = [];
    this.onAdviceGenerated = null;
  }

  /**
   * Initialize player profile
   */
  initializeProfile(playerId) {
    this.playerProfile = {
      id: playerId,
      playStyle: 'unknown',
      skillLevels: {
        irrigation: 0,
        disease_mgmt: 0,
        automation: 0,
        data_analysis: 0,
        resource_mgmt: 0
      },
      learningPace: 'medium',
      commonMistakes: [],
      strengths: [],
      preferences: {},
      engagement: {
        sessionsPlayed: 0,
        avgSessionLength: 0,
        lastPlayed: Date.now()
      },
      stats: {
        decisionsCount: 0,
        avgDecisionTime: 0,
        tasksPlanned: 0,
        tasksTotal: 0,
        overWateringCount: 0,
        missedDiseaseAlerts: 0,
        lateHarvests: 0,
        successfulHarvests: 0,
        recentFailures: 0
      }
    };
  }

  /**
   * Track player action
   */
  trackAction(action) {
    this.behaviorHistory.push({
      ...action,
      timestamp: Date.now()
    });

    // Update stats
    this.updateStats(action);

    // Analyze for coaching opportunities
    this.analyzeAction(action);
  }

  /**
   * Update player stats based on action
   */
  updateStats(action) {
    const stats = this.playerProfile.stats;

    switch (action.type) {
      case 'water':
        if (action.soilMoisture > 60) {
          stats.overWateringCount++;
        }
        break;

      case 'disease_alert_missed':
        stats.missedDiseaseAlerts++;
        break;

      case 'harvest':
        if (action.timing === 'late') {
          stats.lateHarvests++;
        } else if (action.timing === 'optimal') {
          stats.successfulHarvests++;
        }
        break;

      case 'decision':
        stats.decisionsCount++;
        stats.avgDecisionTime = 
          (stats.avgDecisionTime * (stats.decisionsCount - 1) + action.timeToDecide) / 
          stats.decisionsCount;
        break;

      case 'task_created':
        stats.tasksPlanned++;
        stats.tasksTotal++;
        break;

      case 'mission_failed':
        stats.recentFailures++;
        break;

      case 'mission_success':
        stats.recentFailures = Math.max(0, stats.recentFailures - 1);
        break;
    }

    // Update play style
    this.updatePlayStyle();
  }

  /**
   * Analyze play style from behavior
   */
  updatePlayStyle() {
    const stats = this.playerProfile.stats;

    if (stats.decisionsCount < 10) {
      this.playerProfile.playStyle = 'unknown';
      return;
    }

    const planningRatio = stats.tasksPlanned / Math.max(stats.tasksTotal, 1);

    if (stats.avgDecisionTime > 30 && planningRatio > 0.7) {
      this.playerProfile.playStyle = 'methodical_planner';
    } else if (stats.avgDecisionTime < 10 && planningRatio < 0.3) {
      this.playerProfile.playStyle = 'impulsive_doer';
    } else {
      this.playerProfile.playStyle = 'balanced';
    }
  }

  /**
   * Analyze action for coaching opportunities
   */
  analyzeAction(action) {
    // Check for mistakes
    if (this.isMistake(action)) {
      this.queueIntervention(action);
    }

    // Check for good decisions
    if (this.isGoodDecision(action)) {
      this.reinforceStrength(action);
    }

    // Check for frustration signals
    if (this.detectsFrustration(action)) {
      this.offerSupport();
    }
  }

  /**
   * Determine if action is a mistake
   */
  isMistake(action) {
    switch (action.type) {
      case 'water':
        return action.soilMoisture > 60;
      case 'harvest':
        return action.timing === 'late' || action.timing === 'early';
      case 'disease_alert_missed':
        return true;
      default:
        return false;
    }
  }

  /**
   * Determine if action is good
   */
  isGoodDecision(action) {
    switch (action.type) {
      case 'water':
        return action.checkedSMAP && action.soilMoisture < 30;
      case 'harvest':
        return action.timing === 'optimal';
      case 'nasa_data_checked':
        return true;
      case 'task_created':
        return action.wellPlanned;
      default:
        return false;
    }
  }

  /**
   * Detect frustration from behavior
   */
  detectsFrustration(action) {
    if (action.type === 'rapid_retry' && action.count > 3) return true;
    if (action.type === 'quit_without_completion') return true;
    if (this.playerProfile.stats.recentFailures > 2) return true;
    return false;
  }

  /**
   * Queue intervention for mistake
   */
  queueIntervention(action) {
    const mistakeType = this.getMistakeType(action);
    const frequency = this.getMistakeFrequency(mistakeType);

    this.interventionQueue.push({
      type: mistakeType,
      action,
      frequency,
      approach: this.selectApproach(frequency)
    });

    // Process queue after short delay
    setTimeout(() => this.processInterventionQueue(), 2000);
  }

  /**
   * Get mistake type
   */
  getMistakeType(action) {
    if (action.type === 'water' && action.soilMoisture > 60) {
      return 'overwatering';
    }
    if (action.type === 'disease_alert_missed') {
      return 'disease_neglect';
    }
    if (action.type === 'harvest' && action.timing !== 'optimal') {
      return 'harvest_timing';
    }
    return 'unknown';
  }

  /**
   * Get frequency of mistake type
   */
  getMistakeFrequency(mistakeType) {
    switch (mistakeType) {
      case 'overwatering':
        return this.playerProfile.stats.overWateringCount;
      case 'disease_neglect':
        return this.playerProfile.stats.missedDiseaseAlerts;
      case 'harvest_timing':
        return this.playerProfile.stats.lateHarvests;
      default:
        return 0;
    }
  }

  /**
   * Select intervention approach
   */
  selectApproach(frequency) {
    if (frequency === 1) return 'gentle_tip';
    if (frequency >= 3) return 'direct_coaching';
    if (this.playerProfile.stats.recentFailures > 2) return 'encouraging_alternative';
    return 'reminder';
  }

  /**
   * Process intervention queue
   */
  processInterventionQueue() {
    if (this.interventionQueue.length === 0) return;

    const intervention = this.interventionQueue.shift();
    this.showIntervention(intervention);
  }

  /**
   * Show intervention advice
   */
  showIntervention(intervention) {
    let message = '';
    let tone = 'neutral';

    switch (intervention.approach) {
      case 'gentle_tip':
        tone = 'friendly';
        message = this.getGentleTip(intervention.type);
        break;

      case 'direct_coaching':
        tone = 'instructive';
        message = this.getDirectCoaching(intervention.type);
        break;

      case 'encouraging_alternative':
        tone = 'encouraging';
        message = this.getEncouragingAdvice(intervention.type);
        break;

      default:
        message = this.getReminder(intervention.type);
    }

    this.generateAdvice({
      timing: 'reactive',
      tone,
      message,
      type: intervention.type,
      action: this.getSuggestedAction(intervention.type)
    });
  }

  /**
   * Get gentle tip message
   */
  getGentleTip(mistakeType) {
    const tips = {
      overwatering: "Quick tip: That plot already has 70% moisture. Rice needs 40-60% typically. No worries, just something to watch! 😊",
      disease_neglect: "Heads up: There's a disease alert on Plot 3. Catching these early prevents spread. Want to check it out?",
      harvest_timing: "FYI: That crop was ready 2 days ago. Harvesting at peak maturity gives better yield. Check NDVI next time!"
    };
    return tips[mistakeType] || "Keep learning! Every mistake is a lesson.";
  }

  /**
   * Get direct coaching message
   */
  getDirectCoaching(mistakeType) {
    const coaching = {
      overwatering: "I notice you often water when moisture is already high. Let's practice: Before watering, always check the SMAP data layer first. Want a quick 1-minute tutorial on reading soil moisture?",
      disease_neglect: "This is the third disease alert you've missed. Early detection is crucial! Set up automated health scans or check crops daily. Let me help you create a monitoring routine.",
      harvest_timing: "Your harvest timing needs work. Use NDVI to track crop maturity - when it peaks and starts declining, that's harvest time. Let's practice together?"
    };
    return coaching[mistakeType] || "Let's work on improving this skill together.";
  }

  /**
   * Get encouraging advice
   */
  getEncouragingAdvice(mistakeType) {
    return "Hey, tough mission! But I saw you using NASA data correctly - that's the most important skill. The timing will come with practice. Want to try a similar but easier scenario?";
  }

  /**
   * Get reminder message
   */
  getReminder(mistakeType) {
    const reminders = {
      overwatering: "Remember to check soil moisture before watering. SMAP data is your friend!",
      disease_neglect: "Don't forget to respond to disease alerts quickly. Early action prevents spread.",
      harvest_timing: "Keep an eye on NDVI for optimal harvest timing."
    };
    return reminders[mistakeType] || "Keep up the good work!";
  }

  /**
   * Reinforce strength
   */
  reinforceStrength(action) {
    const strengthType = this.getStrengthType(action);

    // Add to strengths if not already there
    if (!this.playerProfile.strengths.includes(strengthType)) {
      this.playerProfile.strengths.push(strengthType);
    }

    // Update skill level
    this.updateSkillLevel(strengthType, 5);

    // Show positive reinforcement
    this.showPositiveReinforcement(action, strengthType);
  }

  /**
   * Get strength type from action
   */
  getStrengthType(action) {
    if (action.type === 'water' && action.checkedSMAP) return 'irrigation';
    if (action.type === 'nasa_data_checked') return 'data_analysis';
    if (action.type === 'task_created') return 'automation';
    if (action.type === 'disease_detected') return 'disease_mgmt';
    return 'general';
  }

  /**
   * Update skill level
   */
  updateSkillLevel(skill, points) {
    if (this.playerProfile.skillLevels[skill] !== undefined) {
      this.playerProfile.skillLevels[skill] += points;
    }
  }

  /**
   * Show positive reinforcement
   */
  showPositiveReinforcement(action, strengthType) {
    const messages = {
      irrigation: "Smart! Checking SMAP before watering. This is exactly how professional farmers use satellite data. Keep it up! +10 XP",
      data_analysis: "Excellent use of NASA data! You're thinking like a data-driven farmer. +10 XP",
      automation: "Great planning! Automated tasks save time and ensure consistency. +10 XP",
      disease_mgmt: "Quick disease detection! Early response is key to healthy crops. +10 XP"
    };

    this.generateAdvice({
      timing: 'confirmatory',
      tone: 'encouraging',
      message: messages[strengthType] || "Great job! +10 XP",
      reward: { xp: 10, skillPoint: strengthType }
    });
  }

  /**
   * Offer support for frustration
   */
  offerSupport() {
    this.generateAdvice({
      timing: 'supportive',
      tone: 'empathetic',
      message: "This one's tricky, huh? No worries - everyone struggles with this mission at first. Want to take a break and try something easier, or would a hint help?",
      options: [
        { label: 'Give me a hint', action: 'show_hint' },
        { label: 'Skip for now', action: 'save_progress_exit' },
        { label: 'Easier version', action: 'load_simplified_mission' }
      ]
    });
  }

  /**
   * Provide contextual advice
   */
  provideContextualAdvice(situation, context) {
    switch (situation) {
      case 'about_to_water':
        return this.wateringAdvice(context);
      case 'low_yield_harvest':
        return this.harvestReflection(context);
      case 'mission_failed':
        return this.encouragementAfterFailure(context);
      case 'mission_success':
        return this.celebrateSuccess(context);
      default:
        return null;
    }
  }

  /**
   * Watering advice
   */
  wateringAdvice(context) {
    const soilMoisture = context.soilMoisture;
    const profile = this.playerProfile;

    // About to overwater (again)
    if (soilMoisture > 60 && profile.stats.overWateringCount > 0) {
      return {
        timing: 'preventive',
        tone: 'gentle_reminder',
        message: "Hold on! I notice this plot already has 65% moisture. Remember, overwatering can harm crops. Check the SMAP layer first?",
        action: 'show_smap_data',
        visual: 'highlight_moisture_indicator'
      };
    }

    // First time doing it right
    if (soilMoisture < 30 && !profile.strengths.includes('irrigation')) {
      return {
        timing: 'confirmatory',
        tone: 'encouraging',
        message: "Perfect timing! You checked SMAP data and the soil is indeed dry. This is exactly how data-driven farming works!",
        reward: { xp: 10, skillPoint: 'irrigation' }
      };
    }

    return null;
  }

  /**
   * Harvest reflection
   */
  harvestReflection(context) {
    const efficiency = context.actualYield / context.expectedYield;

    if (efficiency < 0.7) {
      const analysis = this.analyzeYieldFactors(context);

      return {
        timing: 'reflective',
        tone: 'constructive',
        message: `Your harvest was below expectation (${Math.round(efficiency * 100)}%). Let's understand why:\n\n${analysis.summary}\n\nNext time: ${analysis.mainImprovement}`,
        learnMore: 'yield_optimization_guide',
        visual: 'show_timeline_analysis'
      };
    } else if (efficiency > 1.1) {
      return {
        timing: 'celebratory',
        tone: 'excited',
        message: `Excellent harvest! ${Math.round(efficiency * 100)}% of expected yield. Your careful management paid off! +50 XP`,
        reward: { xp: 50, bonus: Math.round((efficiency - 1) * 100) }
      };
    }

    return null;
  }

  /**
   * Analyze yield factors
   */
  analyzeYieldFactors(context) {
    const issues = [];

    if (context.wateringConsistency < 0.7) {
      issues.push('Watering was inconsistent');
    }
    if (context.diseaseResponseTime > 48) {
      issues.push('Disease response was delayed');
    }
    if (context.weatherStress) {
      issues.push('Weather stress affected growth');
    }

    return {
      summary: issues.join('\n- '),
      mainImprovement: issues[0] || 'Keep doing what you\'re doing!'
    };
  }

  /**
   * Encouragement after failure
   */
  encouragementAfterFailure(context) {
    return {
      timing: 'supportive',
      tone: 'encouraging',
      message: "Don't worry about this mission. I saw you making good decisions - you're learning! Every expert farmer failed missions when starting. Want to try again or take a break?",
      options: [
        { label: 'Try again', action: 'retry_mission' },
        { label: 'Take a break', action: 'exit_to_dashboard' }
      ]
    };
  }

  /**
   * Celebrate success
   */
  celebrateSuccess(context) {
    return {
      timing: 'celebratory',
      tone: 'excited',
      message: `Mission complete! You're getting better at this. ${context.improvement ? `Your ${context.improvement} has improved significantly!` : 'Keep it up!'}`,
      reward: context.reward
    };
  }

  /**
   * Generate advice and notify listeners
   */
  generateAdvice(advice) {
    this.activeAdvice = advice;

    if (this.onAdviceGenerated) {
      this.onAdviceGenerated(advice);
    }
  }

  /**
   * Get suggested action for mistake type
   */
  getSuggestedAction(mistakeType) {
    const actions = {
      overwatering: 'show_smap_tutorial',
      disease_neglect: 'setup_health_monitoring',
      harvest_timing: 'show_ndvi_tutorial'
    };
    return actions[mistakeType];
  }

  /**
   * Get player profile
   */
  getProfile() {
    return this.playerProfile;
  }

  /**
   * Dismiss active advice
   */
  dismissAdvice() {
    this.activeAdvice = null;
  }
}

export default PersonalCoachingSystem;
