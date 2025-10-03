import * as THREE from 'three';

/**
 * Holographic Diagnosis Display - 3D floating panel showing disease scan results
 * Appears above scanned crop in game world
 */
export class HolographicDiagnosis {
  constructor(scene, crop, diagnosis) {
    this.scene = scene;
    this.crop = crop;
    this.diagnosis = diagnosis;
    this.panel = null;
    this.isVisible = false;
    this.interactiveElements = [];
  }

  /**
   * Create and show holographic panel
   */
  show() {
    this.createPanel();
    this.isVisible = true;
  }

  /**
   * Hide and cleanup panel
   */
  hide() {
    if (this.panel) {
      this.scene.remove(this.panel);
      this.cleanup();
    }
    this.isVisible = false;
  }

  /**
   * Create holographic panel with diagnosis info
   */
  createPanel() {
    const group = new THREE.Group();
    
    // Position above crop
    group.position.copy(this.crop.position);
    group.position.y += 2;
    
    // Background panel
    const panelBg = this.createPanelBackground();
    group.add(panelBg);
    
    // Content
    if (this.diagnosis.healthy) {
      this.createHealthyDisplay(group);
    } else {
      this.createDiseaseDisplay(group);
    }
    
    this.panel = group;
    this.scene.add(this.panel);
    
    // Make panel always face camera
    this.setupBillboard();
  }

  createPanelBackground() {
    const geometry = new THREE.PlaneGeometry(2, 2.5);
    const material = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const bg = new THREE.Mesh(geometry, material);
    
    // Border
    const borderGeometry = new THREE.EdgesGeometry(geometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x34A853,
      linewidth: 2
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    bg.add(border);
    
    return bg;
  }

  createHealthyDisplay(group) {
    // Title
    const titleMesh = this.create3DText('✓ HEALTHY', 0.2, 0x34A853);
    titleMesh.position.y = 1;
    group.add(titleMesh);
    
    // Confidence
    const confidenceText = this.create3DText(
      `Confidence: ${Math.round(this.diagnosis.confidence * 100)}%`,
      0.12,
      0xFFFFFF
    );
    confidenceText.position.y = 0.6;
    group.add(confidenceText);
    
    // Message
    const messageMesh = this.create3DText(
      this.diagnosis.message,
      0.1,
      0xFFFFFF
    );
    messageMesh.position.y = 0.2;
    group.add(messageMesh);
  }

  createDiseaseDisplay(group) {
    // Warning icon
    const iconMesh = this.create3DText('⚠️', 0.3, 0xFF9800);
    iconMesh.position.y = 1.1;
    group.add(iconMesh);
    
    // Disease name
    const nameMesh = this.create3DText(this.diagnosis.diseaseName, 0.18, 0xFF4444);
    nameMesh.position.y = 0.8;
    group.add(nameMesh);
    
    // Confidence bar
    const confidenceBar = this.create3DProgressBar(
      this.diagnosis.confidence,
      1.5,
      0.15,
      0x34A853
    );
    confidenceBar.position.y = 0.5;
    group.add(confidenceBar);
    
    const confidenceLabel = this.create3DText(
      `${Math.round(this.diagnosis.confidence * 100)}% Confidence`,
      0.08,
      0xFFFFFF
    );
    confidenceLabel.position.y = 0.35;
    group.add(confidenceLabel);
    
    // Severity
    const severityIcons = this.getSeverityIcons(this.diagnosis.severity);
    const severityMesh = this.create3DText(
      `Severity: ${severityIcons}`,
      0.12,
      0xFF9800
    );
    severityMesh.position.y = 0.1;
    group.add(severityMesh);
    
    // Treatment buttons
    this.createTreatmentButtons(group);
    
    // Highlight affected parts on crop
    this.highlightAffectedParts();
  }

  create3DText(text, size, color) {
    // Create text using canvas texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = `bold ${size * 200}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size * 5, size * 1.25, 1);
    
    return sprite;
  }

  create3DProgressBar(value, width, height, color) {
    const group = new THREE.Group();
    
    // Background
    const bgGeometry = new THREE.PlaneGeometry(width, height);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.5
    });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(bg);
    
    // Fill
    const fillWidth = width * value;
    const fillGeometry = new THREE.PlaneGeometry(fillWidth, height);
    const fillMaterial = new THREE.MeshBasicMaterial({ color });
    const fill = new THREE.Mesh(fillGeometry, fillMaterial);
    fill.position.x = -(width - fillWidth) / 2;
    fill.position.z = 0.01;
    group.add(fill);
    
    return group;
  }

  getSeverityIcons(severity) {
    const icons = {
      low: '⚠️',
      moderate: '⚠️⚠️',
      high: '⚠️⚠️⚠️'
    };
    return icons[severity] || '⚠️';
  }

  createTreatmentButtons(group) {
    const treatments = this.diagnosis.treatments || [];
    
    treatments.forEach((treatment, index) => {
      const button = this.createButton(
        `${treatment.icon} ${treatment.name}`,
        0.12,
        0x34A853
      );
      button.position.y = -0.3 - (index * 0.3);
      button.userData.treatment = treatment;
      button.userData.interactive = true;
      group.add(button);
      
      this.interactiveElements.push(button);
    });
    
    // View Details button
    const detailsButton = this.createButton('View Details', 0.1, 0x356899);
    detailsButton.position.y = -0.3 - (treatments.length * 0.3) - 0.2;
    detailsButton.userData.action = 'viewDetails';
    detailsButton.userData.interactive = true;
    group.add(detailsButton);
    
    this.interactiveElements.push(detailsButton);
  }

  createButton(text, size, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    // Button background
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.fillRect(0, 0, 512, 128);
    
    // Button text
    context.fillStyle = '#FFFFFF';
    context.font = `bold ${size * 150}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.4, 1);
    
    return sprite;
  }

  highlightAffectedParts() {
    if (!this.diagnosis.affectedParts) return;
    
    this.crop.traverse((child) => {
      if (child.isMesh && child.userData.isLeaf) {
        // Add red highlight glow
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xFF0000,
          transparent: true,
          opacity: 0.3,
          side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(child.geometry.clone(), glowMaterial);
        glowMesh.scale.multiplyScalar(1.05);
        child.add(glowMesh);
        
        // Store for cleanup
        child.userData.highlightGlow = glowMesh;
      }
    });
  }

  removeHighlights() {
    this.crop.traverse((child) => {
      if (child.userData.highlightGlow) {
        child.remove(child.userData.highlightGlow);
        child.userData.highlightGlow.geometry.dispose();
        child.userData.highlightGlow.material.dispose();
        delete child.userData.highlightGlow;
      }
    });
  }

  setupBillboard() {
    // Make panel always face camera
    if (this.panel && this.scene.camera) {
      this.panel.lookAt(this.scene.camera.position);
    }
  }

  /**
   * Update panel (call each frame)
   */
  update(camera) {
    if (!this.panel || !this.isVisible) return;
    
    // Billboard effect - always face camera
    if (camera) {
      this.panel.lookAt(camera.position);
    }
    
    // Gentle floating animation
    this.panel.position.y = this.crop.position.y + 2 + Math.sin(Date.now() * 0.001) * 0.1;
  }

  /**
   * Check if user clicked on interactive element
   */
  checkInteraction(raycaster) {
    const intersects = raycaster.intersectObjects(this.interactiveElements, true);
    
    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      
      if (clicked.userData.treatment) {
        return {
          type: 'treatment',
          data: clicked.userData.treatment
        };
      }
      
      if (clicked.userData.action === 'viewDetails') {
        return {
          type: 'details',
          data: this.diagnosis
        };
      }
    }
    
    return null;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.removeHighlights();
    
    if (this.panel) {
      this.panel.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    }
    
    this.interactiveElements = [];
  }
}

export default HolographicDiagnosis;
