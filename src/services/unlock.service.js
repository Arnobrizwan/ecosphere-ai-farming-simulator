import { doc, getDoc, setDoc, updateDoc, arrayUnion, deleteField, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase.config';
import { ProgressService } from './progress.service';

export class UnlockService {
  /**
   * Get all unlock rules
   */
  static async getUnlockRules() {
    const unlockRulesCol = collection(db, 'unlock_rules');
    const unlockRulesSnapshot = await getDocs(unlockRulesCol);
    const unlockRulesList = unlockRulesSnapshot.docs.map(doc => doc.data());
    return unlockRulesList;
  }

  /**
   * Get specific unlock rule
   */
  static async getUnlockRule(featureId) {
    const unlockRuleRef = doc(db, 'unlock_rules', featureId);
    const unlockRuleSnap = await getDoc(unlockRuleRef);
    return unlockRuleSnap.exists() ? unlockRuleSnap.data() : null;
  }

  /**
   * Check if user meets requirements for a feature
   */
  static async checkEligibility(userId, featureId) {
    try {
      const rule = await this.getUnlockRule(featureId);
      if (!rule) {
        return { canUnlock: false, progress: 0, results: {} };
      }

      // Get user progress
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        return { canUnlock: false, progress: 0, results: {} };
      }

      const userProgress = progressSnap.data();
      const overview = userProgress.overview || {};
      
      // Get completed tutorials
      const tutorialsRef = collection(db, 'users', userId, 'tutorials');
      const tutorialsSnap = await getDocs(tutorialsRef);
      const completedTutorials = [];
      tutorialsSnap.forEach(doc => {
        if (doc.data().completed) {
          completedTutorials.push(doc.id);
        }
      });

      // Get completed missions
      const gameProgressRef = doc(db, 'users', userId, 'gameProgress', 'campaign');
      const gameProgressSnap = await getDoc(gameProgressRef);
      const completedMissions = gameProgressSnap.exists() 
        ? gameProgressSnap.data().completedMissions || []
        : [];

      // Get passed quizzes
      const quizzesRef = collection(db, 'users', userId, 'quizProgress');
      const quizzesSnap = await getDocs(quizzesRef);
      const passedQuizzes = [];
      quizzesSnap.forEach(doc => {
        if (doc.data().completed) {
          passedQuizzes.push(doc.id);
        }
      });

      // Calculate account age
      const accountCreated = new Date(overview.accountAge || new Date());
      const daysActive = Math.floor((new Date() - accountCreated) / (1000 * 60 * 60 * 24));

      // Evaluate each requirement
      const results = {
        xpMet: overview.totalXP >= rule.requirements.minXP,
        levelMet: overview.level >= rule.requirements.minLevel,
        tutorialsMet: rule.requirements.tutorialsCompleted.every(t => 
          completedTutorials.includes(t)
        ),
        missionsMet: rule.requirements.missionsCompleted.every(m => 
          completedMissions.includes(m)
        ),
        quizzesMet: rule.requirements.quizzesPassed.every(q => 
          passedQuizzes.includes(q)
        ),
        daysActiveMet: daysActive >= rule.requirements.daysActive
      };

      // Apply operator (AND/OR)
      const canUnlock = rule.requirements.operator === 'AND'
        ? Object.values(results).every(r => r === true)
        : Object.values(results).some(r => r === true);

      // Calculate progress percentage
      const totalRequirements = Object.keys(results).length;
      const metRequirements = Object.values(results).filter(r => r).length;
      const progress = Math.round((metRequirements / totalRequirements) * 100);

      return {
        canUnlock,
        progress,
        results,
        details: {
          xp: { current: overview.totalXP, required: rule.requirements.minXP },
          level: { current: overview.level, required: rule.requirements.minLevel },
          tutorials: { 
            completed: completedTutorials.length, 
            required: rule.requirements.tutorialsCompleted.length 
          },
          missions: { 
            completed: completedMissions.length, 
            required: rule.requirements.missionsCompleted.length 
          },
          quizzes: { 
            passed: passedQuizzes.length, 
            required: rule.requirements.quizzesPassed.length 
          },
          daysActive: { current: daysActive, required: rule.requirements.daysActive }
        }
      };
    } catch (error) {
      console.error('Check eligibility error:', error);
      return { canUnlock: false, progress: 0, results: {} };
    }
  }

  /**
   * Unlock feature for user
   */
  static async unlockFeature(userId, featureId) {
    try {
      // Verify eligibility
      const { canUnlock } = await this.checkEligibility(userId, featureId);
      if (!canUnlock) {
        return { success: false, message: 'Requirements not met' };
      }

      // Update entitlements
      const entitlementsRef = doc(db, 'users', userId, 'entitlements', 'main');
      const entitlementsSnap = await getDoc(entitlementsRef);

      if (!entitlementsSnap.exists()) {
        // Initialize entitlements
        await setDoc(entitlementsRef, {
          unlockedFeatures: [featureId],
          lockedFeatures: {},
          lastChecked: new Date().toISOString()
        });
      } else {
        await updateDoc(entitlementsRef, {
          unlockedFeatures: arrayUnion(featureId),
          [`lockedFeatures.${featureId}`]: deleteField(),
          lastChecked: new Date().toISOString()
        });
      }

      // Award bonus XP
      await ProgressService.updateTotalXP(userId, 50);

      // Add milestone
      const rule = await this.getUnlockRule(featureId);
      await ProgressService.addMilestone(
        userId,
        'featureUnlock',
        featureId,
        `Unlocked ${rule.displayName}`
      );

      return { success: true, featureId, bonusXP: 50 };
    } catch (error) {
      console.error('Unlock feature error:', error);
      return { success: false, message: 'Failed to unlock feature' };
    }
  }

  /**
   * Check if feature is unlocked
   */
  static async isFeatureUnlocked(userId, featureId) {
    try {
      // Check if it's a default unlocked feature
      const rule = await this.getUnlockRule(featureId);
      if (rule?.defaultUnlocked) {
        return true;
      }

      const entitlementsRef = doc(db, 'users', userId, 'entitlements', 'main');
      const entitlementsSnap = await getDoc(entitlementsRef);

      if (!entitlementsSnap.exists()) {
        return false;
      }

      const unlockedFeatures = entitlementsSnap.data().unlockedFeatures || [];
      return unlockedFeatures.includes(featureId);
    } catch (error) {
      console.error('Check feature unlocked error:', error);
      return false;
    }
  }

  /**
   * Get all entitlements for user
   */
  static async getUserEntitlements(userId) {
    try {
      const entitlementsRef = doc(db, 'users', userId, 'entitlements', 'main');
      const entitlementsSnap = await getDoc(entitlementsRef);

      if (!entitlementsSnap.exists()) {
        // Initialize with default unlocked features
        const unlockRules = await this.getUnlockRules();
        const defaultUnlocked = unlockRules
          .filter(rule => rule.defaultUnlocked)
          .map(rule => rule.featureId);

        const initialEntitlements = {
          unlockedFeatures: defaultUnlocked,
          lockedFeatures: {},
          lastChecked: new Date().toISOString()
        };

        await setDoc(entitlementsRef, initialEntitlements);
        return initialEntitlements;
      }

      return entitlementsSnap.data();
    } catch (error) {
      console.error('Get entitlements error:', error);
      return { unlockedFeatures: [], lockedFeatures: {}, lastChecked: null };
    }
  }

  /**
   * Auto-check for newly unlockable features
   */
  static async autoCheckUnlocks(userId) {
    try {
      const entitlements = await this.getUserEntitlements(userId);
      const newlyUnlockable = [];
      const unlockRules = await this.getUnlockRules();

      for (const rule of unlockRules) {
        // Skip if already unlocked or default unlocked
        if (entitlements.unlockedFeatures.includes(rule.featureId) || rule.defaultUnlocked) {
          continue;
        }

        const { canUnlock } = await this.checkEligibility(userId, rule.featureId);
        if (canUnlock) {
          newlyUnlockable.push(rule);
        }
      }

      return newlyUnlockable;
    } catch (error) {
      console.error('Auto check unlocks error:', error);
      return [];
    }
  }

  /**
   * Refresh all feature statuses
   */
  static async refreshEntitlements(userId) {
    try {
      const entitlements = await this.getUserEntitlements(userId);
      const lockedFeatures = {};
      const unlockRules = await this.getUnlockRules();

      for (const rule of unlockRules) {
        // Skip if already unlocked or default unlocked
        if (entitlements.unlockedFeatures.includes(rule.featureId) || rule.defaultUnlocked) {
          continue;
        }

        const { canUnlock, progress } = await this.checkEligibility(userId, rule.featureId);
        lockedFeatures[rule.featureId] = {
          locked: true,
          progress,
          canUnlock
        };
      }

      const entitlementsRef = doc(db, 'users', userId, 'entitlements', 'main');
      await updateDoc(entitlementsRef, {
        lockedFeatures,
        lastChecked: new Date().toISOString()
      });

      return { unlockedFeatures: entitlements.unlockedFeatures, lockedFeatures };
    } catch (error) {
      console.error('Refresh entitlements error:', error);
      return null;
    }
  }
}

export default UnlockService;
