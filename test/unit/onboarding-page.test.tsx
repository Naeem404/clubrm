import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OnboardingPage } from "../../src/components/auth/onboarding-page"

const mockCompleteOnboarding = vi.fn()

vi.mock("../../src/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "test@yorku.ca",
      user_metadata: {
        full_name: "Test User",
      },
    },
    profile: null,
    completeOnboarding: mockCompleteOnboarding,
  }),
}))

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompleteOnboarding.mockResolvedValue({ error: null })
  })

  it("renders the welcome step first", () => {
    render(<OnboardingPage />)

    expect(screen.getByText("Welcome.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start setup/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
  })

  it("moves to the details step after starting setup", () => {
    render(<OnboardingPage />)

    fireEvent.click(screen.getByRole("button", { name: /start setup/i }))

    expect(screen.getByText("Tell us about you.")).toBeInTheDocument()
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
    expect(screen.getByText("Reserved roles")).toBeInTheDocument()
  })

  it("does not show reserved high-level roles as selectable options", () => {
    render(<OnboardingPage />)

    fireEvent.click(screen.getByRole("button", { name: /start setup/i }))

    expect(screen.queryByRole("button", { name: /president/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /administrator/i })).not.toBeInTheDocument()
  })

  it("shows a validation error when no role is selected", async () => {
    render(<OnboardingPage />)

    fireEvent.click(screen.getByRole("button", { name: /start setup/i }))

    const nameInput = screen.getByLabelText(/^name$/i)
    fireEvent.change(nameInput, { target: { value: "Ash Deep" } })
    fireEvent.click(screen.getByRole("button", { name: /enter workspace/i }))

    expect(await screen.findByText("Please choose your role.")).toBeInTheDocument()
    expect(mockCompleteOnboarding).not.toHaveBeenCalled()
  })

  it("submits the selected role and name", async () => {
    render(<OnboardingPage />)

    fireEvent.click(screen.getByRole("button", { name: /start setup/i }))

    const nameInput = screen.getByLabelText(/^name$/i)
    fireEvent.change(nameInput, { target: { value: "Ash Deep" } })
    fireEvent.click(screen.getByRole("button", { name: /vp finance/i }))
    fireEvent.click(screen.getByRole("button", { name: /enter workspace/i }))

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledWith({
        fullName: "Ash Deep",
        role: "VP Finance",
      })
    })
  })
})
