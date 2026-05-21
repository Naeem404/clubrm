import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { FinanceProvider, useFinance } from "../../src/context/finance-context"
import React from 'react'

const mockChain = vi.hoisted(() => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  // `insert` was missing — finance-context calls it during the seeding step,
  // which caused an unhandled "insert is not a function" rejection.
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn((onFulfilled?: any) =>
    Promise.resolve(
      onFulfilled ? onFulfilled({ data: [], error: null }) : { data: [], error: null }
    )
  ),
}));

vi.mock("../../src/lib/supabase", () => ({
  supabase: mockChain
}))

describe("President Dashboard Persistence", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls supabase.update when updating expense status", async () => {
    const { result } = renderHook(() => useFinance(), {
      wrapper: ({ children }) => <FinanceProvider>{children}</FinanceProvider>
    })

    await waitFor(() => expect(result.current.expenses).toBeDefined())

    await act(async () => {
      await result.current.updateExpenseStatus("test-id", "approved", "President")
    })

    expect(mockChain.update).toHaveBeenCalled()
  })
})