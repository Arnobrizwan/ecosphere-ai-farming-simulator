import * as THREE from 'three';

/**
 * Disease Scanner Tool - Handheld device for crop disease detection
 * Player holds this tool to scan crops for diseases in 3D game world
 */
export class DiseaseScannerTool {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.mesh = null;
    this.screen = null;
    this.lens = null;
    this.isActive = false;
    this.isScanning = false;
    this.targetCrop = null;
    this.scanRange = 3; // 3 units max scan distance
    this.scanDuration = 2000; // 2 seconds
    this.reticle = null;
    
    this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Scanner body (handheld device/smartphone-like)
    const bodyGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.02);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x356899,
      metalness: 0.6,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);
    
    // Screen (glowing blue when active)
    const screenGeometry = new THREE.PlaneGeometry(0.08, 0.15);
    const screenMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      emissive: 0x87CEEB,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.011;
    body.add(screen);
    this.screen = screen;
    
    // Screen text canvas
    this.createScreenCanvas();
    
    // Scanning lens (emits beam)
    const lensGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.03, 16);
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: 0x34A853,
      emissive: 0x34A853,
      emissiveIntensity: 0.8,
      metalness: 0.8
    });
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.12, 0);
    body.add(lens);
    this.lens = lens;
    
    // Grip/handle
    const gripGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x23272F,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.y = -0.14;
    body.add(grip);
    
    this.mesh = group;
    this.mesh.visible = false;
  }

  createScreenCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    
    // Default screen
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('READY', 128, 192);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.screen.material.map = texture;
    this.screenCanvas = canvas;
    this.screenContext = ctx;
  }

  updateScreenText(text, color = '#FFFFFF') {
    const ctx = this.screenContext;
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = color;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap
    const words = text.split(' ');
    let line = '';
    let y = 180;
    
    words.forEach(word => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 220 && line !== '') {
        ctx.fillText(line, 128, y);
        line = word + ' ';
        y += 30;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, 128, y);
    
    this.screen.material.map.needsUpdate = true;
  }

  /**
   * Equip/unequip tool
   */
  setActive(active) {
    this.isActive = active;
    this.mesh.visible = active;
    
    if (active) {
      this.attachToPlayer();
      this.updateScreenText('READY');
    } else {
      this.detachFromPlayer();
      if (this.reticle) {
        this.hideReticle();
      }
    }
  }

  attachToPlayer() {
    if (!this.player || !this.mesh) return;
    
    // Position in player's hand (right side, slightly forward)
    this.mesh.position.set(0.3, -0.2, -0.5);
    this.mesh.rotation.set(-0.3, 0.2, 0);
    
    // Attach to player (or camera in first-person)
    if (this.player.add) {
      this.player.add(this.mesh);
    } else {
      this.scene.add(this.mesh);
    }
  }

  detachFromPlayer() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }

  /**
   * Update tool (called each frame)
   */
  update(deltaTime) {
    if (!this.isActive) return;
    
    // Lens pulsing effect
    if (this.lens) {
      const intensity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
      this.lens.material.emissiveIntensity = intensity;
    }
    
    // Check for crops in range
    if (!this.isScanning) {
      this.checkForTarget();
    }
  }

  /**
   * Check for scannable crops in range
   */
  checkForTarget() {
    // Raycast from scanner lens forward
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    
    if (this.lens) {
      const worldPos = new THREE.Vector3();
      const worldDir = new THREE.Vector3();
      this.lens.getWorldPosition(worldPos);
      this.lens.getWorldDirection(worldDir);
      
      raycaster.set(worldPos, worldDir);
      
      // Find crops in scene (assuming they have userData.isCrop = true)
      const crops = this.scene.children.filter(obj => obj.userData && obj.userData.isCrop);
      const intersects = raycaster.intersectObjects(crops, true);
      
      if (intersects.length > 0) {
        const crop = intersects[0].object;
        const distance = intersects[0].distance;
        
        if (distance <= this.scanRange) {
          this.targetCrop = crop;
          this.showReticle(crop.position);
          return;
        }
      }
    }
    
    // No target found
    if (this.targetCrop) {
      this.targetCrop = null;
      this.hideReticle();
    }
  }

  /**
   * Show targeting reticle on crop
   */
  showReticle(position) {
    if (!this.reticle) {
      this.createReticle();
    }
    
    this.reticle.position.copy(position);
    this.reticle.position.y += 1; // Above crop
    this.reticle.visible = true;
    
    // Rotate reticle
    this.reticle.rotation.z += 0.02;
  }

  createReticle() {
    const geometry = new THREE.RingGeometry(0.3, 0.35, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x34A853,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.rotation.x = -Math.PI / 2;
    this.scene.add(this.reticle);
  }

  hideReticle() {
    if (this.reticle) {
      this.reticle.visible = false;
    }
  }

  /**
   * Start scanning process
   */
  async startScan() {
    if (this.isScanning || !this.targetCrop) {
      return { success: false, error: 'No target or already scanning' };
    }
    
    // Check distance
    const distance = this.getDistanceToTarget();
    if (distance > this.scanRange) {
      this.updateScreenText('TOO FAR\nMove closer', '#FF0000');
      return { success: false, error: 'Target out of range' };
    }
    
    this.isScanning = true;
    this.updateScreenText('SCANNING...', '#34A853');
    
    // Create scanning effects
    const effects = await import('./ScanningEffect');
    const scanEffect = new effects.ScanningEffect(
      this.scene,
      this.lens,
      this.targetCrop
    );
    
    scanEffect.start();
    
    // Wait for scan duration
    await new Promise(resolve => setTimeout(resolve, this.scanDuration));
    
    scanEffect.stop();
    
    // Process scan results
    const results = this.analyzeCrop(this.targetCrop);
    
    this.isScanning = false;
    this.updateScreenText('COMPLETE', '#34A853');
    
    return {
      success: true,
      crop: this.targetCrop,
      diagnosis: results
    };
  }

  /**
   * Analyze crop for diseases
   */
  analyzeCrop(crop) {
    const diseaseData = crop.userData.disease || null;
    
    if (!diseaseData) {
      return {
        healthy: true,
        confidence: 0.95,
        message: 'Crop is healthy! ✓'
      };
    }
    
    // Return disease information
    return {
      healthy: false,
      diseaseType: diseaseData.type,
      diseaseName: diseaseData.name,
      severity: diseaseData.severity || 'moderate',
      confidence: diseaseData.confidence || 0.87,
      affectedParts: diseaseData.affectedParts || ['leaves'],
      symptoms: diseaseData.symptoms || [],
      treatments: diseaseData.treatments || [],
      cause: diseaseData.cause || 'Unknown',
      spreadRisk: diseaseData.spreadRisk || 'medium'
    };
  }

  /**
   * Get distance to current target
   */
  getDistanceToTarget() {
    if (!this.targetCrop || !this.lens) return Infinity;
    
    const lensPos = new THREE.Vector3();
    this.lens.getWorldPosition(lensPos);
    
    return lensPos.distanceTo(this.targetCrop.position);
  }

  /**
   * Cancel current scan
   */
  cancelScan() {
    this.isScanning = false;
    this.updateScreenText('CANCELLED', '#FF9800');
  }

  /**
   * Cleanup
   */
  dispose() {
    this.detachFromPlayer();
    
    if (this.reticle) {
      this.scene.remove(this.reticle);
      this.reticle.geometry.dispose();
      this.reticle.material.dispose();
    }
    
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

export default DiseaseScannerTool;
