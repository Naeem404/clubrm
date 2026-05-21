import { describe, it, expect } from "vitest"
import { calculateHealthScore, calculateBudgetPercentage } from "../../src/lib/dashboard-logic"

describe("Dashboard Mathematical Logic", () => {
  describe("calculateHealthScore", () => {
    it("handles perfect stats", () => {
      const stats = {
        members: 100,
        activeMembers: 100,
        totalBudget: 1000,
        spentBudget: 0,
        onTrackEvents: 10,
        totalEvents: 10,
        completedTasks: 10,
        totalTasks: 10
      }
      expect(calculateHealthScore(stats)).toBe(100)
    })

    it("handles zero stats gracefully", () => {
      const stats = {
        members: 0,
        activeMembers: 0,
        totalBudget: 0,
        spentBudget: 0,
        onTrackEvents: 0,
        totalEvents: 0,
        completedTasks: 0,
        totalTasks: 0
      }
      expect(calculateHealthScore(stats)).toBe(100) // Default for empty org
    })

    it("penalizes overspending heavily", () => {
      const stats = {
        members: 10,
        activeMembers: 10,
        totalBudget: 100,
        spentBudget: 200, // 100% overspend
        onTrackEvents: 1,
        totalEvents: 1,
        completedTasks: 1,
        totalTasks: 1
      }
      // Member score: 100 (30 pts)
      // Budget score: (ratio=2, score= Math.max(0, 100 - (1) * 200) = 0) (0 pts)
      // Event score: 100 (20 pts)
      // Task score: 100 (20 pts)
      // Total: 70
      expect(calculateHealthScore(stats)).toBe(70)
    })
  })

  describe("calculateBudgetPercentage", () => {
    it("calculates basic percentage", () => {
      expect(calculateBudgetPercentage(100, 25)).toBe(75)
    })
    it("handles zero divisor", () => {
      expect(calculateBudgetPercentage(0, 10)).toBe(0)
    })
  })
})
