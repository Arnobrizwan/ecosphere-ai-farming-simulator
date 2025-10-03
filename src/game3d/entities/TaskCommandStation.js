import * as THREE from 'three';

/**
 * Task Command Station - 3D structure for creating and managing tasks
 * Interactive terminal in the game world
 */
export class TaskCommandStation {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position || new THREE.Vector3(0, 0, -5);
    this.mesh = null;
    this.screen = null;
    this.taskCards = [];
    this.isActive = false;
    
    this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x23272F,
      metalness: 0.8,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    group.add(base);
    
    // Control panel (futuristic terminal)
    const panelGeometry = new THREE.BoxGeometry(2, 1.5, 0.2);
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x356899,
      metalness: 0.7,
      roughness: 0.3
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.y = 1;
    panel.castShadow = true;
    group.add(panel);
    
    // Holographic screen
    const screenGeometry = new THREE.PlaneGeometry(1.8, 1.2);
    const screenMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 1, 0.11);
    group.add(screen);
    this.screen = screen;
    
    // Create screen texture
    this.createScreenTexture();
    
    // Border lights
    const lightPositions = [
      [-1, 0.3, 0.11],
      [1, 0.3, 0.11],
      [-1, 1.7, 0.11],
      [1, 1.7, 0.11]
    ];
    
    lightPositions.forEach(pos => {
      const lightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0x34A853,
        emissive: 0x34A853,
        emissiveIntensity: 1
      });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(...pos);
      group.add(light);
    });
    
    // Support pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x23272F,
      metalness: 0.8
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 0.5;
    group.add(pole);
    
    // Interaction zone (invisible sphere for collision detection)
    const interactionGeometry = new THREE.SphereGeometry(2, 8, 8);
    const interactionMaterial = new THREE.MeshBasicMaterial({
      visible: false
    });
    const interactionZone = new THREE.Mesh(interactionGeometry, interactionMaterial);
    interactionZone.position.y = 1;
    group.add(interactionZone);
    this.interactionZone = interactionZone;
    
    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  createScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, 512, 384);
    
    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TASK COMMAND', 256, 60);
    
    // Menu options
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#34A853';
    ctx.fillText('Quick Tasks:', 256, 120);
    
    const quickTasks = [
      '💧 Daily Watering',
      '🌱 Weekly Planting',
      '🔬 Health Check'
    ];
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFFFFF';
    quickTasks.forEach((task, i) => {
      ctx.fillText(task, 256, 160 + i * 40);
    });
    
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#356899';
    ctx.fillText('⚙️ Build Custom Task', 256, 320);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.screen.material.map = texture;
    this.screenCanvas = canvas;
    this.screenContext = ctx;
  }

  updateScreenText(text) {
    const ctx = this.screenContext;
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, 512, 384);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 192);
    
    this.screen.material.map.needsUpdate = true;
  }

  /**
   * Check if player is in interaction range
   */
  isPlayerInRange(playerPosition) {
    const distance = this.position.distanceTo(playerPosition);
    return distance < 3; // 3 units interaction range
  }

  /**
   * Show interaction prompt
   */
  showInteractionPrompt() {
    // Create floating text above station
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to interact', 128, 35);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    sprite.position.y = 2.5;
    
    this.mesh.add(sprite);
    this.interactionPrompt = sprite;
  }

  hideInteractionPrompt() {
    if (this.interactionPrompt) {
      this.mesh.remove(this.interactionPrompt);
      this.interactionPrompt.material.map.dispose();
      this.interactionPrompt.material.dispose();
      this.interactionPrompt = null;
    }
  }

  /**
   * Handle player interaction
   */
  onPlayerInteract() {
    this.isActive = true;
    this.updateScreenText('Task Creation Active');
    
    // Return task creation interface data
    return {
      templates: [
        { id: 'dailyWatering', name: 'Daily Watering', icon: '💧' },
        { id: 'weeklyPlanting', name: 'Weekly Planting', icon: '🌱' },
        { id: 'healthCheck', name: 'Health Check', icon: '🔬' },
        { id: 'smartIrrigation', name: 'Smart Irrigation', icon: '💧' }
      ],
      customOption: true
    };
  }

  /**
   * Create task card visualization
   */
  createTaskCard(task) {
    const cardGroup = new THREE.Group();
    
    // Card background
    const cardGeometry = new THREE.PlaneGeometry(0.8, 0.5);
    const cardMaterial = new THREE.MeshBasicMaterial({
      color: 0x34A853,
      transparent: true,
      opacity: 0.9
    });
    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    cardGroup.add(card);
    
    // Task icon/text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(task.icon, 128, 50);
    
    ctx.font = 'bold 20px Arial';
    ctx.fillText(task.name, 128, 100);
    
    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.SpriteMaterial({ map: texture });
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.scale.set(0.8, 0.4, 1);
    textSprite.position.z = 0.01;
    cardGroup.add(textSprite);
    
    // Position above station
    cardGroup.position.set(
      this.position.x,
      this.position.y + 2,
      this.position.z
    );
    
    this.scene.add(cardGroup);
    this.taskCards.push(cardGroup);
    
    // Animate card flying to queue
    this.animateCardToQueue(cardGroup);
    
    return cardGroup;
  }

  animateCardToQueue(card) {
    const startPos = card.position.clone();
    const endPos = new THREE.Vector3(
      this.position.x + 3,
      this.position.y + 1,
      this.position.z
    );
    
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      card.position.lerpVectors(startPos, endPos, eased);
      card.rotation.y = progress * Math.PI * 2;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * Update station (call each frame)
   */
  update(deltaTime) {
    // Pulsing screen effect
    if (this.screen) {
      const opacity = 0.6 + Math.sin(Date.now() * 0.002) * 0.1;
      this.screen.material.opacity = opacity;
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    this.hideInteractionPrompt();
    
    // Remove task cards
    this.taskCards.forEach(card => {
      this.scene.remove(card);
      card.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    });
    
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    }
  }
}

export default TaskCommandStation;
