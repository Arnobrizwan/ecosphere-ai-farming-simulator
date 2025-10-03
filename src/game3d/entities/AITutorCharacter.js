import * as THREE from 'three';

/**
 * AI Tutor 3D Character - AgriBot
 * A friendly companion that follows the player and provides contextual farming guidance
 */
export class AITutorCharacter {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.mesh = null;
    this.screen = null;
    this.indicator = null;
    this.arrow = null;
    this.targetPosition = new THREE.Vector3();
    this.offset = new THREE.Vector3(2, 1.5, 0); // Hover near player's shoulder
    this.isActive = true;
    this.currentState = 'idle'; // idle, speaking, pointing, thinking
    this.animationTime = 0;
    
    this.createMesh();
    this.addToScene();
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Main body (glowing sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x34A853,
      emissive: 0x34A853,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);
    this.body = body;
    
    // Antenna with data symbol
    const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x356899 });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.y = 0.9;
    group.add(antenna);
    
    // Antenna tip (glowing orb)
    const tipGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xF9F6B8 });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.y = 1.3;
    group.add(tip);
    this.antennaTip = tip;
    
    // Holographic screen (shows icons/data)
    const screenGeometry = new THREE.PlaneGeometry(0.6, 0.4);
    const screenMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.6;
    screen.visible = false;
    group.add(screen);
    this.screen = screen;
    
    // Indicator icon (exclamation, question, etc.)
    this.createIndicator(group);
    
    this.mesh = group;
    this.mesh.position.set(0, 2, 0);
  }

  createIndicator(parent) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw exclamation mark
    ctx.fillStyle = '#F9F6B8';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 1);
    sprite.position.y = 1.2;
    parent.add(sprite);
    
    this.indicator = sprite;
  }

  addToScene() {
    if (this.mesh) {
      this.scene.add(this.mesh);
    }
  }

  removeFromScene() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
    if (this.arrow) {
      this.scene.remove(this.arrow);
      this.arrow = null;
    }
  }

  /**
   * Update tutor position to follow player
   */
  update(deltaTime) {
    if (!this.mesh || !this.player || !this.isActive) return;
    
    this.animationTime += deltaTime;
    
    // Calculate target position (near player's shoulder)
    this.targetPosition.copy(this.player.position);
    this.targetPosition.add(this.offset);
    
    // Smooth follow with lerp
    this.mesh.position.lerp(this.targetPosition, 0.05);
    
    // Idle animation - bobbing motion
    if (this.currentState === 'idle') {
      this.mesh.position.y += Math.sin(this.animationTime * 2) * 0.01;
      this.mesh.rotation.y += deltaTime * 0.5;
    }
    
    // Pulsing glow effect
    if (this.body) {
      const intensity = 0.3 + Math.sin(this.animationTime * 3) * 0.1;
      this.body.material.emissiveIntensity = intensity;
    }
    
    // Antenna tip glow
    if (this.antennaTip) {
      const scale = 1 + Math.sin(this.animationTime * 4) * 0.2;
      this.antennaTip.scale.set(scale, scale, scale);
    }
    
    // Face player (billboard effect for screen)
    if (this.screen && this.screen.visible) {
      this.screen.lookAt(this.player.position);
    }
  }

  /**
   * Show indicator above tutor's head
   */
  showIndicator(type = 'exclamation') {
    if (!this.indicator) return;
    
    // Update icon based on type
    const icons = {
      exclamation: '!',
      question: '?',
      lightbulb: '💡',
      warning: '⚠️'
    };
    
    const canvas = this.indicator.material.map.image;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#F9F6B8';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[type] || '!', 64, 64);
    this.indicator.material.map.needsUpdate = true;
    
    // Fade in
    this.indicator.material.opacity = 1;
  }

  hideIndicator() {
    if (this.indicator) {
      this.indicator.material.opacity = 0;
    }
  }

  /**
   * Point to a specific object in the game world
   */
  pointTo(targetObject) {
    if (!targetObject || !this.mesh) return;
    
    this.currentState = 'pointing';
    
    // Move tutor closer to target
    const direction = new THREE.Vector3()
      .subVectors(targetObject.position, this.mesh.position)
      .normalize();
    
    const newPosition = new THREE.Vector3()
      .copy(targetObject.position)
      .sub(direction.multiplyScalar(3));
    
    this.targetPosition.copy(newPosition);
    
    // Create arrow/beam pointing to target
    this.createArrow(targetObject.position);
    
    // Add glow to target
    if (targetObject.userData && targetObject.userData.addGlow) {
      targetObject.userData.addGlow(0xF9F6B8);
    }
  }

  createArrow(targetPosition) {
    // Remove old arrow
    if (this.arrow) {
      this.scene.remove(this.arrow);
    }
    
    // Create line from tutor to target
    const points = [
      this.mesh.position.clone(),
      targetPosition.clone()
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x34A853,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    
    this.arrow = new THREE.Line(geometry, material);
    this.scene.add(this.arrow);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (this.arrow) {
        this.scene.remove(this.arrow);
        this.arrow = null;
      }
      this.currentState = 'idle';
    }, 3000);
  }

  /**
   * Show holographic data display
   */
  showHologram(data) {
    if (!this.screen) return;
    
    this.screen.visible = true;
    this.currentState = 'speaking';
    
    // Update screen texture with data visualization
    // (In full implementation, render chart/graph to canvas texture)
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.screen.visible = false;
      this.currentState = 'idle';
    }, 5000);
  }

  hideHologram() {
    if (this.screen) {
      this.screen.visible = false;
    }
    this.currentState = 'idle';
  }

  /**
   * Change tutor's emotional state
   */
  setEmotion(emotion) {
    // happy, thinking, concerned, celebrating
    switch (emotion) {
      case 'happy':
        this.body.material.color.setHex(0x34A853);
        break;
      case 'thinking':
        this.body.material.color.setHex(0x356899);
        break;
      case 'concerned':
        this.body.material.color.setHex(0xFF9800);
        break;
      case 'celebrating':
        this.body.material.color.setHex(0xF9F6B8);
        break;
      default:
        this.body.material.color.setHex(0x34A853);
    }
  }

  /**
   * Toggle tutor visibility
   */
  setActive(active) {
    this.isActive = active;
    if (this.mesh) {
      this.mesh.visible = active;
    }
  }

  /**
   * Get distance to player
   */
  getDistanceToPlayer() {
    if (!this.mesh || !this.player) return Infinity;
    return this.mesh.position.distanceTo(this.player.position);
  }

  /**
   * Cleanup
   */
  dispose() {
    this.removeFromScene();
    
    if (this.mesh) {
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

export default AITutorCharacter;
