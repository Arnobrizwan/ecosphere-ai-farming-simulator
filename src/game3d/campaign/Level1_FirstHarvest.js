import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Campaign Level 1: First Harvest
 * Complete playable tutorial level
 */
export class Level1_FirstHarvest {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Game state
    this.currentPhase = 0;
    this.phases = [
      'field_preparation',
      'planting',
      'irrigation_setup',
      'growth_monitoring',
      'harvest'
    ];
    
    // Player stats
    this.score = 0;
    this.timeElapsed = 0;
    this.cropHealth = 100;
    this.weedsRemoved = 0;
    this.seedlingsPlanted = 0;
    this.harvestedYield = 0;
    
    // Level config
    this.targetYield = 4500; // kg per hectare
    this.fieldSize = { width: 100, depth: 150 }; // 1.5 hectares
    this.gridSpacing = 0.2; // 20cm spacing
    
    // Game objects
    this.field = null;
    this.weeds = [];
    this.seedlings = [];
    this.irrigationSystem = null;
    this.player = null;
    this.buildings = {};
    
    // UI callbacks
    this.onPhaseComplete = null;
    this.onScoreUpdate = null;
    this.onTutorialPrompt = null;
  }

  /**
   * Initialize the level
   */
  async init() {
    // Setup scene
    this.setupLighting();
    this.createEnvironment();
    this.createBuildings();
    this.createField();
    this.createPlayer();
    
    // Setup controls
    this.setupControls();
    
    // Start first phase
    this.startPhase(0);
    
    console.log('Level 1: First Harvest initialized');
  }

  /**
   * Setup lighting
   */
  setupLighting() {
    // Sunlight
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);

    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);

    // Sky
    const skyColor = 0x87CEEB;
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.Fog(skyColor, 100, 500);
  }

  /**
   * Create environment
   */
  createEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x7CFC00,
      side: THREE.DoubleSide 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Trees around perimeter
    this.createTrees();
  }

  /**
   * Create decorative trees
   */
  createTrees() {
    const treePositions = [
      [-60, 0, -80], [60, 0, -80],
      [-60, 0, 80], [60, 0, 80],
      [-80, 0, 0], [80, 0, 0]
    ];

    treePositions.forEach(pos => {
      const tree = this.createTree();
      tree.position.set(...pos);
      this.scene.add(tree);
    });
  }

  /**
   * Create a simple tree
   */
  createTree() {
    const group = new THREE.Group();

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 4;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage
    const foliageGeometry = new THREE.SphereGeometry(4, 8, 8);
    const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 10;
    foliage.castShadow = true;
    group.add(foliage);

    return group;
  }

  /**
   * Create farm buildings
   */
  createBuildings() {
    // Farmhouse
    this.buildings.farmhouse = this.createBuilding(
      { width: 10, height: 6, depth: 8 },
      0xD2691E,
      { x: -40, y: 0, z: -60 }
    );

    // Storage shed
    this.buildings.storage = this.createBuilding(
      { width: 6, height: 4, depth: 6 },
      0x8B4513,
      { x: -20, y: 0, z: -60 }
    );

    // Tool shed
    this.buildings.toolShed = this.createBuilding(
      { width: 4, height: 3, depth: 4 },
      0xA0522D,
      { x: -40, y: 0, z: -45 }
    );

    // Water well
    this.buildings.well = this.createWell({ x: -30, y: 0, z: -50 });
  }

  /**
   * Create a building
   */
  createBuilding(size, color, position) {
    const group = new THREE.Group();

    // Walls
    const wallGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const wallMaterial = new THREE.MeshLambertMaterial({ color });
    const walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.position.y = size.height / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(size.width * 0.7, size.height * 0.4, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = size.height + size.height * 0.2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    group.position.set(position.x, position.y, position.z);
    this.scene.add(group);

    return group;
  }

  /**
   * Create water well
   */
  createWell(position) {
    const group = new THREE.Group();

    // Well base
    const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1;
    group.add(base);

    // Pump
    const pumpGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    const pumpMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.set(1, 1.75, 0);
    group.add(pump);

    group.position.set(position.x, position.y, position.z);
    this.scene.add(group);

    return group;
  }

  /**
   * Create the main field
   */
  createField() {
    const fieldGeometry = new THREE.PlaneGeometry(
      this.fieldSize.width,
      this.fieldSize.depth
    );
    const fieldMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      side: THREE.DoubleSide 
    });
    this.field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    this.field.rotation.x = -Math.PI / 2;
    this.field.position.y = 0.01;
    this.field.receiveShadow = true;
    this.scene.add(this.field);

    // Add grid helper for planting
    this.fieldGrid = new THREE.GridHelper(
      this.fieldSize.width,
      this.fieldSize.width / this.gridSpacing,
      0x000000,
      0x444444
    );
    this.fieldGrid.position.y = 0.02;
    this.fieldGrid.visible = false; // Show only during planting phase
    this.scene.add(this.fieldGrid);
  }

  /**
   * Create player character
   */
  createPlayer() {
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0000FF });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.4;
    group.add(head);

    group.position.set(-10, 0, -30);
    group.castShadow = true;
    this.scene.add(group);

    this.player = group;
  }

  /**
   * Setup camera controls
   */
  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.5;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 150;
    
    // Focus on field
    this.camera.position.set(0, 50, 80);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Start a phase
   */
  startPhase(phaseIndex) {
    this.currentPhase = phaseIndex;
    const phaseName = this.phases[phaseIndex];

    console.log(`Starting phase: ${phaseName}`);

    switch (phaseName) {
      case 'field_preparation':
        this.startFieldPreparation();
        break;
      case 'planting':
        this.startPlanting();
        break;
      case 'irrigation_setup':
        this.startIrrigationSetup();
        break;
      case 'growth_monitoring':
        this.startGrowthMonitoring();
        break;
      case 'harvest':
        this.startHarvest();
        break;
    }
  }

  /**
   * Phase 1: Field Preparation
   */
  startFieldPreparation() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Welcome! Let's clear this field and prepare it for planting.");
    }

    // Spawn weeds
    this.spawnWeeds(50);

    // Change field color to show it needs work
    this.field.material.color.setHex(0x6B4423);
  }

  /**
   * Spawn weeds on the field
   */
  spawnWeeds(count) {
    for (let i = 0; i < count; i++) {
      const weed = this.createWeed();
      
      // Random position on field
      const x = (Math.random() - 0.5) * this.fieldSize.width * 0.9;
      const z = (Math.random() - 0.5) * this.fieldSize.depth * 0.9;
      
      weed.position.set(x, 0.5, z);
      weed.userData.isWeed = true;
      
      this.scene.add(weed);
      this.weeds.push(weed);
    }
  }

  /**
   * Create a weed object
   */
  createWeed() {
    const group = new THREE.Group();

    // Simple weed representation
    const geometry = new THREE.ConeGeometry(0.3, 1, 4);
    const material = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.5;
    
    group.add(mesh);
    return group;
  }

  /**
   * Remove a weed (called on click)
   */
  removeWeed(weed) {
    const index = this.weeds.indexOf(weed);
    if (index > -1) {
      this.weeds.splice(index, 1);
      this.scene.remove(weed);
      this.weedsRemoved++;
      
      this.addScore(10);
      
      // Check if phase complete
      if (this.weedsRemoved >= 45) { // 90% of 50
        this.completeFieldPreparation();
      }
    }
  }

  /**
   * Complete field preparation phase
   */
  completeFieldPreparation() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Great job! The field is ready. Now let's plant some rice!");
    }

    // Change field color to prepared soil
    this.field.material.color.setHex(0x8B4513);
    
    this.addScore(300);
    
    setTimeout(() => {
      this.startPhase(1); // Move to planting
    }, 2000);
  }

  /**
   * Phase 2: Planting
   */
  startPlanting() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Follow the grid to plant seedlings. Proper spacing = better yield!");
    }

    // Show grid
    this.fieldGrid.visible = true;

    // Calculate planting positions
    this.plantingPositions = this.calculatePlantingGrid();
  }

  /**
   * Calculate grid positions for planting
   */
  calculatePlantingGrid() {
    const positions = [];
    const spacing = this.gridSpacing;
    const halfWidth = this.fieldSize.width / 2;
    const halfDepth = this.fieldSize.depth / 2;

    for (let x = -halfWidth + spacing; x < halfWidth; x += spacing) {
      for (let z = -halfDepth + spacing; z < halfDepth; z += spacing) {
        positions.push({ x, z, planted: false });
      }
    }

    return positions;
  }

  /**
   * Plant a seedling at position
   */
  plantSeedling(position) {
    const seedling = this.createSeedling();
    seedling.position.set(position.x, 0.1, position.z);
    seedling.userData.growthStage = 0;
    seedling.userData.health = 100;
    
    this.scene.add(seedling);
    this.seedlings.push(seedling);
    this.seedlingsPlanted++;
    
    position.planted = true;
    this.addScore(5);

    // Check if phase complete
    const targetCount = Math.floor(this.plantingPositions.length * 0.95);
    if (this.seedlingsPlanted >= targetCount) {
      this.completePlanting();
    }
  }

  /**
   * Create a seedling
   */
  createSeedling() {
    const group = new THREE.Group();

    // Small rice plant
    const geometry = new THREE.ConeGeometry(0.05, 0.3, 4);
    const material = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.15;
    
    group.add(mesh);
    return group;
  }

  /**
   * Complete planting phase
   */
  completePlanting() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Excellent planting! Now let's set up irrigation.");
    }

    this.fieldGrid.visible = false;
    this.addScore(400);
    
    setTimeout(() => {
      this.startPhase(2); // Move to irrigation
    }, 2000);
  }

  /**
   * Phase 3: Irrigation Setup
   */
  startIrrigationSetup() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Water is life! Set up your irrigation system.");
    }

    // For simplicity, auto-complete after a delay
    // In full game, player would place pipes
    setTimeout(() => {
      this.completeIrrigationSetup();
    }, 3000);
  }

  /**
   * Complete irrigation setup
   */
  completeIrrigationSetup() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Irrigation ready! Now watch your crops grow.");
    }

    this.addScore(300);
    
    setTimeout(() => {
      this.startPhase(3); // Move to growth monitoring
    }, 2000);
  }

  /**
   * Phase 4: Growth Monitoring
   */
  startGrowthMonitoring() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Monitor your crops. They'll grow over 30 days (time-lapsed).");
    }

    // Start growth simulation
    this.simulateGrowth();
  }

  /**
   * Simulate crop growth
   */
  simulateGrowth() {
    let day = 0;
    const growthInterval = setInterval(() => {
      day++;
      
      // Update all seedlings
      this.seedlings.forEach(seedling => {
        this.growPlant(seedling, day);
      });

      // Update UI
      if (this.onTutorialPrompt) {
        this.onTutorialPrompt(`Day ${day}/30 - Crops are growing!`);
      }

      if (day >= 30) {
        clearInterval(growthInterval);
        this.completeGrowthMonitoring();
      }
    }, 200); // 200ms per day = 6 seconds total
  }

  /**
   * Grow a plant
   */
  growPlant(plant, day) {
    const growthStage = Math.floor(day / 10); // 0-2
    plant.userData.growthStage = growthStage;

    // Scale up the plant
    const scale = 1 + (day / 30) * 2; // Grow to 3x size
    plant.scale.set(scale, scale, scale);

    // Change color as it matures
    if (growthStage === 0) {
      plant.children[0].material.color.setHex(0x90EE90); // Light green
    } else if (growthStage === 1) {
      plant.children[0].material.color.setHex(0x228B22); // Forest green
    } else {
      plant.children[0].material.color.setHex(0xFFD700); // Golden (ready to harvest)
    }
  }

  /**
   * Complete growth monitoring
   */
  completeGrowthMonitoring() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Your rice is ready! Time to harvest!");
    }

    this.addScore(400);
    
    setTimeout(() => {
      this.startPhase(4); // Move to harvest
    }, 2000);
  }

  /**
   * Phase 5: Harvest
   */
  startHarvest() {
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt("Click on plants to harvest them!");
    }
  }

  /**
   * Harvest a plant
   */
  harvestPlant(plant) {
    const index = this.seedlings.indexOf(plant);
    if (index > -1) {
      this.seedlings.splice(index, 1);
      this.scene.remove(plant);
      
      // Calculate yield (random 80-120g per plant)
      const yield_g = 80 + Math.random() * 40;
      this.harvestedYield += yield_g;
      
      this.addScore(15);
      
      // Check if harvest complete
      if (this.seedlings.length === 0) {
        this.completeHarvest();
      }
    }
  }

  /**
   * Complete harvest phase
   */
  completeHarvest() {
    const yieldKg = this.harvestedYield / 1000;
    const yieldPerHa = (yieldKg / 1.5).toFixed(2);
    
    if (this.onTutorialPrompt) {
      this.onTutorialPrompt(
        `Congratulations! You harvested ${yieldKg.toFixed(2)}kg (${yieldPerHa}kg/ha)!`
      );
    }

    // Calculate final score
    if (yieldPerHa >= this.targetYield) {
      this.addScore(500);
    }

    this.completeLevel();
  }

  /**
   * Complete the level
   */
  completeLevel() {
    const stars = this.calculateStars();
    
    console.log('Level Complete!');
    console.log(`Final Score: ${this.score}`);
    console.log(`Stars: ${stars}/3`);

    if (this.onPhaseComplete) {
      this.onPhaseComplete({
        completed: true,
        score: this.score,
        stars,
        yield: this.harvestedYield,
        timeElapsed: this.timeElapsed
      });
    }
  }

  /**
   * Calculate star rating
   */
  calculateStars() {
    if (this.score >= 1700) return 3;
    if (this.score >= 1500) return 2;
    return 1;
  }

  /**
   * Add score
   */
  addScore(points) {
    this.score += points;
    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score);
    }
  }

  /**
   * Handle click on object
   */
  onClick(intersectedObject) {
    if (!intersectedObject) return;

    const object = intersectedObject.object;
    
    // Check if it's a weed
    if (object.parent && object.parent.userData.isWeed) {
      this.removeWeed(object.parent);
    }
    
    // Check if it's a plant to harvest
    if (this.phases[this.currentPhase] === 'harvest') {
      if (this.seedlings.includes(object.parent)) {
        this.harvestPlant(object.parent);
      }
    }
  }

  /**
   * Update loop
   */
  update(deltaTime) {
    this.timeElapsed += deltaTime;
    
    if (this.controls) {
      this.controls.update();
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    // Remove all objects
    this.weeds.forEach(weed => this.scene.remove(weed));
    this.seedlings.forEach(seedling => this.scene.remove(seedling));
    
    if (this.field) this.scene.remove(this.field);
    if (this.fieldGrid) this.scene.remove(this.fieldGrid);
    if (this.player) this.scene.remove(this.player);
    
    Object.values(this.buildings).forEach(building => {
      if (building) this.scene.remove(building);
    });
  }
}

export default Level1_FirstHarvest;
