import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, act, screen, cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import { EventsPage } from "../../src/components/events/events-page"
import { useEvents } from "../../src/context/events-context"
import { useSearchParams } from "react-router-dom"
import React from "react"

// Mock dependencies
vi.mock("../../src/context/events-context")
vi.mock("react-router-dom")
vi.mock("../../src/components/events/calendar-header", () => ({
  CalendarHeader: () => <div data-testid="header" />
}))
vi.mock("../../src/components/events/month-view", () => ({
  MonthView: ({ currentDate }: any) => <div data-testid="month-view">{currentDate.toISOString()}</div>
}))
vi.mock("../../src/components/events/week-view", () => ({
  WeekView: () => null
}))
vi.mock("../../src/components/events/day-view", () => ({
  DayView: () => null
}))
vi.mock("../../src/components/events/event-modal", () => ({
  EventModal: () => null
}))
vi.mock("../../src/components/events/event-detail-panel", () => ({
  EventDetailPanel: () => null
}))

describe("EventsPage Auto-Navigation", () => {
  const mockEvents = [
    { id: "1", title: "Target Event", startDate: "2026-05-20T10:00:00Z", location: "Venue" },
    { id: "2", title: "Other Event", startDate: "2026-06-15T12:00:00Z", location: "Venue" }
  ]

  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useEvents as any).mockReturnValue({
      events: mockEvents,
      addEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn()
    })
  })

  it("should navigate to matching event date when search query is provided", () => {
    const searchParams = new URLSearchParams()
    searchParams.set("search", "Target")
    ;(useSearchParams as any).mockReturnValue([searchParams, vi.fn()])

    render(<EventsPage />)

    const monthView = screen.getByTestId("month-view")
    expect(monthView.textContent).toContain("2026-05-20")
  })

  it("should not navigate if no match found", () => {
    const searchParams = new URLSearchParams()
    searchParams.set("search", "NonExistent")
    ;(useSearchParams as any).mockReturnValue([searchParams, vi.fn()])

    // We can't easily check "not changed" without initial state, 
    // but we can check if it stays current date (roughly now)
    const now = new Date()
    render(<EventsPage />)

    const monthView = screen.getByTestId("month-view")
    const displayedDate = new Date(monthView.textContent!)
    
    // Check if it's close to now (within the same minute is safe for tests)
    expect(displayedDate.getFullYear()).toBe(now.getFullYear())
    expect(displayedDate.getMonth()).toBe(now.getMonth())
  })
})
