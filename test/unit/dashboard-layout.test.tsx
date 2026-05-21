import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, act, cleanup } from "@testing-library/react"
import { DashboardLayoutProvider, useDashboardLayout } from "../../src/components/dashboard/customization/dashboard-layout-provider"
import React from "react"
import { afterEach } from "vitest"

// Helper component to test the context
const TestComponent = () => {
  const { layout, visibleWidgets, toggleWidgetVisibility, resetLayout, isCustomizing, setIsCustomizing } = useDashboardLayout()
  return (
    <div>
      <div data-testid="layout">{JSON.stringify(layout)}</div>
      <div data-testid="visible">{JSON.stringify(Array.from(visibleWidgets))}</div>
      <div data-testid="customizing">{isCustomizing.toString()}</div>
      <button onClick={() => toggleWidgetVisibility("w1")}>Toggle W1</button>
      <button onClick={() => setIsCustomizing(true)}>Start Customizing</button>
      <button onClick={resetLayout}>Reset</button>
    </div>
  )
}

describe("DashboardLayoutProvider", () => {
  const defaultWidgets = ["w1", "w2", "w3"]
  const role = "TestRole"

  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("should initialize with default widgets", () => {
    render(
      <DashboardLayoutProvider role={role} defaultWidgets={defaultWidgets}>
        <TestComponent />
      </DashboardLayoutProvider>
    )

    expect(JSON.parse(screen.getByTestId("layout").textContent!)).toEqual(defaultWidgets)
    expect(JSON.parse(screen.getByTestId("visible").textContent!)).toEqual(defaultWidgets)
  })

  it("should toggle widget visibility", () => {
    render(
      <DashboardLayoutProvider role={role} defaultWidgets={defaultWidgets}>
        <TestComponent />
      </DashboardLayoutProvider>
    )

    const toggleBtn = screen.getByText("Toggle W1")
    act(() => {
      toggleBtn.click()
    })

    expect(JSON.parse(screen.getByTestId("visible").textContent!)).toEqual(["w2", "w3"])
    
    act(() => {
      toggleBtn.click()
    })
    expect(JSON.parse(screen.getByTestId("visible").textContent!)).toEqual(["w2", "w3", "w1"])
  })

  it("should persist layout to localStorage", () => {
    const { unmount } = render(
      <DashboardLayoutProvider role={role} defaultWidgets={defaultWidgets}>
        <TestComponent />
      </DashboardLayoutProvider>
    )

    // Initially saved defaults
    expect(localStorage.getItem(`dashboard_layout_${role}`)).toBeTruthy()

    unmount()
  })

  it("should reset layout", () => {
    render(
      <DashboardLayoutProvider role={role} defaultWidgets={defaultWidgets}>
        <TestComponent />
      </DashboardLayoutProvider>
    )

    act(() => {
      screen.getByText("Toggle W1").click()
    })
    
    expect(JSON.parse(screen.getByTestId("visible").textContent!)).not.toEqual(defaultWidgets)

    act(() => {
      screen.getByText("Reset").click()
    })

    expect(JSON.parse(screen.getByTestId("visible").textContent!)).toEqual(defaultWidgets)
  })
})
