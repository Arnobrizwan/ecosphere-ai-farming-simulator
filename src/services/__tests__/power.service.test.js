/**
 * Unit tests for NASA POWER API integration
 */

import {
  getDailyPoint,
  getDailyRegional,
  getCurrentMonthRange,
  getParameterInfo,
  getAllParameters,
  POWER_PARAMETERS,
} from '../power.service';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('power.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyPoint', () => {
    it('should fetch daily point data and return normalized response', async () => {
      const result = await getDailyPoint({
        latitude: 23.81,
        longitude: 90.41,
        start: '20250801',
        end: '20250831',
        parameters: ['T2M', 'RH2M', 'PRECTOTCORR'],
      });

      // Assert structure
      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('metadata');

      // Assert all requested parameters are present
      expect(result.parameters).toHaveProperty('T2M');
      expect(result.parameters).toHaveProperty('RH2M');
      expect(result.parameters).toHaveProperty('PRECTOTCORR');

      // Assert each parameter has non-empty data
      expect(result.parameters.T2M.length).toBeGreaterThan(0);
      expect(result.parameters.RH2M.length).toBeGreaterThan(0);
      expect(result.parameters.PRECTOTCORR.length).toBeGreaterThan(0);

      // Assert data format
      const firstT2M = result.parameters.T2M[0];
      expect(firstT2M).toHaveProperty('date');
      expect(firstT2M).toHaveProperty('value');
      expect(typeof firstT2M.date).toBe('string');
      expect(typeof firstT2M.value === 'number' || firstT2M.value === null).toBe(true);
    });

    it('should use default parameters if none provided', async () => {
      const result = await getDailyPoint({
        latitude: 23.81,
        longitude: 90.41,
        start: '20250801',
        end: '20250831',
      });

      // Should have default params: T2M, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR
      expect(result.parameters).toHaveProperty('T2M');
      expect(result.parameters).toHaveProperty('RH2M');
      expect(result.parameters).toHaveProperty('WS2M');
      expect(result.parameters).toHaveProperty('ALLSKY_SFC_SW_DWN');
      expect(result.parameters).toHaveProperty('PRECTOTCORR');
    });

    it('should handle API errors gracefully with fallback data', async () => {
      // Trigger error by using invalid coordinates
      const result = await getDailyPoint({
        latitude: 999, // Invalid latitude
        longitude: 999, // Invalid longitude
        start: '20250801',
        end: '20250831',
        parameters: ['T2M'],
      });

      // Should still return data (fallback)
      expect(result).toHaveProperty('parameters');
      expect(result.parameters.T2M).toBeDefined();
      expect(result.parameters.T2M.length).toBeGreaterThan(0);
    });
  });

  describe('getDailyRegional', () => {
    it('should fetch regional data for bounding box', async () => {
      const result = await getDailyRegional({
        bbox: '90.0,23.5,90.5,24.0', // Dhaka region
        start: '20250801',
        end: '20250831',
        parameters: ['T2M', 'PRECTOTCORR'],
      });

      // Assert structure
      expect(result).toHaveProperty('parameters');
      expect(result.parameters).toHaveProperty('T2M');
      expect(result.parameters).toHaveProperty('PRECTOTCORR');

      // Assert non-empty data
      expect(result.parameters.T2M.length).toBeGreaterThan(0);
      expect(result.parameters.PRECTOTCORR.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrentMonthRange', () => {
    it('should return current month start and end in YYYYMMDD format', () => {
      const { start, end } = getCurrentMonthRange();

      // Assert format (8 digits)
      expect(start).toMatch(/^\d{8}$/);
      expect(end).toMatch(/^\d{8}$/);

      // Assert start is first day of month
      expect(start.slice(-2)).toBe('01');

      // Assert end is last day (28-31)
      const lastDay = parseInt(end.slice(-2));
      expect(lastDay).toBeGreaterThanOrEqual(28);
      expect(lastDay).toBeLessThanOrEqual(31);
    });
  });

  describe('getParameterInfo', () => {
    it('should return parameter metadata', () => {
      const info = getParameterInfo('T2M');

      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('unit');
      expect(info).toHaveProperty('description');

      expect(info.name).toBe('Temperature at 2 Meters');
      expect(info.unit).toBe('°C');
    });

    it('should return default metadata for unknown parameters', () => {
      const info = getParameterInfo('UNKNOWN_PARAM');

      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('unit');
      expect(info).toHaveProperty('description');

      expect(info.name).toBe('UNKNOWN_PARAM');
      expect(info.description).toBe('Unknown parameter');
    });
  });

  describe('getAllParameters', () => {
    it('should return array of all available parameters', () => {
      const params = getAllParameters();

      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBeGreaterThan(0);

      // Each parameter should have required fields
      params.forEach((param) => {
        expect(param).toHaveProperty('code');
        expect(param).toHaveProperty('name');
        expect(param).toHaveProperty('unit');
        expect(param).toHaveProperty('description');
      });

      // Should include known parameters
      const codes = params.map((p) => p.code);
      expect(codes).toContain('T2M');
      expect(codes).toContain('RH2M');
      expect(codes).toContain('PRECTOTCORR');
    });
  });

  describe('POWER_PARAMETERS', () => {
    it('should have metadata for all core agro-climate parameters', () => {
      const requiredParams = [
        'T2M',
        'RH2M',
        'WS2M',
        'ALLSKY_SFC_SW_DWN',
        'PRECTOTCORR',
      ];

      requiredParams.forEach((param) => {
        expect(POWER_PARAMETERS).toHaveProperty(param);
        expect(POWER_PARAMETERS[param]).toHaveProperty('name');
        expect(POWER_PARAMETERS[param]).toHaveProperty('unit');
        expect(POWER_PARAMETERS[param]).toHaveProperty('description');
      });
    });
  });
});
