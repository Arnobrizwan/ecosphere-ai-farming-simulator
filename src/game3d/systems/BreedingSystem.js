/**
 * Breeding System (UC59)
 * Manage breeding schedules and genetic tracking
 */
export class BreedingSystem {
  constructor(livestockHub) {
    this.hub = livestockHub;
    this.breedingRecords = new Map();
    this.geneticDatabase = new Map();
    this.breedingSchedule = [];
  }

  /**
   * Register animal genetics
   */
  registerGenetics(animal) {
    const genetics = {
      animalId: animal.id,
      breed: animal.genetics.breed,
      lineage: animal.genetics.lineage || [],
      traits: animal.genetics.traits || {},
      geneticScore: this.calculateGeneticScore(animal.genetics.traits),
      registeredAt: Date.now()
    };

    this.geneticDatabase.set(animal.id, genetics);
  }

  /**
   * Calculate genetic score
   */
  calculateGeneticScore(traits) {
    const weights = {
      milkProduction: 0.25,
      meatQuality: 0.25,
      diseaseResistance: 0.20,
      growthRate: 0.15,
      temperament: 0.10,
      fertility: 0.05
    };

    let score = 0;
    Object.entries(weights).forEach(([trait, weight]) => {
      score += (traits[trait] || 50) * weight;
    });

    return Math.round(score);
  }

  /**
   * Recommend breeding pairs
   */
  recommendBreedingPairs(animalType) {
    const animals = this.hub.getAnimalsByType(animalType);
    
    // Separate by gender
    const males = animals.filter(a => a.genetics.gender === 'male' && a.breeding.status === 'available');
    const females = animals.filter(a => a.genetics.gender === 'female' && a.breeding.status === 'available');

    const recommendations = [];

    females.forEach(female => {
      const bestMale = this.findBestMatch(female, males);
      
      if (bestMale) {
        const offspring = this.projectOffspring(female, bestMale);
        
        recommendations.push({
          female: {
            id: female.id,
            name: female.name,
            geneticScore: this.geneticDatabase.get(female.id)?.geneticScore || 0
          },
          male: {
            id: bestMale.id,
            name: bestMale.name,
            geneticScore: this.geneticDatabase.get(bestMale.id)?.geneticScore || 0
          },
          compatibility: this.calculateCompatibility(female, bestMale),
          projectedOffspring: offspring,
          recommendationScore: offspring.expectedScore
        });
      }
    });

    return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * Find best breeding match
   */
  findBestMatch(female, males) {
    let bestMale = null;
    let bestScore = 0;

    males.forEach(male => {
      // Check genetic diversity (avoid inbreeding)
      if (this.areRelated(female, male)) return;

      const compatibility = this.calculateCompatibility(female, male);
      const offspring = this.projectOffspring(female, male);
      const score = offspring.expectedScore * compatibility;

      if (score > bestScore) {
        bestScore = score;
        bestMale = male;
      }
    });

    return bestMale;
  }

  /**
   * Check if animals are related
   */
  areRelated(animal1, animal2) {
    const lineage1 = animal1.genetics.lineage || [];
    const lineage2 = animal2.genetics.lineage || [];

    // Check for common ancestors in last 3 generations
    const recent1 = lineage1.slice(0, 6); // 3 generations = 6 parents
    const recent2 = lineage2.slice(0, 6);

    return recent1.some(ancestor => recent2.includes(ancestor));
  }

  /**
   * Calculate compatibility
   */
  calculateCompatibility(female, male) {
    const femaleGenetics = this.geneticDatabase.get(female.id);
    const maleGenetics = this.geneticDatabase.get(male.id);

    if (!femaleGenetics || !maleGenetics) return 0.5;

    // Complementary traits score higher
    const femaleTraits = femaleGenetics.traits;
    const maleTraits = maleGenetics.traits;

    let compatibility = 0;
    let traitCount = 0;

    Object.keys(femaleTraits).forEach(trait => {
      if (maleTraits[trait]) {
        // Prefer complementary strengths
        const avg = (femaleTraits[trait] + maleTraits[trait]) / 2;
        compatibility += avg / 100;
        traitCount++;
      }
    });

    return traitCount > 0 ? compatibility / traitCount : 0.5;
  }

  /**
   * Project offspring characteristics
   */
  projectOffspring(female, male) {
    const femaleTraits = this.geneticDatabase.get(female.id)?.traits || {};
    const maleTraits = this.geneticDatabase.get(male.id)?.traits || {};

    const projectedTraits = {};
    const allTraits = new Set([...Object.keys(femaleTraits), ...Object.keys(maleTraits)]);

    allTraits.forEach(trait => {
      const femaleValue = femaleTraits[trait] || 50;
      const maleValue = maleTraits[trait] || 50;
      
      // Average with some random variation
      const avg = (femaleValue + maleValue) / 2;
      const variation = (Math.random() - 0.5) * 10;
      projectedTraits[trait] = Math.max(0, Math.min(100, Math.round(avg + variation)));
    });

    return {
      traits: projectedTraits,
      expectedScore: this.calculateGeneticScore(projectedTraits),
      confidence: 0.75 // Genetic projection confidence
    };
  }

  /**
   * Schedule breeding
   */
  scheduleBreeding(femaleId, maleId, scheduledDate) {
    const female = this.hub.getAnimal(femaleId);
    const male = this.hub.getAnimal(maleId);

    if (!female || !male) return null;

    const breeding = {
      id: `breeding_${Date.now()}`,
      female: { id: femaleId, name: female.name },
      male: { id: maleId, name: male.name },
      scheduledDate: scheduledDate || Date.now(),
      status: 'scheduled',
      projectedOffspring: this.projectOffspring(female, male),
      expectedBirthDate: null,
      createdAt: Date.now()
    };

    this.breedingSchedule.push(breeding);

    // Update animal breeding status
    female.breeding.status = 'scheduled';
    male.breeding.status = 'scheduled';

    // Create task for breeding activity (UC22)
    if (this.hub.player.taskSystem) {
      this.hub.player.taskSystem.createTask({
        type: 'breeding',
        title: `Breed ${female.name} and ${male.name}`,
        animals: [femaleId, maleId],
        scheduledDate: breeding.scheduledDate,
        priority: 'medium'
      });
    }

    return breeding;
  }

  /**
   * Record breeding completion
   */
  completeBreeding(breedingId) {
    const breeding = this.breedingSchedule.find(b => b.id === breedingId);
    if (!breeding) return null;

    breeding.status = 'completed';
    breeding.completedDate = Date.now();
    
    // Calculate expected birth date based on animal type
    const female = this.hub.getAnimal(breeding.female.id);
    const gestationPeriod = this.getGestationPeriod(female.type);
    breeding.expectedBirthDate = Date.now() + gestationPeriod;

    // Update female status
    female.breeding.status = 'pregnant';
    female.breeding.lastBreeding = Date.now();
    female.breeding.expectedBirth = breeding.expectedBirthDate;

    // Update male status
    const male = this.hub.getAnimal(breeding.male.id);
    male.breeding.status = 'available';
    male.breeding.lastBreeding = Date.now();

    // Store breeding record
    this.breedingRecords.set(breedingId, breeding);

    // Schedule health check (UC57)
    if (this.hub.animalHealthSystem) {
      this.schedulePregnancyCheckups(female.id, breeding.expectedBirthDate);
    }

    return breeding;
  }

  /**
   * Get gestation period (milliseconds)
   */
  getGestationPeriod(animalType) {
    const periods = {
      cattle: 283 * 24 * 60 * 60 * 1000,  // 283 days
      sheep: 150 * 24 * 60 * 60 * 1000,   // 150 days
      goat: 150 * 24 * 60 * 60 * 1000,    // 150 days
      chicken: 21 * 24 * 60 * 60 * 1000   // 21 days
    };

    return periods[animalType] || 150 * 24 * 60 * 60 * 1000;
  }

  /**
   * Schedule pregnancy checkups
   */
  schedulePregnancyCheckups(animalId, birthDate) {
    const checkupDates = [
      Date.now() + (30 * 24 * 60 * 60 * 1000),  // 1 month
      Date.now() + (60 * 24 * 60 * 60 * 1000),  // 2 months
      birthDate - (7 * 24 * 60 * 60 * 1000)     // 1 week before birth
    ];

    checkupDates.forEach((date, index) => {
      if (this.hub.player.taskSystem) {
        this.hub.player.taskSystem.createTask({
          type: 'pregnancy_checkup',
          title: `Pregnancy Checkup #${index + 1}`,
          animal: animalId,
          scheduledDate: date,
          priority: 'high'
        });
      }
    });
  }

  /**
   * Record birth
   */
  recordBirth(breedingId, offspringData) {
    const breeding = this.breedingRecords.get(breedingId);
    if (!breeding) return null;

    const female = this.hub.getAnimal(breeding.female.id);
    
    // Create offspring
    const offspring = this.hub.addAnimal({
      type: female.type,
      name: offspringData.name,
      age: 0,
      weight: offspringData.birthWeight || 0,
      breed: female.genetics.breed,
      genetics: {
        breed: female.genetics.breed,
        lineage: [breeding.female.id, breeding.male.id, ...female.genetics.lineage.slice(0, 4)],
        traits: breeding.projectedOffspring.traits,
        gender: offspringData.gender || (Math.random() > 0.5 ? 'male' : 'female')
      }
    });

    // Update breeding record
    breeding.status = 'born';
    breeding.birthDate = Date.now();
    breeding.offspring = offspring.id;

    // Update female status
    female.breeding.status = 'available';
    female.breeding.offspring.push(offspring.id);

    // Register offspring genetics
    this.registerGenetics(offspring);

    return offspring;
  }

  /**
   * Get breeding history
   */
  getBreedingHistory(animalId) {
    return Array.from(this.breedingRecords.values()).filter(
      record => record.female.id === animalId || record.male.id === animalId
    );
  }

  /**
   * Get genetic lineage
   */
  getLineage(animalId, generations = 3) {
    const animal = this.hub.getAnimal(animalId);
    if (!animal) return null;

    const lineage = [];
    const lineageIds = animal.genetics.lineage.slice(0, generations * 2);

    lineageIds.forEach(ancestorId => {
      const ancestor = this.hub.getAnimal(ancestorId);
      if (ancestor) {
        lineage.push({
          id: ancestor.id,
          name: ancestor.name,
          type: ancestor.type,
          geneticScore: this.geneticDatabase.get(ancestor.id)?.geneticScore || 0
        });
      }
    });

    return {
      animalId,
      generations,
      ancestors: lineage
    };
  }

  /**
   * AI-assisted genetic optimization (UC24 integration)
   */
  getGeneticOptimizationRecommendations() {
    const recommendations = [];

    // Identify genetic weaknesses in herd
    const animals = this.hub.getAllAnimals();
    const traitAverages = this.calculateHerdTraitAverages(animals);

    // Find traits below optimal
    Object.entries(traitAverages).forEach(([trait, avg]) => {
      if (avg < 60) {
        recommendations.push({
          type: 'genetic_improvement',
          trait,
          currentAverage: avg,
          target: 70,
          recommendation: `Focus breeding on improving ${trait}. Select high-scoring animals for this trait.`,
          priority: avg < 50 ? 'high' : 'medium'
        });
      }
    });

    return recommendations;
  }

  /**
   * Calculate herd trait averages
   */
  calculateHerdTraitAverages(animals) {
    const traitSums = {};
    const traitCounts = {};

    animals.forEach(animal => {
      const genetics = this.geneticDatabase.get(animal.id);
      if (!genetics) return;

      Object.entries(genetics.traits).forEach(([trait, value]) => {
        traitSums[trait] = (traitSums[trait] || 0) + value;
        traitCounts[trait] = (traitCounts[trait] || 0) + 1;
      });
    });

    const averages = {};
    Object.keys(traitSums).forEach(trait => {
      averages[trait] = Math.round(traitSums[trait] / traitCounts[trait]);
    });

    return averages;
  }

  /**
   * Update system
   */
  update(deltaTime) {
    // Check for upcoming births
    const now = Date.now();
    
    this.breedingRecords.forEach(breeding => {
      if (breeding.status === 'completed' && breeding.expectedBirthDate) {
        const daysUntilBirth = (breeding.expectedBirthDate - now) / (24 * 60 * 60 * 1000);
        
        // Alert 7 days before expected birth
        if (daysUntilBirth <= 7 && daysUntilBirth > 6.9) {
          this.triggerBirthAlert(breeding);
        }
      }
    });
  }

  /**
   * Trigger birth alert
   */
  triggerBirthAlert(breeding) {
    if (this.hub.player.alertSystem) {
      this.hub.player.alertSystem.createAlert({
        type: 'breeding',
        severity: 'medium',
        title: 'Birth Expected Soon',
        message: `${breeding.female.name} expected to give birth within 7 days. Prepare birthing area and monitor closely.`,
        breedingId: breeding.id
      });
    }
  }
}

export default BreedingSystem;
