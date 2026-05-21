import { describe, it, expect } from 'vitest';
import { 
  calculateHealthScore, 
  calculateBudgetPercentage, 
  getMetricSeverity,
  OrgStats 
} from '../src/lib/dashboard-logic';

describe('Dashboard Logic', () => {
  
  describe('calculateHealthScore', () => {
    it('should return 100 for an empty organization', () => {
      const stats: OrgStats = {
        members: 0,
        activeMembers: 0,
        totalBudget: 0,
        spentBudget: 0,
        onTrackEvents: 0,
        totalEvents: 0,
        completedTasks: 0,
        totalTasks: 0
      };
      expect(calculateHealthScore(stats)).toBe(100);
    });

    it('should calculate score correctly with balanced stats', () => {
      const stats: OrgStats = {
        members: 100,
        activeMembers: 80, // 80% (24 pts)
        totalBudget: 1000,
        spentBudget: 500, // 50% left (15 pts)
        onTrackEvents: 4,
        totalEvents: 5,   // 80% (16 pts)
        completedTasks: 3,
        totalTasks: 4    // 75% (15 pts)
      };
      // 0.3*80 + 0.3*50 + 0.2*80 + 0.2*75 = 24 + 15 + 16 + 15 = 70
      expect(calculateHealthScore(stats)).toBe(70);
    });

    it('should drop score significantly if budget is overspent', () => {
      const stats: OrgStats = {
        members: 10,
        activeMembers: 10,
        totalBudget: 100,
        spentBudget: 150, // 50% over (0 pts for budget)
        onTrackEvents: 1,
        totalEvents: 1,
        completedTasks: 1,
        totalTasks: 1
      };
      // 0.3*100 + 0.3*0 + 0.2*100 + 0.2*100 = 30 + 0 + 20 + 20 = 70
      expect(calculateHealthScore(stats)).toBe(70);
    });
  });

  describe('calculateBudgetPercentage', () => {
    it('should return 100 when nothing is spent', () => {
      expect(calculateBudgetPercentage(1000, 0)).toBe(100);
    });

    it('should return 0 when everything is spent', () => {
      expect(calculateBudgetPercentage(1000, 1000)).toBe(0);
    });

    it('should handle fractional percentages correctly', () => {
      expect(calculateBudgetPercentage(300, 100)).toBe(67); // 200/300 = 66.66...
    });
  });

  describe('getMetricSeverity', () => {
    it('should return low for values above high threshold', () => {
      expect(getMetricSeverity(90, 60, 80)).toBe('low');
    });

    it('should return medium for values between thresholds', () => {
      expect(getMetricSeverity(70, 60, 80)).toBe('medium');
    });

    it('should return high for values below low threshold', () => {
      expect(getMetricSeverity(40, 60, 80)).toBe('high');
    });
  });

});
