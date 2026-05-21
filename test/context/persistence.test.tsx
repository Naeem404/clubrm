import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { FinanceProvider, useFinance } from "../../src/context/finance-context"
import { SponsorsProvider, useSponsors } from "../../src/context/sponsors-context"
import React from 'react'

const mockChain = vi.hoisted(() => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  // Handles both Promise-based and callback-based resolutions
  then: vi.fn((onFulfilled?: any, _onRejected?: any) => {
    return Promise.resolve(
      onFulfilled ? onFulfilled({ data: [], error: null }) : { data: [], error: null }
    );
  }),
}));

// Mock both exports to prevent the 'supabaseUntyped' crash
vi.mock("../../src/lib/supabase", () => ({
  supabase: mockChain,
  supabaseUntyped: mockChain,
}))

describe("Persistence and State Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default success mock for initialization
    mockChain.then.mockImplementation((onFulfilled?: any) =>
      Promise.resolve(
        onFulfilled ? onFulfilled({ data: [], error: null }) : { data: [], error: null }
      )
    )
  })

  it("handles error if supabase fails on update", async () => {
    mockChain.update.mockImplementationOnce(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'rejected promise' } })
    }))

    const { result } = renderHook(() => useFinance(), {
      wrapper: ({ children }) => <FinanceProvider>{children}</FinanceProvider>
    })

    await act(async () => {
      await expect(result.current.updateExpenseStatus("err-id", "approved"))
        .rejects.toMatchObject({ message: 'rejected promise' })
    })
  })

  it("calls supabase.insert on addContact", async () => {
    const { result } = renderHook(() => useSponsors(), {
      wrapper: ({ children }) => <SponsorsProvider>{children}</SponsorsProvider>
    })

    await act(async () => {
      // FIXED: Changed 'role' to 'title' and added missing required fields 
      // from the SponsorContact interface (phone, tags, createdAt)
      await result.current.addContact("f47ac10b-58cc-4372-a567-0e02b2c3d479", {
        id: "contact-1",
        name: "Test User",
        email: "test@example.com",
        title: "Manager", // Matches interface
        phone: "555-0199", // Required in interface
        organization: "TechNova Solutions",
        tags: ["Test"], // Required in interface
        createdAt: new Date().toISOString(), // Required in interface
      })
    })

    await waitFor(() => {
      expect(mockChain.insert).toHaveBeenCalled()
    })
  })
})