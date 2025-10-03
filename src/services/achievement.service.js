import { doc, getDoc, updateDoc, arrayUnion, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase.config';
import { ProgressService } from './progress.service';

export class AchievementService {
  /**
   * Get all achievements
   */
  static async getAchievements() {
    const achievementsCol = collection(db, 'achievements');
    const achievementSnapshot = await getDocs(achievementsCol);
    const achievementList = achievementSnapshot.docs.map(doc => doc.data());
    return achievementList;
  }

  /**
   * Get specific achievement
   */
  static async getAchievement(achievementId) {
    const achievementRef = doc(db, 'achievements', achievementId);
    const achievementSnap = await getDoc(achievementRef);
    return achievementSnap.exists() ? achievementSnap.data() : null;
  }

  /**
   * Check if user has achievement
   */
  static async hasAchievement(userId, achievementId) {
    try {
      const achievementsRef = doc(db, 'users', userId, 'achievements', 'main');
      const achievementsSnap = await getDoc(achievementsRef);
      
      if (!achievementsSnap.exists()) {
        return false;
      }
      
      const earned = achievementsSnap.data().earned || [];
      return earned.some(e => e.achievementId === achievementId);
    } catch (error) {
      console.error('Check achievement error:', error);
      return false;
    }
  }

  /**
   * Get user achievements
   */
  static async getUserAchievements(userId) {
    try {
      const achievementsRef = doc(db, 'users', userId, 'achievements', 'main');
      const achievementsSnap = await getDoc(achievementsRef);
      
      if (!achievementsSnap.exists()) {
        // Initialize
        const initialData = {
          earned: [],
          inProgress: [],
          totalXPFromAchievements: 0,
          rareCount: 0,
          epicCount: 0,
          legendaryCount: 0
        };
        await setDoc(achievementsRef, initialData);
        return initialData;
      }
      
      return achievementsSnap.data();
    } catch (error) {
      console.error('Get user achievements error:', error);
      return { earned: [], inProgress: [], totalXPFromAchievements: 0 };
    }
  }

  /**
   * Evaluate criteria
   */
  static async evaluateCriteria(userId, criteria, eventData) {
    try {
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        return false;
      }
      
      const userProgress = progressSnap.data();
      const modules = userProgress.modules || {};
      const overview = userProgress.overview || {};
      
      switch (criteria.type) {
        case 'profileComplete':
          return eventData?.profileComplete === true;
        
        case 'tutorialComplete':
          return modules.tutorials?.completed >= criteria.condition.count;
        
        case 'missionComplete':
          return eventData?.missionId === criteria.condition.missionId;
        
        case 'missionCount':
          return modules.missions?.completed >= criteria.condition.count;
        
        case 'quizPerfect':
          return eventData?.score === 100;
        
        case 'quizCount':
          return modules.quizzes?.passed >= criteria.condition.count;
        
        case 'perfectQuizCount':
          const performance = userProgress.performance || {};
          return performance.perfectQuizzes >= criteria.condition.count;
        
        case 'streakDays':
          return overview.currentStreak >= criteria.condition.consecutiveDays;
        
        case 'levelReached':
          return overview.level >= criteria.condition.level;
        
        case 'nasaDataViewed':
          return eventData?.layersViewed >= criteria.condition.layersViewed;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Evaluate criteria error:', error);
      return false;
    }
  }

  /**
   * Award achievement
   */
  static async awardAchievement(userId, achievement) {
    try {
      const achievementsRef = doc(db, 'users', userId, 'achievements', 'main');
      const achievementsSnap = await getDoc(achievementsRef);
      
      // Get current data
      const currentData = achievementsSnap.exists() ? achievementsSnap.data() : {
        earned: [],
        inProgress: [],
        totalXPFromAchievements: 0,
        rareCount: 0,
        epicCount: 0,
        legendaryCount: 0
      };
      
      // Add to earned list
      const earnedEntry = {
        achievementId: achievement.id,
        earnedAt: new Date().toISOString(),
        notificationSeen: false
      };
      
      // Update rarity counts
      const updates = {
        earned: arrayUnion(earnedEntry),
        totalXPFromAchievements: (currentData.totalXPFromAchievements || 0) + achievement.rewards.xp
      };
      
      if (achievement.rarity === 'rare') {
        updates.rareCount = (currentData.rareCount || 0) + 1;
      } else if (achievement.rarity === 'epic') {
        updates.epicCount = (currentData.epicCount || 0) + 1;
      } else if (achievement.rarity === 'legendary') {
        updates.legendaryCount = (currentData.legendaryCount || 0) + 1;
      }
      
      await updateDoc(achievementsRef, updates);
      
      // Award XP
      await ProgressService.updateTotalXP(userId, achievement.rewards.xp);
      
      // Add milestone
      await ProgressService.addMilestone(
        userId,
        'achievement',
        achievement.id,
        `Earned ${achievement.name}`
      );
      
      // Update available titles if provided
      if (achievement.rewards.title) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          availableTitles: arrayUnion(achievement.rewards.title)
        });
      }
      
      return { success: true, achievement };
    } catch (error) {
      console.error('Award achievement error:', error);
      return { success: false };
    }
  }

  /**
   * Check and award achievements
   */
  static async checkAchievements(userId, eventType, eventData) {
    try {
      const newlyEarned = [];
      const achievements = await this.getAchievements();
      
      for (const achievement of achievements) {
        // Skip if already earned
        const hasIt = await this.hasAchievement(userId, achievement.id);
        if (hasIt) continue;
        
        // Evaluate criteria
        const earned = await this.evaluateCriteria(userId, achievement.criteria, eventData);
        
        if (earned) {
          const result = await this.awardAchievement(userId, achievement);
          if (result.success) {
            newlyEarned.push(achievement);
          }
        }
      }
      
      return newlyEarned;
    } catch (error) {
      console.error('Check achievements error:', error);
      return [];
    }
  }

  /**
   * Mark achievement notification as seen
   */
  static async markNotificationSeen(userId, achievementId) {
    try {
      const achievementsRef = doc(db, 'users', userId, 'achievements', 'main');
      const achievementsSnap = await getDoc(achievementsRef);
      
      if (!achievementsSnap.exists()) return;
      
      const data = achievementsSnap.data();
      const earned = data.earned || [];
      
      const updatedEarned = earned.map(e => 
        e.achievementId === achievementId 
          ? { ...e, notificationSeen: true }
          : e
      );
      
      await updateDoc(achievementsRef, { earned: updatedEarned });
    } catch (error) {
      console.error('Mark notification seen error:', error);
    }
  }

  /**
   * Get unseen achievements
   */
  static async getUnseenAchievements(userId) {
    try {
      const userAchievements = await this.getUserAchievements(userId);
      const earned = userAchievements.earned || [];
      
      const unseenAchievements = await Promise.all(earned
        .filter(e => !e.notificationSeen)
        .map(e => this.getAchievement(e.achievementId)));

      return unseenAchievements.filter(a => a !== null);
    } catch (error) {
      console.error('Get unseen achievements error:', error);
      return [];
    }
  }
}

export default AchievementService;
