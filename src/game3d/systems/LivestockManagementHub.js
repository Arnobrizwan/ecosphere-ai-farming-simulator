/**
 * Livestock Management Hub - Central coordination for all livestock systems
 * Manages UC56-UC63 livestock features
 */
export class LivestockManagementHub {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.animals = new Map();
    this.pastures = new Map();
    
    // Initialize subsystems (will be imported)
    this.pastureSystem = null;
    this.animalHealthSystem = null;
    this.feedSystem = null;
    this.breedingSystem = null;
    this.movementSystem = null;
    this.scenarioSystem = null;
    this.impactSystem = null;
    this.marketSystem = null;
  }

  /**
   * Initialize all livestock systems
   */
  async initialize() {
    console.log('Initializing Livestock Management Hub...');
    
    // Import and initialize systems
    const { PastureHealthSystem } = await import('./PastureHealthSystem.js');
    const { AnimalHealthSystem } = await import('./AnimalHealthSystem.js');
    const { FeedPlanningSystem } = await import('./FeedPlanningSystem.js');
    const { BreedingSystem } = await import('./BreedingSystem.js');
    const { LivestockMovementSystem } = await import('./LivestockMovementSystem.js');
    const { LivestockScenarioSystem } = await import('./LivestockScenarioSystem.js');
    const { LivestockImpactSystem } = await import('./LivestockImpactSystem.js');
    const { LivestockMarketSystem } = await import('./LivestockMarketSystem.js');
    
    this.pastureSystem = new PastureHealthSystem(this);
    this.animalHealthSystem = new AnimalHealthSystem(this);
    this.feedSystem = new FeedPlanningSystem(this);
    this.breedingSystem = new BreedingSystem(this);
    this.movementSystem = new LivestockMovementSystem(this);
    this.scenarioSystem = new LivestockScenarioSystem(this);
    this.impactSystem = new LivestockImpactSystem(this);
    this.marketSystem = new LivestockMarketSystem(this);
    
    console.log('Livestock Management Hub initialized');
  }

  /**
   * Add animal to system
   */
  addAnimal(animalData) {
    const animal = {
      id: animalData.id || `animal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: animalData.type,
      name: animalData.name,
      age: animalData.age || 0,
      weight: animalData.weight || 0,
      health: {
        temperature: 38.5,
        behavior: 'normal',
        feedIntake: 0,
        lastCheckup: Date.now(),
        medications: [],
        status: 'healthy'
      },
      genetics: {
        breed: animalData.breed || 'standard',
        lineage: animalData.lineage || [],
        traits: animalData.traits || {}
      },
      location: {
        lat: animalData.location?.lat || 0,
        lng: animalData.location?.lng || 0,
        pastureZone: animalData.pastureZone || null
      },
      breeding: {
        status: 'available',
        lastBreeding: null,
        offspring: []
      },
      createdAt: Date.now()
    };
    
    this.animals.set(animal.id, animal);
    
    // Register with subsystems
    if (this.animalHealthSystem) {
      this.animalHealthSystem.registerAnimal(animal);
    }
    if (this.movementSystem) {
      this.movementSystem.trackAnimal(animal);
    }
    
    return animal;
  }

  /**
   * Add pasture zone
   */
  addPasture(pastureData) {
    const pasture = {
      id: pastureData.id || `pasture_${Date.now()}`,
      name: pastureData.name,
      area: pastureData.area,
      boundaries: pastureData.boundaries || [],
      health: {
        ndvi: 0.6,
        biomass: 2000,
        growthRate: 50,
        condition: 'good'
      },
      grazing: {
        currentAnimals: 0,
        capacity: pastureData.capacity || 20,
        rotationSchedule: [],
        lastRotation: null
      },
      history: [],
      createdAt: Date.now()
    };
    
    this.pastures.set(pasture.id, pasture);
    
    // Register with pasture system
    if (this.pastureSystem) {
      this.pastureSystem.registerPasture(pasture);
    }
    
    return pasture;
  }

  /**
   * Get animal by ID
   */
  getAnimal(animalId) {
    return this.animals.get(animalId);
  }

  /**
   * Get all animals
   */
  getAllAnimals() {
    return Array.from(this.animals.values());
  }

  /**
   * Get animals by type
   */
  getAnimalsByType(type) {
    return this.getAllAnimals().filter(a => a.type === type);
  }

  /**
   * Get pasture by ID
   */
  getPasture(pastureId) {
    return this.pastures.get(pastureId);
  }

  /**
   * Get all pastures
   */
  getAllPastures() {
    return Array.from(this.pastures.values());
  }

  /**
   * Update all systems
   */
  update(deltaTime) {
    // Update each subsystem
    if (this.pastureSystem) {
      this.pastureSystem.update(deltaTime);
    }
    if (this.animalHealthSystem) {
      this.animalHealthSystem.update(deltaTime);
    }
    if (this.feedSystem) {
      this.feedSystem.update(deltaTime);
    }
    if (this.breedingSystem) {
      this.breedingSystem.update(deltaTime);
    }
    if (this.movementSystem) {
      this.movementSystem.update(deltaTime);
    }
    if (this.impactSystem) {
      this.impactSystem.update(deltaTime);
    }
    if (this.marketSystem) {
      this.marketSystem.update(deltaTime);
    }
  }

  /**
   * Get system statistics
   */
  getStatistics() {
    return {
      totalAnimals: this.animals.size,
      totalPastures: this.pastures.size,
      animalsByType: {
        cattle: this.getAnimalsByType('cattle').length,
        sheep: this.getAnimalsByType('sheep').length,
        goat: this.getAnimalsByType('goat').length,
        chicken: this.getAnimalsByType('chicken').length
      },
      healthAlerts: this.animalHealthSystem?.getHealthAlerts().length || 0,
      pastureHealth: this.pastureSystem?.getAverageHealth() || 0,
      feedCost: this.feedSystem?.getTotalCost() || 0,
      marketValue: this.marketSystem?.getTotalValue() || 0
    };
  }
}

export default LivestockManagementHub;
