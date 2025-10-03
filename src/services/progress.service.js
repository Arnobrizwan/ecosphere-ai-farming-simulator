import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './firebase.config';

export class ProgressService {
  /**
   * Calculate level and XP progress
   * Level formula: Level = floor(sqrt(XP/100)) + 1
   */
  static calculateLevel(totalXP) {
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const xpToNextLevel = nextLevelXP - totalXP;
    const progressPercentage = ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    
    return {
      level,
      currentLevelXP,
      nextLevelXP,
      xpToNextLevel,
      progressPercentage
    };
  }

  /**
   * Update skill XP and level
   */
  static async updateSkillXP(userId, skillName, xpGained) {
    try {
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        await this.initializeProgress(userId);
      }
      
      const currentData = progressSnap.data() || {};
      const skills = currentData.skills || {};
      const currentSkill = skills[skillName] || { level: 1, xp: 0, maxLevel: 10 };
      
      const newXP = currentSkill.xp + xpGained;
      const newLevel = Math.min(Math.floor(newXP / 200) + 1, 10); // 200 XP per level, cap at 10
      
      skills[skillName] = {
        level: newLevel,
        xp: newXP,
        maxLevel: 10
      };
      
      await updateDoc(progressRef, { skills });
      
      return { newLevel, newXP };
    } catch (error) {
      console.error('Update skill XP error:', error);
      throw error;
    }
  }

  /**
   * Record user session
   */
  static async recordSession(userId, sessionDuration) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      
      await updateDoc(progressRef, {
        'overview.lastActive': new Date().toISOString(),
        'activity.totalSessionTime': increment(sessionDuration),
        'activity.totalSessions': increment(1),
        [`activity.dailySessions.${today}`]: increment(1)
      });
      
      await this.updateStreak(userId);
    } catch (error) {
      console.error('Record session error:', error);
    }
  }

  /**
   * Update login streak
   */
  static async updateStreak(userId) {
    try {
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) return;
      
      const data = progressSnap.data();
      const lastActive = new Date(data.overview?.lastActive || new Date());
      const today = new Date();
      
      const daysSinceLastActive = Math.floor(
        (today - lastActive) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastActive === 1) {
        // Consecutive day
        const newStreak = (data.overview?.currentStreak || 0) + 1;
        await updateDoc(progressRef, {
          'overview.currentStreak': newStreak,
          'overview.longestStreak': Math.max(newStreak, data.overview?.longestStreak || 0)
        });
        
        // Award streak milestones
        if (newStreak === 7 || newStreak === 14 || newStreak === 30) {
          await this.addMilestone(userId, 'streak', newStreak, `${newStreak}-day login streak`);
        }
      } else if (daysSinceLastActive > 1) {
        // Streak broken
        await updateDoc(progressRef, {
          'overview.currentStreak': 1
        });
      }
    } catch (error) {
      console.error('Update streak error:', error);
    }
  }

  /**
   * Add milestone
   */
  static async addMilestone(userId, type, value, description) {
    try {
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      
      await updateDoc(progressRef, {
        milestones: arrayUnion({
          date: new Date().toISOString().split('T')[0],
          type,
          value,
          description,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Add milestone error:', error);
    }
  }

  /**
   * Initialize progress for new user
   */
  static async initializeProgress(userId) {
    try {
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      
      const initialData = {
        overview: {
          totalXP: 0,
          level: 1,
          xpToNextLevel: 100,
          accountAge: 0,
          lastActive: new Date().toISOString(),
          currentStreak: 1,
          longestStreak: 1
        },
        skills: {
          soilManagement: { level: 1, xp: 0, maxLevel: 10 },
          waterEfficiency: { level: 1, xp: 0, maxLevel: 10 },
          cropHealth: { level: 1, xp: 0, maxLevel: 10 },
          weatherPrediction: { level: 1, xp: 0, maxLevel: 10 },
          dataAnalysis: { level: 1, xp: 0, maxLevel: 10 }
        },
        modules: {
          tutorials: { completed: 0, total: 15, percentage: 0 },
          missions: { completed: 0, total: 30, percentage: 0 },
          quizzes: { passed: 0, total: 20, percentage: 0 },
          achievements: { earned: 0, total: 50, percentage: 0 }
        },
        performance: {
          averageQuizScore: 0,
          averageMissionStars: 0,
          fastestQuizTime: 0,
          perfectQuizzes: 0,
          missionRetries: 0
        },
        activity: {
          totalSessionTime: 0,
          averageSessionTime: 0,
          totalSessions: 0,
          weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
          dailySessions: {}
        },
        milestones: []
      };
      
      await setDoc(progressRef, initialData);
      return initialData;
    } catch (error) {
      console.error('Initialize progress error:', error);
      throw error;
    }
  }

  /**
   * Get learning insights and recommendations
   */
  static async getInsights(userId) {
    try {
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        return [];
      }
      
      const data = progressSnap.data();
      const insights = [];
      
      // Identify weak skills
      const skills = data.skills || {};
      const weakSkills = Object.entries(skills)
        .filter(([_, skill]) => skill.level < 3)
        .sort((a, b) => a[1].level - b[1].level);
      
      if (weakSkills.length > 0) {
        const skillName = weakSkills[0][0].replace(/([A-Z])/g, ' $1').trim();
        insights.push({
          type: 'improvement',
          icon: '📈',
          message: `Focus on ${skillName} to balance your skills`,
          action: 'Take related quiz',
          priority: 'high'
        });
      }
      
      // Suggest based on module completion
      const modules = data.modules || {};
      if (modules.tutorials?.percentage < 50) {
        insights.push({
          type: 'suggestion',
          icon: '📚',
          message: 'Complete more tutorials to build foundation',
          action: 'View tutorials',
          priority: 'medium'
        });
      }
      
      // Streak encouragement
      const streak = data.overview?.currentStreak || 0;
      if (streak >= 5) {
        insights.push({
          type: 'encouragement',
          icon: '🔥',
          message: `Amazing ${streak}-day streak! Keep it up!`,
          action: null,
          priority: 'low'
        });
      }
      
      // XP to next level
      const xpToNext = data.overview?.xpToNextLevel || 100;
      if (xpToNext < 100) {
        insights.push({
          type: 'motivation',
          icon: '⚡',
          message: `Only ${xpToNext} XP to reach next level!`,
          action: 'Complete a mission',
          priority: 'high'
        });
      }
      
      return insights;
    } catch (error) {
      console.error('Get insights error:', error);
      return [];
    }
  }

  /**
   * Update total XP and level
   */
  static async updateTotalXP(userId, xpGained) {
    try {
      const progressRef = doc(db, 'users', userId, 'learningProgress', 'main');
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        await this.initializeProgress(userId);
      }
      
      const currentData = progressSnap.data() || {};
      const currentXP = currentData.overview?.totalXP || 0;
      const newTotalXP = currentXP + xpGained;
      
      const levelInfo = this.calculateLevel(newTotalXP);
      const oldLevel = currentData.overview?.level || 1;
      
      await updateDoc(progressRef, {
        'overview.totalXP': newTotalXP,
        'overview.level': levelInfo.level,
        'overview.xpToNextLevel': levelInfo.xpToNextLevel
      });
      
      // Check for level up
      if (levelInfo.level > oldLevel) {
        await this.addMilestone(userId, 'levelUp', levelInfo.level, `Reached Level ${levelInfo.level}`);
        return { leveledUp: true, newLevel: levelInfo.level };
      }
      
      return { leveledUp: false, newLevel: levelInfo.level };
    } catch (error) {
      console.error('Update total XP error:', error);
      throw error;
    }
  }
}

export default ProgressService;
