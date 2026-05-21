import { describe, it, expect, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { EventsProvider, useEvents, SEED_EVENTS } from "../../src/context/events-context"
import type { ReactNode } from "react"

const { mockSupabase } = vi.hoisted(() => {
  const events = [{ id: "e1", title: "Seed Event", start_date: new Date().toISOString(), end_date: new Date().toISOString(), all_day: false }];
  return {
    mockSupabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: events, error: null })),
      })),
    }
  };
});

vi.mock("../../src/lib/supabase", () => ({
  supabase: mockSupabase,
  supabaseUntyped: mockSupabase,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <EventsProvider initialEvents={SEED_EVENTS}>{children}</EventsProvider>
}

describe("EventsContext", () => {
  it("adds an event", async () => {
    const { result } = renderHook(() => useEvents(), { wrapper })
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0))
    
    const before = result.current.events.length
    await act(async () => {
      await result.current.addEvent({
        id: "test-event",
        title: "Test Event",
        description: "Test Desc",
        startDate: new Date(),
        endDate: new Date(),
        colorId: "blue",
        allDay: false,
        location: "Test Loc",
        tags: [],
        collaborators: [],
        createdBy: "m1",
        isPublic: true,
        status: "confirmed",
      })
    })

    await waitFor(() => {
      expect(result.current.events.length).toBe(before + 1)
    })
  })

  it("updates an event", async () => {
    const { result } = renderHook(() => useEvents(), { wrapper })
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0))
    
    const first = result.current.events[0]
    await act(async () => {
      await result.current.updateEvent({ ...first, title: "Updated Event" })
    })

    await waitFor(() => {
      const updated = result.current.events.find((e) => e.id === first.id)
      expect(updated?.title).toBe("Updated Event")
    })
  })

  it("deletes an event", async () => {
    const { result } = renderHook(() => useEvents(), { wrapper })
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0))
    
    const firstId = result.current.events[0].id
    await act(async () => {
      await result.current.deleteEvent(firstId)
    })

    await waitFor(() => {
      expect(result.current.events.length).toBeLessThan(SEED_EVENTS.length + 1)
    })
  })
})