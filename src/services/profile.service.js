import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase.config';

/**
 * Profile Service - Handles profile validation, saving, and retrieval
 * Supports UC3: Profile Setup with draft saving and validation
 */

export const profileService = {
  /**
   * Validate profile data based on required fields
   * @param {Object} profileData - The profile data to validate
   * @param {string} userRole - The user's role (farmer, student, etc.)
   * @returns {Object} - { valid: boolean, errors: string[] }
   */
  validateProfile: (profileData, userRole) => {
    const errors = [];

    // Basic required fields
    if (!profileData.fullName || !profileData.fullName.trim()) {
      errors.push('Full name is required');
    }

    if (!profileData.language) {
      errors.push('Language preference is required');
    }

    // Role-specific validation
    if (userRole === 'farmer') {
      if (!profileData.farmingDetails) {
        errors.push('Farming details are required');
      } else {
        if (!profileData.farmingDetails.crops || profileData.farmingDetails.crops.length === 0) {
          errors.push('At least one crop must be selected');
        }
        if (!profileData.farmingDetails.experienceLevel) {
          errors.push('Experience level is required');
        }
        if (!profileData.farmingDetails.farmSize || profileData.farmingDetails.farmSize < 0.5) {
          errors.push('Farm size must be at least 0.5 acres');
        }
      }
    } else if (userRole === 'student') {
      if (!profileData.learningGoals) {
        errors.push('Learning goals are required');
      } else {
        if (!profileData.learningGoals.gradeLevel || !profileData.learningGoals.gradeLevel.trim()) {
          errors.push('Grade level is required');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Calculate profile completion percentage
   * @param {Object} profileData - The profile data
   * @param {string} userRole - The user's role
   * @returns {number} - Completion percentage (0-100)
   */
  calculateCompletion: (profileData, userRole) => {
    let totalFields = 0;
    let completedFields = 0;

    // Basic fields (weight: 30%)
    const basicFields = ['fullName', 'avatar', 'language'];
    basicFields.forEach(field => {
      totalFields++;
      if (profileData[field]) completedFields++;
    });

    // Optional demographic fields (weight: 20%)
    const optionalFields = ['gender', 'age', 'location'];
    optionalFields.forEach(field => {
      totalFields++;
      if (profileData[field]) completedFields++;
    });

    // Role-specific fields (weight: 30%)
    if (userRole === 'farmer' && profileData.farmingDetails) {
      totalFields += 3;
      if (profileData.farmingDetails.crops?.length > 0) completedFields++;
      if (profileData.farmingDetails.experienceLevel) completedFields++;
      if (profileData.farmingDetails.farmSize) completedFields++;
    } else if (userRole === 'student' && profileData.learningGoals) {
      totalFields += 3;
      if (profileData.learningGoals.gradeLevel) completedFields++;
      if (profileData.learningGoals.schoolName) completedFields++;
      if (profileData.learningGoals.interests?.length > 0) completedFields++;
    }

    // Preferences (weight: 20%)
    if (profileData.preferences) {
      totalFields += 3;
      if (profileData.preferences.notifications) completedFields++;
      if (profileData.preferences.measurementUnit) completedFields++;
      if (profileData.preferences.reminderTime) completedFields++;
    }

    return Math.round((completedFields / totalFields) * 100);
  },

  /**
   * Save profile as draft (partial save)
   * @param {string} userId - The user ID
   * @param {Object} draftData - The draft profile data
   * @returns {Promise<Object>} - { success: boolean, error?: string }
   */
  saveDraft: async (userId, draftData) => {
    try {
      const userRef = doc(db, 'users', userId);

      // Merge with existing data, don't overwrite
      await updateDoc(userRef, {
        ...draftData,
        profileComplete: false,
        lastDraftSave: new Date().toISOString()
      });

      console.log('✅ Draft saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Draft save error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save complete profile
   * @param {string} userId - The user ID
   * @param {Object} profileData - The complete profile data
   * @param {string} userRole - The user's role
   * @returns {Promise<Object>} - { success: boolean, error?: string, completion?: number }
   */
  saveProfile: async (userId, profileData, userRole) => {
    try {
      // Validate profile
      const validation = profileService.validateProfile(profileData, userRole);

      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      const userRef = doc(db, 'users', userId);
      const completion = profileService.calculateCompletion(profileData, userRole);

      const completeData = {
        ...profileData,
        profileComplete: true,
        profileCompletedAt: new Date().toISOString(),
        profileCompletionPercentage: completion
      };

      await updateDoc(userRef, completeData);

      console.log('✅ Profile saved successfully:', completion + '% complete');
      return { success: true, completion };
    } catch (error) {
      console.error('❌ Profile save error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Load profile data
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - { success: boolean, data?: Object, error?: string }
   */
  loadProfile: async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: false, error: 'Profile not found' };
      }
    } catch (error) {
      console.error('❌ Profile load error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if profile meets minimum required fields
   * @param {Object} profileData - The profile data
   * @param {string} userRole - The user's role
   * @returns {boolean} - True if minimum requirements met
   */
  meetsMinimumRequirements: (profileData, userRole) => {
    const validation = profileService.validateProfile(profileData, userRole);
    return validation.valid;
  },

  /**
   * Update specific profile fields
   * @param {string} userId - The user ID
   * @param {Object} updates - The fields to update
   * @returns {Promise<Object>} - { success: boolean, error?: string }
   */
  updateProfileFields: async (userId, updates) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        lastUpdated: new Date().toISOString()
      });

      console.log('✅ Profile fields updated');
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      return { success: false, error: error.message };
    }
  }
};
