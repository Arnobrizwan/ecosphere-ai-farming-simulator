import * as THREE from 'three';

/**
 * Crop Disease System - Manages disease visualization and progression on 3D crops
 */
export class CropDiseaseSystem {
  constructor(scene) {
    this.scene = scene;
    this.diseasedCrops = new Map();
    this.diseaseDatabase = this.initDiseaseDatabase();
  }

  /**
   * Initialize disease database with symptoms and treatments
   */
  initDiseaseDatabase() {
    return {
      bacterialBlight: {
        name: 'Bacterial Blight',
        type: 'bacterialBlight',
        symptoms: [
          'Yellow-brown spots on leaves',
          'Wilted leaf edges',
          'Water-soaked lesions'
        ],
        visualEffects: {
          spotColor: 0xDEB887,
          spotCount: 5,
          wiltAmount: 0.3
        },
        treatments: [
          {
            name: 'Remove infected leaves',
            icon: '✂️',
            effectiveness: 0.7,
            steps: ['Identify infected leaves', 'Cut at base', 'Dispose properly']
          },
          {
            name: 'Apply copper fungicide',
            icon: '💧',
            effectiveness: 0.9,
            steps: ['Mix solution', 'Spray evenly', 'Repeat in 7 days']
          }
        ],
        cause: 'High humidity + Warm temperatures',
        spreadRate: 0.3,
        severity: 'moderate'
      },
      
      blast: {
        name: 'Rice Blast',
        type: 'blast',
        symptoms: [
          'Diamond-shaped lesions',
          'Gray-white centers',
          'Brown borders on leaves'
        ],
        visualEffects: {
          lesionColor: 0x8B4513,
          lesionShape: 'diamond',
          lesionCount: 8
        },
        treatments: [
          {
            name: 'Fungicide application',
            icon: '🧪',
            effectiveness: 0.85,
            steps: ['Apply systemic fungicide', 'Ensure good coverage', 'Monitor for 2 weeks']
          },
          {
            name: 'Improve drainage',
            icon: '🌊',
            effectiveness: 0.6,
            steps: ['Check water levels', 'Add drainage channels', 'Reduce standing water']
          }
        ],
        cause: 'Excess moisture + Poor air circulation',
        spreadRate: 0.5,
        severity: 'high'
      },
      
      leafRust: {
        name: 'Leaf Rust',
        type: 'leafRust',
        symptoms: [
          'Orange-red pustules',
          'Powdery spores',
          'Yellowing leaves'
        ],
        visualEffects: {
          pustuleColor: 0xFF4500,
          pustuleCount: 10,
          yellowTint: 0.4
        },
        treatments: [
          {
            name: 'Rust-resistant varieties',
            icon: '🌱',
            effectiveness: 0.95,
            steps: ['Plant resistant cultivars', 'Rotate crops', 'Monitor regularly']
          },
          {
            name: 'Fungicide spray',
            icon: '💨',
            effectiveness: 0.75,
            steps: ['Apply at first sign', 'Repeat every 10 days', 'Cover all surfaces']
          }
        ],
        cause: 'Cool nights + Humid days',
        spreadRate: 0.4,
        severity: 'moderate'
      }
    };
  }

  /**
   * Apply disease to a crop
   */
  applyDisease(crop, diseaseType, severity = 'moderate') {
    const disease = this.diseaseDatabase[diseaseType];
    if (!disease) {
      console.warn(`Unknown disease type: ${diseaseType}`);
      return;
    }

    // Store disease data on crop
    crop.userData.disease = {
      ...disease,
      severity,
      infectedAt: Date.now(),
      confidence: 0.80 + Math.random() * 0.15, // 80-95% confidence
      affectedParts: ['leaves'],
      spreadRisk: this.calculateSpreadRisk(disease, severity)
    };

    // Apply visual effects
    this.applyVisualEffects(crop, disease);
    
    // Add to diseased crops tracking
    this.diseasedCrops.set(crop.uuid, crop);
  }

  /**
   * Apply visual disease effects to crop mesh
   */
  applyVisualEffects(crop, disease) {
    const effects = disease.visualEffects;
    
    switch (disease.type) {
      case 'bacterialBlight':
        this.applyBacterialBlightEffects(crop, effects);
        break;
      case 'blast':
        this.applyBlastEffects(crop, effects);
        break;
      case 'leafRust':
        this.applyLeafRustEffects(crop, effects);
        break;
    }
    
    // Overall health reduction
    this.reduceOverallHealth(crop, 0.3);
  }

  applyBacterialBlightEffects(crop, effects) {
    // Find leaf meshes (assuming they're named or tagged)
    crop.traverse((child) => {
      if (child.isMesh && child.userData.isLeaf) {
        // Add spots texture
        this.addSpots(child, effects.spotColor, effects.spotCount);
        
        // Wilt edges
        this.makeEdgesWilt(child, effects.wiltAmount);
      }
    });
  }

  applyBlastEffects(crop, effects) {
    crop.traverse((child) => {
      if (child.isMesh && child.userData.isLeaf) {
        // Add diamond-shaped lesions
        this.addLesions(child, effects.lesionColor, effects.lesionShape, effects.lesionCount);
      }
    });
  }

  applyLeafRustEffects(crop, effects) {
    crop.traverse((child) => {
      if (child.isMesh && child.userData.isLeaf) {
        // Add pustules
        this.addPustules(child, effects.pustuleColor, effects.pustuleCount);
        
        // Yellow tint
        if (child.material) {
          const originalColor = child.material.color.clone();
          child.material.color.lerp(new THREE.Color(0xFFFF00), effects.yellowTint);
          child.userData.originalColor = originalColor;
        }
      }
    });
  }

  /**
   * Add spots to leaf mesh
   */
  addSpots(leafMesh, color, count) {
    // Create spots as decals or texture overlay
    // For simplicity, we'll modify vertex colors
    if (!leafMesh.geometry.attributes.color) {
      const colors = new Float32Array(leafMesh.geometry.attributes.position.count * 3);
      leafMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    
    const colors = leafMesh.geometry.attributes.color;
    const spotColor = new THREE.Color(color);
    
    // Randomly place spots
    for (let i = 0; i < count; i++) {
      const vertexIndex = Math.floor(Math.random() * colors.count);
      colors.setXYZ(vertexIndex, spotColor.r, spotColor.g, spotColor.b);
    }
    
    colors.needsUpdate = true;
    leafMesh.material.vertexColors = true;
  }

  /**
   * Make leaf edges wilt
   */
  makeEdgesWilt(leafMesh, amount) {
    const positions = leafMesh.geometry.attributes.position;
    
    // Bend edge vertices downward
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Edges have higher x values (assuming leaf is centered)
      if (Math.abs(x) > 0.3) {
        positions.setY(i, y - amount * Math.abs(x));
      }
    }
    
    positions.needsUpdate = true;
  }

  /**
   * Add lesions to leaf
   */
  addLesions(leafMesh, color, shape, count) {
    // Similar to spots but with specific shape
    this.addSpots(leafMesh, color, count);
    
    // Store lesion data for detailed view
    if (!leafMesh.userData.lesions) {
      leafMesh.userData.lesions = [];
    }
    
    for (let i = 0; i < count; i++) {
      leafMesh.userData.lesions.push({
        shape,
        color,
        position: new THREE.Vector2(Math.random(), Math.random())
      });
    }
  }

  /**
   * Add pustules (raised bumps)
   */
  addPustules(leafMesh, color, count) {
    // Create small sphere instances for pustules
    const pustuleGeometry = new THREE.SphereGeometry(0.01, 8, 8);
    const pustuleMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      roughness: 0.8
    });
    
    for (let i = 0; i < count; i++) {
      const pustule = new THREE.Mesh(pustuleGeometry, pustuleMaterial);
      
      // Random position on leaf surface
      pustule.position.set(
        (Math.random() - 0.5) * 0.6,
        0.02,
        (Math.random() - 0.5) * 0.8
      );
      
      leafMesh.add(pustule);
    }
  }

  /**
   * Reduce overall crop health appearance
   */
  reduceOverallHealth(crop, amount) {
    crop.traverse((child) => {
      if (child.isMesh && child.material) {
        // Darken and brown the color
        const brownTint = new THREE.Color(0x8B4513);
        child.material.color.lerp(brownTint, amount);
        
        // Store original for potential cure
        if (!child.userData.originalColor) {
          child.userData.originalColor = child.material.color.clone();
        }
      }
    });
    
    // Update health value
    crop.userData.cropHealth = Math.max(0, (crop.userData.cropHealth || 100) - amount * 100);
  }

  /**
   * Calculate disease spread risk
   */
  calculateSpreadRisk(disease, severity) {
    const baseRisk = disease.spreadRate;
    const severityMultiplier = {
      low: 0.5,
      moderate: 1.0,
      high: 1.5
    };
    
    return Math.min(1, baseRisk * (severityMultiplier[severity] || 1));
  }

  /**
   * Cure disease from crop
   */
  cureDisease(crop) {
    if (!crop.userData.disease) return;
    
    // Remove disease data
    delete crop.userData.disease;
    
    // Restore visual appearance
    crop.traverse((child) => {
      if (child.isMesh && child.userData.originalColor) {
        child.material.color.copy(child.userData.originalColor);
      }
      
      // Remove pustules
      const pustulesToRemove = [];
      child.children.forEach((grandchild) => {
        if (grandchild.geometry && grandchild.geometry.type === 'SphereGeometry') {
          pustulesToRemove.push(grandchild);
        }
      });
      
      pustulesToRemove.forEach(p => child.remove(p));
    });
    
    // Restore health
    crop.userData.cropHealth = 100;
    
    // Remove from diseased tracking
    this.diseasedCrops.delete(crop.uuid);
  }

  /**
   * Get disease info for a crop
   */
  getDiseaseInfo(crop) {
    return crop.userData.disease || null;
  }

  /**
   * Check if crop is diseased
   */
  isDiseased(crop) {
    return !!crop.userData.disease;
  }

  /**
   * Get all diseased crops
   */
  getDiseasedCrops() {
    return Array.from(this.diseasedCrops.values());
  }

  /**
   * Update disease progression (call each frame)
   */
  update(deltaTime) {
    // Disease progression over time
    this.diseasedCrops.forEach((crop) => {
      const disease = crop.userData.disease;
      if (!disease) return;
      
      // Gradually worsen if untreated
      const daysSinceInfection = (Date.now() - disease.infectedAt) / (1000 * 60 * 60 * 24);
      
      if (daysSinceInfection > 3 && disease.severity !== 'high') {
        disease.severity = 'high';
        crop.userData.cropHealth = Math.max(0, crop.userData.cropHealth - 10);
      }
    });
  }
}

export default CropDiseaseSystem;
