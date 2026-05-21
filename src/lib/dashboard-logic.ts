/**
 * Dashboard Logic Utility Functions
 * 
 * These functions represent the "Substance" of the application logic.
 * By isolating them here, we can perform thorough unit testing as required by ITR1.
 */

export interface OrgStats {
  members: number;
  activeMembers: number;
  totalBudget: number;
  spentBudget: number;
  onTrackEvents: number;
  totalEvents: number;
  completedTasks: number;
  totalTasks: number;
}

/**
 * Calculates the overall Health Score of the organization (0-100).
 * Based on member activity, budget status, event success, and task completion.
 */
export function calculateHealthScore(stats: OrgStats): number {
  if (stats.totalEvents === 0 && stats.totalTasks === 0 && stats.members === 0) return 100;

  const memberWeight = 0.3;
  const budgetWeight = 0.3;
  const eventWeight = 0.2;
  const taskWeight = 0.2;

  const memberScore = stats.members > 0 ? (stats.activeMembers / stats.members) * 100 : 100;
  
  // Budget is healthy if spent is less than or equal to total. 
  // If spent exceeds total, score drops.
  const budgetRatio = stats.totalBudget > 0 ? stats.spentBudget / stats.totalBudget : 0;
  const budgetScore = budgetRatio <= 1 ? (1 - budgetRatio) * 100 : Math.max(0, 100 - (budgetRatio - 1) * 200);

  const eventScore = stats.totalEvents > 0 ? (stats.onTrackEvents / stats.totalEvents) * 100 : 100;
  const taskScore = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 100;

  const totalScore = 
    (memberScore * memberWeight) + 
    (budgetScore * budgetWeight) + 
    (eventScore * eventWeight) + 
    (taskScore * taskWeight);

  return Math.round(totalScore);
}

/**
 * Calculates budget remaining as a rounded percentage.
 */
export function calculateBudgetPercentage(total: number, spent: number): number {
  if (total <= 0) return 0;
  const remaining = total - spent;
  return Math.round((remaining / total) * 100);
}

/**
 * Determines the severity level for a risk alert based on threshold.
 */
export function getMetricSeverity(value: number, thresholdLow: number, thresholdHigh: number): 'low' | 'medium' | 'high' {
  if (value >= thresholdHigh) return 'low';
  if (value >= thresholdLow) return 'medium';
  return 'high';
}
