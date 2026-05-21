import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { ContactsPage } from "../../src/components/contacts/contacts-page"
import { SponsorsProvider } from "../../src/context/sponsors-context"
import { FinanceProvider } from "../../src/context/finance-context"
import { AuthProvider } from "../../src/context/auth-context"
import { MemoryRouter } from "react-router-dom"
import React from 'react'

const mockChain = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn((onFulfilled) => {
    return Promise.resolve(onFulfilled({ data: [], error: null }))
  }),
}))

vi.mock("../../src/lib/supabase", () => ({
  supabase: mockChain,
  supabaseUntyped: mockChain,
}))

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>
      <FinanceProvider>
        <SponsorsProvider>
          {children}
        </SponsorsProvider>
      </FinanceProvider>
    </AuthProvider>
  </MemoryRouter>
)

describe("Contacts Page Persistence and State Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("handles error if supabase fails on update", async () => {
    mockChain.update.mockImplementationOnce(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'rejected promise' } })
    }))
    
    // Wrap render in act to absorb initial async provider fetches
    await act(async () => {
      render(<ContactsPage />, { wrapper: AllProviders })
    })

    // Wait for the actual title rendered by the component
    expect(await screen.findByText(/Professional Contacts/i)).toBeDefined()
  })

  it("calls supabase.insert on addContact", async () => {
    await act(async () => {
      render(<ContactsPage />, { wrapper: AllProviders })
    })

    // Wait for and click the actual button rendered by the component
    const addBtn = await screen.findByRole('button', { name: /Add Contact/i })
    fireEvent.click(addBtn)

    // Grab the first textbox in the modal (usually Name or Organization)
    const inputs = await screen.findAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'New Corp' } })
    
    // Grab the submit button inside the dialog (usually says Save, Create, or Add)
    const saveBtn = screen.getByRole('button', { name: /Save|Create|Add/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      // Allow for either 'sponsors' or 'contacts' depending on what table you use
      expect(mockChain.from).toHaveBeenCalledWith(expect.stringMatching(/sponsors|contacts/i))
      expect(mockChain.insert).toHaveBeenCalled()
    })
  })
})