import * as THREE from 'three';

/**
 * Recommendation Beacon - 3D visual marker for recommendations in game world
 * Appears at relevant locations with priority-based appearance
 */
export class RecommendationBeacon {
  constructor(scene, recommendation) {
    this.scene = scene;
    this.recommendation = recommendation;
    this.mesh = null;
    this.ring = null;
    this.icon = null;
    this.particleSystem = null;
    this.isActive = true;
    
    this.createMesh();
    
    // Position at first location
    if (recommendation.locations && recommendation.locations.length > 0) {
      this.mesh.position.copy(recommendation.locations[0]);
    }
    
    this.scene.add(this.mesh);
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Priority determines appearance
    const colors = {
      CRITICAL: 0xFF0000, // Red, pulsing
      HIGH: 0xFFA500,     // Orange, glowing
      MEDIUM: 0xFFFF00,   // Yellow, steady
      LOW: 0x87CEEB       // Light blue, subtle
    };
    
    const color = colors[this.recommendation.priority] || 0x87CEEB;
    
    // Beacon pillar
    const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 5, 8);
    const pillarMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6
    });
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.y = 2.5;
    group.add(pillar);
    this.pillar = pillar;
    
    // Rotating ring at top
    const ringGeometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 5;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    this.ring = ring;
    
    // Icon sprite
    this.icon = this.createIconSprite(this.recommendation.type, color);
    this.icon.position.y = 6;
    group.add(this.icon);
    
    // Particle effects
    this.particleSystem = this.createParticles(color);
    group.add(this.particleSystem);
    
    this.mesh = group;
  }

  createIconSprite(type, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Background circle
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Icon based on type
    const icons = {
      irrigation: '💧',
      harvest: '🌾',
      disease_prevention: '🛡️',
      crop_rescue: '🚨',
      efficiency: '⚡',
      expansion: '📈',
      strategy: '🎯',
      preparation: '⚠️'
    };
    
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[type] || '❓', 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 1.5, 1);
    
    return sprite;
  }

  createParticles(color) {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const particleColor = new THREE.Color(color);
    
    for (let i = 0; i < particleCount; i++) {
      // Random position around beacon
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      const height = Math.random() * 5;
      
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
      
      colors[i * 3] = particleColor.r;
      colors[i * 3 + 1] = particleColor.g;
      colors[i * 3 + 2] = particleColor.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
  }

  update(deltaTime, camera) {
    if (!this.isActive) return;
    
    // Rotate ring
    if (this.ring) {
      this.ring.rotation.z += deltaTime * 2;
    }
    
    // Pulse opacity for critical
    if (this.recommendation.priority === 'CRITICAL' && this.pillar) {
      const pulse = Math.sin(Date.now() * 0.003);
      this.pillar.material.opacity = 0.4 + pulse * 0.3;
    }
    
    // Float icon
    if (this.icon) {
      this.icon.position.y = 6 + Math.sin(Date.now() * 0.002) * 0.2;
      
      // Billboard effect - face camera
      if (camera) {
        this.icon.lookAt(camera.position);
      }
    }
    
    // Animate particles
    if (this.particleSystem) {
      const positions = this.particleSystem.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length / 3; i++) {
        const idx = i * 3;
        
        // Rise upward
        positions[idx + 1] += deltaTime * 0.5;
        
        // Reset if too high
        if (positions[idx + 1] > 5) {
          positions[idx + 1] = 0;
        }
        
        // Spiral motion
        const angle = Date.now() * 0.001 + i;
        const radius = 1 + Math.sin(positions[idx + 1]) * 0.5;
        positions[idx] = Math.cos(angle) * radius;
        positions[idx + 2] = Math.sin(angle) * radius;
      }
      
      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Check if player is in interaction range
   */
  isPlayerInRange(playerPosition) {
    if (!this.mesh) return false;
    return this.mesh.position.distanceTo(playerPosition) < 3;
  }

  /**
   * Highlight beacon when player is near
   */
  highlight() {
    if (this.ring) {
      this.ring.material.emissiveIntensity = 1.5;
    }
  }

  unhighlight() {
    if (this.ring) {
      this.ring.material.emissiveIntensity = 0.8;
    }
  }

  /**
   * Show info panel above beacon
   */
  showInfoPanel() {
    if (this.infoPanel) return; // Already showing
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = 'rgba(35, 39, 47, 0.95)';
    ctx.fillRect(0, 0, 512, 256);
    
    // Border
    ctx.strokeStyle = '#34A853';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 252);
    
    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(this.recommendation.title, 20, 40);
    
    // Description
    ctx.font = '18px Arial';
    ctx.fillStyle = '#CCCCCC';
    this.wrapText(ctx, this.recommendation.description, 20, 80, 472, 24);
    
    // Priority badge
    const priorityColors = {
      CRITICAL: '#FF0000',
      HIGH: '#FFA500',
      MEDIUM: '#FFFF00',
      LOW: '#87CEEB'
    };
    ctx.fillStyle = priorityColors[this.recommendation.priority];
    ctx.fillRect(20, 180, 120, 40);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(this.recommendation.priority, 40, 205);
    
    // Reward
    if (this.recommendation.reward) {
      ctx.fillStyle = '#34A853';
      ctx.font = '16px Arial';
      ctx.fillText(`+${this.recommendation.reward.xp} XP`, 160, 205);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2, 1);
    sprite.position.y = 7;
    
    this.mesh.add(sprite);
    this.infoPanel = sprite;
  }

  hideInfoPanel() {
    if (this.infoPanel) {
      this.mesh.remove(this.infoPanel);
      this.infoPanel.material.map.dispose();
      this.infoPanel.material.dispose();
      this.infoPanel = null;
    }
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  /**
   * Remove beacon from scene
   */
  dispose() {
    this.isActive = false;
    
    if (this.mesh) {
      this.scene.remove(this.mesh);
      
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
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

export default RecommendationBeacon;
