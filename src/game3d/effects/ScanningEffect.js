import * as THREE from 'three';

/**
 * Scanning Effect - Visual effects for disease scanner
 * Creates beam and particle effects during crop scanning
 */
export class ScanningEffect {
  constructor(scene, source, target) {
    this.scene = scene;
    this.source = source; // Scanner lens
    this.target = target; // Crop being scanned
    this.beam = null;
    this.particles = null;
    this.isActive = false;
    this.animationTime = 0;
  }

  start() {
    this.isActive = true;
    this.createBeam();
    this.createParticles();
    this.animate();
  }

  stop() {
    this.isActive = false;
    this.cleanup();
  }

  /**
   * Create scanning beam from tool to crop
   */
  createBeam() {
    const sourcePos = new THREE.Vector3();
    const targetPos = new THREE.Vector3();
    
    this.source.getWorldPosition(sourcePos);
    targetPos.copy(this.target.position);
    
    // Create beam geometry
    const points = [sourcePos, targetPos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Animated beam material
    const material = new THREE.LineBasicMaterial({
      color: 0x34A853,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    
    this.beam = new THREE.Line(geometry, material);
    this.scene.add(this.beam);
    
    // Add glow effect
    this.createBeamGlow(sourcePos, targetPos);
  }

  createBeamGlow(sourcePos, targetPos) {
    // Create glowing cylinder along beam path
    const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
    const length = direction.length();
    direction.normalize();
    
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x34A853,
      transparent: true,
      opacity: 0.3
    });
    
    const glow = new THREE.Mesh(geometry, material);
    
    // Position and orient cylinder
    glow.position.copy(sourcePos).add(direction.multiplyScalar(length / 2));
    glow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    );
    
    this.scene.add(glow);
    this.beamGlow = glow;
  }

  /**
   * Create particle effects around scanned crop
   */
  createParticles() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const targetPos = this.target.position;
    const color = new THREE.Color(0x34A853);
    
    for (let i = 0; i < particleCount; i++) {
      // Random position around crop
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 0.5 + Math.random() * 0.5;
      
      positions[i * 3] = targetPos.x + radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = targetPos.y + radius * Math.cos(phi);
      positions[i * 3 + 2] = targetPos.z + radius * Math.sin(phi) * Math.sin(theta);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 0.1 + 0.05;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
    
    // Store initial positions for animation
    this.particleInitialPositions = positions.slice();
  }

  /**
   * Animate scanning effects
   */
  animate() {
    if (!this.isActive) return;
    
    this.animationTime += 0.016; // ~60fps
    
    // Pulse beam opacity
    if (this.beam) {
      this.beam.material.opacity = 0.5 + Math.sin(this.animationTime * 10) * 0.3;
    }
    
    if (this.beamGlow) {
      this.beamGlow.material.opacity = 0.2 + Math.sin(this.animationTime * 10) * 0.1;
    }
    
    // Swirl particles around crop
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      const targetPos = this.target.position;
      
      for (let i = 0; i < positions.length / 3; i++) {
        const idx = i * 3;
        
        // Get current position
        const x = positions[idx] - targetPos.x;
        const y = positions[idx + 1] - targetPos.y;
        const z = positions[idx + 2] - targetPos.z;
        
        // Rotate around Y axis
        const angle = this.animationTime * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        positions[idx] = targetPos.x + x * cos - z * sin;
        positions[idx + 2] = targetPos.z + x * sin + z * cos;
        
        // Bob up and down
        positions[idx + 1] += Math.sin(this.animationTime * 5 + i) * 0.01;
      }
      
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Continue animation
    requestAnimationFrame(() => this.animate());
  }

  /**
   * Cleanup effects
   */
  cleanup() {
    if (this.beam) {
      this.scene.remove(this.beam);
      this.beam.geometry.dispose();
      this.beam.material.dispose();
      this.beam = null;
    }
    
    if (this.beamGlow) {
      this.scene.remove(this.beamGlow);
      this.beamGlow.geometry.dispose();
      this.beamGlow.material.dispose();
      this.beamGlow = null;
    }
    
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
      this.particles = null;
    }
  }
}

/**
 * Scan Particles - Simplified particle system for scanning
 */
export class ScanParticles {
  constructor(position) {
    this.position = position;
    this.particles = [];
  }

  emit(duration) {
    // Create particle burst
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = {
        position: this.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          Math.random() * 0.03,
          (Math.random() - 0.5) * 0.02
        ),
        life: duration,
        maxLife: duration
      };
      
      this.particles.push(particle);
    }
  }

  update(deltaTime) {
    this.particles.forEach((particle, index) => {
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        return;
      }
      
      // Update position
      particle.position.add(particle.velocity);
      
      // Apply gravity
      particle.velocity.y -= 0.001;
    });
  }
}

/**
 * Scan Beam - Animated beam from scanner to target
 */
export class ScanBeam {
  constructor(sourcePos, targetPos) {
    this.sourcePos = sourcePos;
    this.targetPos = targetPos;
    this.progress = 0;
    this.mesh = null;
  }

  animate() {
    // Animate beam traveling from source to target
    const duration = 500; // 0.5 seconds
    const startTime = Date.now();
    
    const animateStep = () => {
      const elapsed = Date.now() - startTime;
      this.progress = Math.min(elapsed / duration, 1);
      
      if (this.progress < 1) {
        requestAnimationFrame(animateStep);
      }
    };
    
    animateStep();
  }

  getPosition() {
    // Interpolate between source and target
    return new THREE.Vector3().lerpVectors(
      this.sourcePos,
      this.targetPos,
      this.progress
    );
  }
}

export default ScanningEffect;
