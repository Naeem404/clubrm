import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import App from "../../src/App"

const authState = vi.hoisted(() => ({
  user: null as any,
  profile: null as any,
  loading: false,
  profileLoading: false,
}))

vi.mock("../../src/context/auth-context", () => ({
  useAuth: () => authState,
}))

// --- FIXED CONTEXT MOCKS ---
vi.mock("../../src/context/members-context.tsx", () => ({
  MembersProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMembers: () => ({
    members: [],
    totalMembers: 0,
    loading: false,
    addMember: vi.fn(),
    stats: { total: 0, active: 0, inactive: 0, alumni: 0 },
  }),
}))

vi.mock("../../src/context/events-context.tsx", () => ({
  EventsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useEvents: () => ({ events: [], loading: false }),
}))

vi.mock("../../src/context/tasks-context.tsx", () => ({
  TasksProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTasks: () => ({ tasks: [], loading: false }),
}))

vi.mock("../../src/context/finance-context.tsx", () => ({
  FinanceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  // ── FIX: return a `budget` object so budget.totalBudget doesn't throw ──
  useFinance: () => ({
    budget: {
      totalBudget: 0,
      termLabel: "Fall 2026",
      categories: [],
    },
    expenses: [],
    reimbursements: [],
    income: [],
    totalSpent: 0,
    totalIncome: 0,
    totalPending: 0,
    loading: false,
    addExpense: vi.fn(),
    updateExpenseStatus: vi.fn(),
    deleteExpense: vi.fn(),
    addIncome: vi.fn(),
    addReimbursement: vi.fn(),
    updateReimbursementStatus: vi.fn(),
  }),
}))

vi.mock("../../src/context/sponsors-context.tsx", () => ({
  SponsorsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSponsors: () => ({
    sponsors: [],
    loading: false,
    addSponsor: vi.fn(),
    updateSponsor: vi.fn(),
    deleteSponsor: vi.fn(),
    addContact: vi.fn(),
    updateContact: vi.fn(),
    addInteraction: vi.fn(),
  }),
}))

// UI Mocks
vi.mock("../../src/components/auth/auth-page", () => ({ AuthPage: () => <div>Mock Auth Page</div> }))
vi.mock("../../src/components/auth/onboarding-page", () => ({ OnboardingPage: () => <div>Mock Onboarding Page</div> }))
vi.mock("../../src/components/layout/sidebar", () => ({ AppSidebar: () => <aside>Mock Sidebar</aside> }))
vi.mock("../../src/components/layout/topbar", () => ({ TopBar: () => <header>Mock TopBar</header> }))
vi.mock("../../src/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSidebar: () => ({ open: true, setOpen: vi.fn() }),
}))

describe("Onboarding flow integration", () => {
  beforeEach(() => {
    authState.user = null
    authState.profile = null
    authState.loading = false
    authState.profileLoading = false
    vi.clearAllMocks()
  })

  it("shows the auth page when the user is signed out", async () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByText("Mock Auth Page")).toBeInTheDocument()
  })

  it("shows the onboarding page for signed-in users with incomplete onboarding", async () => {
    authState.user = { id: "user-1", email: "test@yorku.ca" }
    authState.profile = { onboarding_completed: false }
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByText("Mock Onboarding Page")).toBeInTheDocument()
  })

  it("shows the main app once onboarding is complete", async () => {
    authState.user = { id: "user-1", email: "test@yorku.ca" }
    authState.profile = { onboarding_completed: true }

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Mock Sidebar/i)).toBeInTheDocument()
  })
})