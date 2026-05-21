import { describe, it, expect, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { FinanceProvider, useFinance, SEED_EXPENSES } from "../../src/context/finance-context"
import type { ReactNode } from "react"

const { mockFinanceSupabase } = vi.hoisted(() => {
  const budget = { total_budget: 18000, term_label: "Fall 2026" };
  const expenses = [
    { id: "e1", description: "Seed Expense", amount: 200, status: "approved", category: "events", date: new Date().toISOString() },
    { id: "e2", description: "Pending Item", amount: 50, status: "pending", category: "food", date: new Date().toISOString() }
  ];
  return {
    mockFinanceSupabase: {
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => {
          let data: any = [];
          if (table === 'budgets') data = budget;
          if (table === 'expenses') data = expenses;
          return cb({ data, error: null });
        }),
      })),
    }
  };
});

vi.mock("../../src/lib/supabase", () => ({
  supabase: mockFinanceSupabase,
  supabaseUntyped: mockFinanceSupabase,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <FinanceProvider initialExpenses={SEED_EXPENSES}>{children}</FinanceProvider>
}

describe("FinanceContext", () => {
  it("adds an expense", async () => {
    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.expenses.length).toBeGreaterThan(0))
    
    const before = result.current.expenses.length
    await act(async () => {
      await result.current.addExpense({
        id: "test-e",
        description: "Test Expense",
        amount: 100,
        category: "events",
        date: new Date(),
        status: "pending",
        submittedBy: "Test User",
      })
    })

    await waitFor(() => {
      expect(result.current.expenses.length).toBe(before + 1)
    })
  })

  it("updates expense status", async () => {
    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.expenses.length).toBeGreaterThan(0))
    
    const pendingExpense = result.current.expenses.find((e) => e.status === "pending")
    
    await act(async () => {
      await result.current.updateExpenseStatus(pendingExpense!.id, "approved", "Admin")
    })

    await waitFor(() => {
      const updated = result.current.expenses.find((e) => e.id === pendingExpense!.id)
      expect(updated?.status).toBe("approved")
    })
  })

  it("deletes an expense", async () => {
    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.expenses.length).toBeGreaterThan(0))
    
    const firstId = result.current.expenses[0].id
    const before = result.current.expenses.length

    await act(async () => {
      await result.current.deleteExpense(firstId)
    })

    await waitFor(() => {
      expect(result.current.expenses.length).toBe(before - 1)
    })
  })
})