import * as THREE from 'three';

/**
 * Automated Worker Bot - Executes farm tasks in 3D world
 * Small robot that navigates, performs actions, and shows status
 */
export class AutomatedWorker {
  constructor(scene, homePosition) {
    this.scene = scene;
    this.homePosition = homePosition || new THREE.Vector3(0, 0, 0);
    this.mesh = null;
    this.tool = null;
    this.statusLight = null;
    this.currentTask = null;
    this.status = 'idle'; // idle, moving, working, returning
    this.position = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.speed = 2; // units per second
    this.speechBubble = null;
    this.pathLine = null;
    
    this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Robot body (box with rounded edges)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x34A853,
      metalness: 0.5,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);
    
    // Wheels (simple cylinders)
    const wheelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const wheelPositions = [
      [-0.15, -0.2, 0.15],
      [0.15, -0.2, 0.15],
      [-0.15, -0.2, -0.15],
      [0.15, -0.2, -0.15]
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      group.add(wheel);
    });
    
    // Status light on head
    const lightGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00,
      emissive: 0x00FF00,
      emissiveIntensity: 1
    });
    const statusLight = new THREE.Mesh(lightGeometry, lightMaterial);
    statusLight.position.y = 0.3;
    group.add(statusLight);
    this.statusLight = statusLight;
    
    // Eyes (simple spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.1, 0.16);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.1, 0.16);
    group.add(rightEye);
    
    this.mesh = group;
    this.mesh.position.copy(this.homePosition);
    this.position.copy(this.homePosition);
    this.scene.add(this.mesh);
  }

  /**
   * Assign task to worker
   */
  assignTask(task) {
    this.currentTask = task;
    this.status = 'moving';
    this.setStatusLight(0xFFFF00); // Yellow = working
    
    // Set target position
    if (task.targetPlots && task.targetPlots.length > 0) {
      this.targetPosition.copy(task.targetPlots[0].position);
    }
    
    // Show path line
    this.showPathLine();
    
    // Attach appropriate tool
    this.attachTool(task.type);
  }

  /**
   * Attach tool based on task type
   */
  attachTool(taskType) {
    // Remove old tool
    if (this.tool) {
      this.mesh.remove(this.tool);
      this.tool = null;
    }
    
    let toolMesh;
    
    switch (taskType) {
      case 'water':
        toolMesh = this.createWateringCan();
        break;
      case 'plant':
        toolMesh = this.createSeedBag();
        break;
      case 'harvest':
        toolMesh = this.createBasket();
        break;
      case 'scan':
        toolMesh = this.createScanner();
        break;
    }
    
    if (toolMesh) {
      toolMesh.position.set(0.3, -0.1, 0);
      this.mesh.add(toolMesh);
      this.tool = toolMesh;
    }
  }

  createWateringCan() {
    const group = new THREE.Group();
    
    const canGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
    const canMaterial = new THREE.MeshStandardMaterial({ color: 0x4A90E2 });
    const can = new THREE.Mesh(canGeometry, canMaterial);
    group.add(can);
    
    return group;
  }

  createSeedBag() {
    const group = new THREE.Group();
    
    const bagGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.08);
    const bagMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const bag = new THREE.Mesh(bagGeometry, bagMaterial);
    group.add(bag);
    
    return group;
  }

  createBasket() {
    const group = new THREE.Group();
    
    const basketGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.12, 8);
    const basketMaterial = new THREE.MeshStandardMaterial({ color: 0xD2691E });
    const basket = new THREE.Mesh(basketGeometry, basketMaterial);
    group.add(basket);
    
    return group;
  }

  createScanner() {
    const group = new THREE.Group();
    
    const scannerGeometry = new THREE.BoxGeometry(0.06, 0.12, 0.02);
    const scannerMaterial = new THREE.MeshStandardMaterial({ color: 0x356899 });
    const scanner = new THREE.Mesh(scannerGeometry, scannerMaterial);
    group.add(scanner);
    
    return group;
  }

  /**
   * Show path line from current position to target
   */
  showPathLine() {
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
    }
    
    const points = [
      this.position.clone(),
      this.targetPosition.clone()
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0x34A853,
      dashSize: 0.2,
      gapSize: 0.1,
      linewidth: 2
    });
    
    this.pathLine = new THREE.Line(geometry, material);
    this.pathLine.computeLineDistances();
    this.scene.add(this.pathLine);
  }

  hidePathLine() {
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
      this.pathLine = null;
    }
  }

  /**
   * Navigate to target position
   */
  navigateTo(targetPos) {
    this.targetPosition.copy(targetPos);
    this.status = 'moving';
    this.showPathLine();
  }

  /**
   * Update worker (call each frame)
   */
  update(deltaTime) {
    if (this.status === 'moving') {
      this.updateMovement(deltaTime);
    } else if (this.status === 'working') {
      this.updateWork(deltaTime);
    }
    
    // Update mesh position
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
  }

  updateMovement(deltaTime) {
    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, this.position)
      .normalize();
    
    const distance = this.position.distanceTo(this.targetPosition);
    const moveDistance = this.speed * deltaTime;
    
    if (distance < moveDistance) {
      // Reached target
      this.position.copy(this.targetPosition);
      this.hidePathLine();
      
      if (this.currentTask) {
        this.startWork();
      } else {
        this.status = 'idle';
        this.setStatusLight(0x00FF00); // Green = idle
      }
    } else {
      // Keep moving
      this.position.add(direction.multiplyScalar(moveDistance));
      
      // Rotate to face direction
      if (this.mesh) {
        this.mesh.lookAt(this.targetPosition);
      }
    }
  }

  /**
   * Start working on task
   */
  startWork() {
    this.status = 'working';
    this.setStatusLight(0xFF9800); // Orange = working
    this.showSpeechBubble(this.getWorkMessage());
    
    // Perform task action
    this.performTaskAction();
  }

  performTaskAction() {
    if (!this.currentTask) return;
    
    const task = this.currentTask;
    const duration = task.duration || 3000; // 3 seconds default
    
    // Animate tool
    this.animateTool(task.type);
    
    // Complete after duration
    setTimeout(() => {
      this.completeWork();
    }, duration);
  }

  animateTool(taskType) {
    if (!this.tool) return;
    
    // Simple animation - rotate tool
    const startTime = Date.now();
    const duration = 1000;
    
    const animate = () => {
      if (this.status !== 'working') return;
      
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % duration) / duration;
      
      this.tool.rotation.z = Math.sin(progress * Math.PI * 2) * 0.3;
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  completeWork() {
    if (!this.currentTask) return;
    
    // Update plot state
    if (this.currentTask.targetPlots) {
      this.currentTask.targetPlots.forEach(plot => {
        switch (this.currentTask.type) {
          case 'water':
            plot.userData.lastWatered = Date.now();
            plot.userData.soilMoisture = Math.min(100, (plot.userData.soilMoisture || 50) + 30);
            break;
          case 'plant':
            plot.userData.planted = true;
            plot.userData.plantedAt = Date.now();
            break;
          case 'harvest':
            plot.userData.harvested = true;
            plot.userData.harvestedAt = Date.now();
            break;
        }
      });
    }
    
    // Mark task complete
    this.currentTask.status = 'completed';
    this.currentTask.progress = 100;
    
    this.hideSpeechBubble();
    
    // Return to home
    this.returnHome();
  }

  returnHome() {
    this.status = 'returning';
    this.navigateTo(this.homePosition);
    this.currentTask = null;
    
    // Remove tool
    if (this.tool) {
      this.mesh.remove(this.tool);
      this.tool = null;
    }
    
    // When reached home, set to idle
    const checkHome = setInterval(() => {
      if (this.position.distanceTo(this.homePosition) < 0.1) {
        this.status = 'idle';
        this.setStatusLight(0x00FF00);
        clearInterval(checkHome);
      }
    }, 100);
  }

  getWorkMessage() {
    if (!this.currentTask) return 'Working...';
    
    const messages = {
      water: 'Watering crops...',
      plant: 'Planting seeds...',
      harvest: 'Harvesting crops...',
      scan: 'Scanning for issues...'
    };
    
    return messages[this.currentTask.type] || 'Working...';
  }

  showSpeechBubble(text) {
    this.hideSpeechBubble();
    
    // Create canvas for text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 35);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1, 0.25, 1);
    sprite.position.y = 0.8;
    
    this.mesh.add(sprite);
    this.speechBubble = sprite;
  }

  hideSpeechBubble() {
    if (this.speechBubble) {
      this.mesh.remove(this.speechBubble);
      this.speechBubble.material.map.dispose();
      this.speechBubble.material.dispose();
      this.speechBubble = null;
    }
  }

  setStatusLight(color) {
    if (this.statusLight) {
      this.statusLight.material.color.setHex(color);
      this.statusLight.material.emissive.setHex(color);
    }
  }

  pauseTask() {
    if (this.status === 'working' || this.status === 'moving') {
      this.status = 'paused';
      this.setStatusLight(0xFF0000); // Red = paused
      this.showSpeechBubble('Paused');
    }
  }

  resumeTask() {
    if (this.status === 'paused') {
      this.status = 'working';
      this.setStatusLight(0xFF9800);
      this.hideSpeechBubble();
    }
  }

  cancelTask() {
    this.currentTask = null;
    this.returnHome();
    this.hideSpeechBubble();
  }

  getTaskProgress() {
    // Simple progress based on time
    if (!this.currentTask || this.status !== 'working') return 0;
    
    const elapsed = Date.now() - (this.currentTask.startTime || Date.now());
    const duration = this.currentTask.duration || 3000;
    
    return Math.min(100, (elapsed / duration) * 100);
  }

  dispose() {
    this.hidePathLine();
    this.hideSpeechBubble();
    
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
}

export default AutomatedWorker;
