import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  // Save data
  save: async (key, value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get data
  get: async (key) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      return null;
    }
  },

  // Remove data
  remove: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clear all data
  clear: async () => {
    try {
      await AsyncStorage.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
