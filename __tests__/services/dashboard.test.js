/**
 * Dashboard Service Tests (UC45)
 */

import { loadDashboard } from '../../src/services/dashboard/farmDashboard.service';

describe('Farm Dashboard Service', () => {
  const mockUserId = 'test_user_123';
  const mockFarmId = 'test_farm_456';

  test('loads dashboard with KPIs', async () => {
    const result = await loadDashboard(mockUserId, mockFarmId);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.kpis).toBeDefined();
    expect(result.kpis).toHaveProperty('farmHealth');
    expect(result.kpis).toHaveProperty('activeAlerts');
    expect(result.kpis).toHaveProperty('tasksToday');
    expect(result.kpis).toHaveProperty('learningLevel');
  });

  test('loads status cards', async () => {
    const result = await loadDashboard(mockUserId, mockFarmId);

    expect(result.cards).toBeDefined();
    expect(Array.isArray(result.cards)).toBe(true);
    expect(result.cards.length).toBeGreaterThan(0);
    
    const weatherCard = result.cards.find(c => c.id === 'weather');
    expect(weatherCard).toBeDefined();
    expect(weatherCard.title).toContain('Weather');
  });

  test('generates quick actions', async () => {
    const result = await loadDashboard(mockUserId, mockFarmId);

    expect(result.quickActions).toBeDefined();
    expect(Array.isArray(result.quickActions)).toBe(true);
    expect(result.quickActions.length).toBeLessThanOrEqual(5);
  });
});
