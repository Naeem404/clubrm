import { vi, expect, afterEach, beforeEach } from "vitest"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

afterEach(() => {
  cleanup()
})

// Stateful mock with synchronous resolution for 100% test reliability
let tableStates: Record<string, any[]> = {}

beforeEach(() => {
  tableStates = {
    tasks: [],
    expenses: [],
    events: [],
    income: [],
    sponsors: [],
  }
})

const createMockTable = (tableName: string) => {
  const table: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockImplementation((payload) => {
      const rows = Array.isArray(payload) ? payload : [payload]
      tableStates[tableName] = [...(tableStates[tableName] || []), ...rows]
      return table
    }),
    update: vi.fn().mockImplementation((payload) => {
      const rows = Array.isArray(payload) ? payload : [payload]
      tableStates[tableName] = rows
      return table
    }),
    delete: vi.fn().mockImplementation(() => {
      tableStates[tableName] = []
      return table
    }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const data = tableStates[tableName]?.[tableStates[tableName].length - 1] || null
      return Promise.resolve({ data, error: null })
    }),
    then: vi.fn().mockImplementation((cb) => {
      const data = tableStates[tableName] || []
      return Promise.resolve(cb({ data, error: null }))
    }),
  }
  return table
}

const mockSupabase = {
  from: vi.fn((name) => createMockTable(name)),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "test-user" } } }, error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}))

if (typeof crypto === "undefined") {
  (global as any).crypto = { randomUUID: () => "0000-0000" }
} else {
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: vi.fn().mockReturnValue("0000-0000")
  })
}

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
