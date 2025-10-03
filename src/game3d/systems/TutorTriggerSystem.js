/**
 * Tutor Trigger System
 * Manages contextual triggers for AI Tutor to appear and provide help
 */
export class TutorTriggerSystem {
  constructor(tutor, gameState) {
    this.tutor = tutor;
    this.gameState = gameState;
    this.triggers = new Map();
    this.triggeredEvents = new Set();
    this.failureCount = new Map();
    this.lastTriggerTime = 0;
    this.minTriggerInterval = 10000; // 10 seconds between triggers
    
    this.setupTriggers();
  }

  setupTriggers() {
    // Trigger 1: Player enters new area
    this.addTrigger('enterNewArea', {
      condition: (context) => {
        const area = context.currentArea;
        return area && !this.triggeredEvents.has(`area_${area.id}`);
      },
      action: (context) => {
        this.triggeredEvents.add(`area_${context.currentArea.id}`);
        return {
          message: `Welcome to ${context.currentArea.name}! ${context.currentArea.description || 'Let me know if you need help.'}`,
          indicator: 'exclamation',
          options: [
            { label: 'Thanks!', action: 'dismiss' },
            { label: 'Tell me more', action: 'explainArea' }
          ]
        };
      }
    });

    // Trigger 2: Player near plot with issues
    this.addTrigger('plotIssue', {
      condition: (context) => {
        const nearbyPlots = context.nearbyPlots || [];
        return nearbyPlots.some(plot => 
          plot.userData.soilMoisture < 20 || 
          plot.userData.cropHealth < 50
        );
      },
      action: (context) => {
        const problemPlot = context.nearbyPlots.find(plot => 
          plot.userData.soilMoisture < 20 || 
          plot.userData.cropHealth < 50
        );
        
        if (!problemPlot) return null;
        
        this.tutor.pointTo(problemPlot);
        
        let issue = '';
        if (problemPlot.userData.soilMoisture < 20) {
          issue = `This soil is too dry (${problemPlot.userData.soilMoisture}% moisture). Rice needs at least 30% to thrive.`;
        } else if (problemPlot.userData.cropHealth < 50) {
          issue = `This crop looks unhealthy (${problemPlot.userData.cropHealth}% health). Check for pests or nutrient deficiency.`;
        }
        
        return {
          message: `I notice a problem here. ${issue}`,
          indicator: 'warning',
          options: [
            { label: 'Show me how to fix it', action: 'showSolution' },
            { label: 'I\'ll handle it', action: 'dismiss' }
          ],
          targetObject: problemPlot
        };
      }
    });

    // Trigger 3: Player fails action multiple times
    this.addTrigger('repeatedFailure', {
      condition: (context) => {
        const action = context.lastFailedAction;
        if (!action) return false;
        
        const count = this.failureCount.get(action) || 0;
        return count >= 3;
      },
      action: (context) => {
        const action = context.lastFailedAction;
        this.failureCount.set(action, 0); // Reset counter
        
        return {
          message: `I see you're having trouble with ${action}. Would you like some help?`,
          indicator: 'question',
          options: [
            { label: 'Yes, please!', action: 'showTutorial' },
            { label: 'No, I\'ve got this', action: 'dismiss' }
          ]
        };
      }
    });

    // Trigger 4: Player views NASA data
    this.addTrigger('nasaDataViewed', {
      condition: (context) => {
        return context.nasaLayerActive && !this.triggeredEvents.has('nasa_explained');
      },
      action: (context) => {
        this.triggeredEvents.add('nasa_explained');
        const layerType = context.nasaLayerType || 'SMAP';
        
        const explanations = {
          SMAP: 'This shows soil moisture from NASA satellites. Green = wet, red = dry. Use it to plan irrigation!',
          IMERG: 'This displays rainfall data. Blue areas got more rain. Helps predict water availability.',
          NDVI: 'This measures crop health. Higher values (green) = healthier plants. Low values (red) = stress.',
          LST: 'This shows land surface temperature. Hot spots (red) may need extra water.'
        };
        
        return {
          message: `Let me explain what you're seeing. ${explanations[layerType]}`,
          indicator: 'lightbulb',
          options: [
            { label: 'Got it!', action: 'dismiss' },
            { label: 'Tell me more', action: 'explainNASA' }
          ]
        };
      }
    });

    // Trigger 5: Mission objective updated
    this.addTrigger('missionUpdate', {
      condition: (context) => {
        return context.missionObjectiveChanged;
      },
      action: (context) => {
        const objective = context.currentObjective;
        
        return {
          message: `New task: ${objective.description}. ${objective.hint || 'You can do this!'}`,
          indicator: 'exclamation',
          options: [
            { label: 'Let\'s do it!', action: 'dismiss' },
            { label: 'How do I do that?', action: 'explainObjective' }
          ]
        };
      }
    });

    // Trigger 6: Player idle for too long
    this.addTrigger('playerIdle', {
      condition: (context) => {
        return context.idleTime > 30000; // 30 seconds
      },
      action: (context) => {
        const suggestions = [
          'Need help finding something?',
          'Stuck? I can give you a hint!',
          'Want to check your mission objectives?',
          'How about exploring the NASA data layers?'
        ];
        
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        
        return {
          message: randomSuggestion,
          indicator: 'question',
          options: [
            { label: 'Yes, help me', action: 'showHelp' },
            { label: 'Just thinking', action: 'dismiss' }
          ]
        };
      }
    });

    // Trigger 7: Player completes task successfully
    this.addTrigger('taskSuccess', {
      condition: (context) => {
        return context.taskCompleted;
      },
      action: (context) => {
        this.tutor.setEmotion('celebrating');
        
        const celebrations = [
          'Excellent work! You just saved that crop!',
          'Great job! Real farmers use this technique too!',
          'Perfect! You\'re becoming a pro farmer!',
          'Well done! That was exactly right!'
        ];
        
        const message = celebrations[Math.floor(Math.random() * celebrations.length)];
        
        return {
          message: message,
          indicator: 'lightbulb',
          autoAdvance: true,
          options: []
        };
      }
    });

    // Trigger 8: Low crop health detected
    this.addTrigger('lowCropHealth', {
      condition: (context) => {
        const plots = context.plots || [];
        return plots.some(plot => plot.userData.cropHealth < 30);
      },
      action: (context) => {
        const sickPlot = context.plots.find(plot => plot.userData.cropHealth < 30);
        
        if (!sickPlot) return null;
        
        this.tutor.pointTo(sickPlot);
        this.tutor.setEmotion('concerned');
        
        return {
          message: 'Warning! That crop is in critical condition. It might be a disease or pest problem.',
          indicator: 'warning',
          options: [
            { label: 'Scan for disease', action: 'openDiseaseDetection' },
            { label: 'What should I do?', action: 'explainCropCare' },
            { label: 'I\'ll check it', action: 'dismiss' }
          ],
          targetObject: sickPlot
        };
      }
    });
  }

  addTrigger(id, trigger) {
    this.triggers.set(id, trigger);
  }

  removeTrigger(id) {
    this.triggers.delete(id);
  }

  /**
   * Check all triggers and return the highest priority one
   */
  checkTriggers(context) {
    const now = Date.now();
    
    // Respect minimum interval between triggers
    if (now - this.lastTriggerTime < this.minTriggerInterval) {
      return null;
    }
    
    for (const [id, trigger] of this.triggers) {
      if (trigger.condition(context)) {
        this.lastTriggerTime = now;
        const result = trigger.action(context);
        
        if (result) {
          result.triggerId = id;
          return result;
        }
      }
    }
    
    return null;
  }

  /**
   * Record a failed action
   */
  recordFailure(action) {
    const count = this.failureCount.get(action) || 0;
    this.failureCount.set(action, count + 1);
  }

  /**
   * Reset failure count for an action
   */
  resetFailures(action) {
    this.failureCount.set(action, 0);
  }

  /**
   * Clear all triggered events (for new game/reset)
   */
  reset() {
    this.triggeredEvents.clear();
    this.failureCount.clear();
    this.lastTriggerTime = 0;
  }

  /**
   * Disable a specific trigger
   */
  disableTrigger(id) {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.disabled = true;
    }
  }

  /**
   * Enable a specific trigger
   */
  enableTrigger(id) {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.disabled = false;
    }
  }
}

export default TutorTriggerSystem;
