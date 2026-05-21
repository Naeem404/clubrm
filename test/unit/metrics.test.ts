import { describe, it, expect } from "vitest"
import { MOCK_MEMBERS, MOCK_TASKS, MOCK_FINANCE, MOCK_EVENTS } from "./db-stub"

// These are pure logic functions extracted/mimicked from the components
// to test the "Business Logic" layer as requested.

const calculateRoleCounts = (members: any[]) => {
  const counts: Record<string, number> = {}
  members.forEach(m => {
    counts[m.role] = (counts[m.role] || 0) + 1
  })
  return counts
}

const calculateFinanceStats = (finance: any) => {
  const totalSpent = finance.expenses
    .filter((e: any) => e.status === 'approved')
    .reduce((sum: number, e: any) => sum + e.amount, 0)
  
  const budgetRemaining = finance.budget.totalBudget - totalSpent
  const utilization = (totalSpent / finance.budget.totalBudget) * 100
  
  return { totalSpent, budgetRemaining, utilization }
}

const calculateEventReadiness = (events: any[]) => {
  const confirmed = events.filter(e => e.status === 'confirmed')
  return events.length > 0 ? (confirmed.length / events.length) * 100 : 0
}

describe("Dashboard Metric Calculations", () => {
  it("should correctly calculate role distribution", () => {
    const counts = calculateRoleCounts(MOCK_MEMBERS)
    expect(counts["President"]).toBe(1)
    expect(counts["Administrator"]).toBe(1)
    expect(counts["Member"]).toBe(1)
    expect(Object.keys(counts).length).toBe(5)
  })

  it("should correctly calculate finance metrics", () => {
    const { totalSpent, budgetRemaining, utilization } = calculateFinanceStats(MOCK_FINANCE)
    
    // ex1 (500) and ex2 (150) are approved. ex3 (200) is pending.
    expect(totalSpent).toBe(650)
    expect(budgetRemaining).toBe(MOCK_FINANCE.budget.totalBudget - 650)
    expect(utilization).toBeCloseTo((650 / 25000) * 100)
  })

  it("should correctly calculate event readiness", () => {
    const readiness = calculateEventReadiness(MOCK_EVENTS)
    // e1, e2 are confirmed. e3 is draft.
    expect(readiness).toBeCloseTo((2/3) * 100)
  })

  it("should filter personal tasks correctly", () => {
    const userId = "m3"
    const myTasks = MOCK_TASKS.filter(t => t.assignees.includes(userId))
    expect(myTasks.length).toBe(1)
    expect(myTasks[0].title).toBe("Review Budget")
  })
})
