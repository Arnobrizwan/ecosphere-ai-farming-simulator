/**
 * Treatment Mini-game System
 * Interactive mini-games for applying disease treatments to crops
 */
export class TreatmentMinigame {
  constructor(scene, crop, treatment) {
    this.scene = scene;
    this.crop = crop;
    this.treatment = treatment;
    this.isActive = false;
    this.currentStep = 0;
    this.score = 0;
    this.onComplete = null;
  }

  /**
   * Start the mini-game
   */
  start(onComplete) {
    this.isActive = true;
    this.currentStep = 0;
    this.score = 0;
    this.onComplete = onComplete;
    
    // Determine mini-game type based on treatment
    if (this.treatment.name.includes('Remove')) {
      return this.startRemovalGame();
    } else if (this.treatment.name.includes('spray') || this.treatment.name.includes('Fungicide')) {
      return this.startSprayGame();
    } else {
      return this.startGenericGame();
    }
  }

  /**
   * Removal mini-game - tap infected leaves to remove
   */
  startRemovalGame() {
    const steps = [
      {
        instruction: 'Tap infected leaves to remove them',
        action: 'tapLeaves',
        target: 5, // Remove 5 infected leaves
        current: 0
      }
    ];
    
    return {
      type: 'removal',
      steps,
      highlightInfectedLeaves: true
    };
  }

  /**
   * Spray mini-game - aim and spray crop
   */
  startSprayGame() {
    const steps = [
      {
        instruction: 'Aim at the crop',
        action: 'aim',
        completed: false
      },
      {
        instruction: 'Hold to spray evenly',
        action: 'spray',
        duration: 3000, // 3 seconds
        progress: 0
      },
      {
        instruction: 'Cover all sides',
        action: 'coverage',
        target: 4, // 4 sides
        current: 0
      }
    ];
    
    return {
      type: 'spray',
      steps,
      showSprayTool: true
    };
  }

  /**
   * Generic treatment game
   */
  startGenericGame() {
    const steps = this.treatment.steps.map((step, index) => ({
      instruction: step,
      action: 'confirm',
      completed: false
    }));
    
    return {
      type: 'generic',
      steps,
      showInstructions: true
    };
  }

  /**
   * Handle player action in mini-game
   */
  handleAction(actionType, data) {
    if (!this.isActive) return;
    
    const currentStepData = this.getCurrentStep();
    if (!currentStepData) return;
    
    switch (actionType) {
      case 'tapLeaf':
        this.handleLeafTap(data);
        break;
      case 'spray':
        this.handleSpray(data);
        break;
      case 'confirm':
        this.handleConfirm();
        break;
    }
  }

  handleLeafTap(leaf) {
    // Check if leaf is infected
    if (leaf.userData.infected) {
      // Remove leaf (fade out animation)
      this.removeLeaf(leaf);
      
      // Update progress
      const step = this.getCurrentStep();
      step.current++;
      this.score += 20;
      
      if (step.current >= step.target) {
        this.nextStep();
      }
    } else {
      // Penalty for removing healthy leaf
      this.score -= 10;
      this.showFeedback('That leaf is healthy!', 'warning');
    }
  }

  handleSpray(data) {
    const step = this.getCurrentStep();
    
    if (step.action === 'spray') {
      step.progress += data.deltaTime;
      
      // Show spray particles
      this.showSprayEffect(data.position, data.direction);
      
      if (step.progress >= step.duration) {
        this.score += 30;
        this.nextStep();
      }
    }
  }

  handleConfirm() {
    const step = this.getCurrentStep();
    step.completed = true;
    this.score += 10;
    this.nextStep();
  }

  getCurrentStep() {
    const gameData = this.getGameData();
    return gameData?.steps[this.currentStep];
  }

  nextStep() {
    this.currentStep++;
    
    const gameData = this.getGameData();
    if (this.currentStep >= gameData.steps.length) {
      this.complete();
    }
  }

  complete() {
    this.isActive = false;
    
    // Calculate success
    const effectiveness = this.treatment.effectiveness;
    const playerBonus = Math.min(this.score / 100, 0.2); // Max 20% bonus
    const totalEffectiveness = Math.min(effectiveness + playerBonus, 1);
    
    const result = {
      success: true,
      effectiveness: totalEffectiveness,
      score: this.score,
      message: this.getCompletionMessage(totalEffectiveness)
    };
    
    if (this.onComplete) {
      this.onComplete(result);
    }
  }

  getCompletionMessage(effectiveness) {
    if (effectiveness >= 0.9) {
      return 'Perfect treatment! The crop should recover fully.';
    } else if (effectiveness >= 0.7) {
      return 'Good job! The disease should be controlled.';
    } else {
      return 'Treatment applied. Monitor the crop closely.';
    }
  }

  removeLeaf(leaf) {
    // Fade out animation
    const startOpacity = leaf.material.opacity || 1;
    const duration = 500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      leaf.material.opacity = startOpacity * (1 - progress);
      leaf.material.transparent = true;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Remove from scene
        if (leaf.parent) {
          leaf.parent.remove(leaf);
        }
      }
    };
    
    animate();
  }

  showSprayEffect(position, direction) {
    // Create spray particles
    // (Simplified - full implementation would use particle system)
    const particleCount = 10;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = {
        position: position.clone(),
        velocity: direction.clone().multiplyScalar(0.1 + Math.random() * 0.1),
        life: 1000 // 1 second
      };
      
      // Add to scene (simplified)
      // In full implementation, use particle system
    }
  }

  showFeedback(message, type) {
    // Show feedback message to player
    // This would integrate with game UI system
    console.log(`[${type}] ${message}`);
  }

  getGameData() {
    // Return current game configuration
    // This would be set in start() method
    return this._gameData;
  }

  /**
   * Cancel mini-game
   */
  cancel() {
    this.isActive = false;
    
    if (this.onComplete) {
      this.onComplete({
        success: false,
        cancelled: true,
        message: 'Treatment cancelled'
      });
    }
  }
}

/**
 * Spray Tool - Visual tool for spray mini-game
 */
export class SprayTool {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.isActive = false;
    this.isSpraying = false;
  }

  create() {
    // Create spray can/bottle 3D model
    const THREE = require('three');
    const group = new THREE.Group();
    
    // Bottle body
    const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4CAF50,
      metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Spray nozzle
    const nozzleGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.05, 8);
    const nozzleMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333
    });
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.position.y = 0.125;
    group.add(nozzle);
    
    this.mesh = group;
    return group;
  }

  setActive(active) {
    this.isActive = active;
    if (this.mesh) {
      this.mesh.visible = active;
    }
  }

  startSpray() {
    this.isSpraying = true;
    // Start spray particle effect
  }

  stopSpray() {
    this.isSpraying = false;
    // Stop spray particle effect
  }
}

export default TreatmentMinigame;
