import axios from 'axios';

const NASA_API_KEY = process.env.EXPO_PUBLIC_NASA_API_KEY; // Sensitive value, configure in your .env file
const NASA_BASE_URL = 'https://api.nasa.gov';

export const nasaService = {
  // Get Earth imagery data
  getEarthImagery: async (lat, lon, date) => {
    try {
      const response = await axios.get(`${NASA_BASE_URL}/planetary/earth/imagery`, {
        params: {
          lat,
          lon,
          date,
          api_key: NASA_API_KEY
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get weather data from NASA POWER API
  getWeatherData: async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://power.larc.nasa.gov/api/temporal/daily/point`,
        {
          params: {
            parameters: 'T2M,PRECTOTCORR,RH2M',
            community: 'AG',
            longitude: lon,
            latitude: lat,
            start: '20230101',
            end: '20231231',
            format: 'JSON'
          }
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get APOD (Astronomy Picture of the Day)
  getAPOD: async () => {
    try {
      const response = await axios.get(`${NASA_BASE_URL}/planetary/apod`, {
        params: {
          api_key: NASA_API_KEY
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
