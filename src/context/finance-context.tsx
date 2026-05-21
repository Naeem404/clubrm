import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import { logError } from "@/lib/logger"
import {
  type Expense,
  type Reimbursement,
  type Income,
  type Budget,
  type ExpenseStatus,
  type ReimbursementStatus,
} from "@/components/finance/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./auth-context"

const today = new Date()
const y = today.getFullYear()
const m = today.getMonth()

function d(day: number, month?: number): Date {
  return new Date(y, month !== undefined ? month : m, day)
}

const SEED_BUDGET: Budget = {
  totalBudget: 18000,
  termLabel: "Fall 2026",
}

export const SEED_EXPENSES: Expense[] = [
  { id: "e1f1a2b3-c4d5-4e6f-8a9b-0c1d2e3f4a5b", description: "Venue deposit - Main Hall", amount: 250, category: "events", date: d(5), status: "approved", submittedBy: "Sarah Smith", approvedBy: "Emily Chen" },
  { id: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6g", description: "Marketing flyers (200 copies)", amount: 89, category: "marketing", date: d(3), status: "pending", submittedBy: "Lisa Wang" },
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", description: "Snacks for exec meeting", amount: 45, category: "food", date: d(1), status: "approved", submittedBy: "Mike Johnson", approvedBy: "Emily Chen" },
  { id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", description: "Photography for Tech Talk", amount: 150, category: "events", date: d(8), status: "approved", submittedBy: "Sarah Smith", approvedBy: "Emily Chen" },
  { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", description: "Domain renewal - clubrm.org", amount: 35, category: "technology", date: d(2), status: "approved", submittedBy: "Tom Davis", approvedBy: "Emily Chen" },
  { id: "d3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7g", description: "Banner & signage for Valentine Social", amount: 120, category: "marketing", date: d(6), status: "approved", submittedBy: "Lisa Wang", approvedBy: "Emily Chen" },
]

export const SEED_REIMBURSEMENTS: Reimbursement[] = [
  { id: "e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7g8h", submittedBy: "John Doe", amount: 145, description: "Food for networking event", category: "food", date: d(5), status: "pending" },
  { id: "f5a6b7c8-d9e0-4f1a-2b3c-4d5e6f7g8h9i", submittedBy: "Sarah Smith", amount: 89, description: "Office supplies", category: "operations", date: d(4), status: "pending" },
  { id: "g6h7i8j9-k0l1-4m2n-3o4p-5q6r7s8t9u0v", submittedBy: "Alex Brown", amount: 35, description: "Uber to sponsor meeting", category: "operations", date: d(6), status: "pending" },
]

export const SEED_INCOME: Income[] = [
  { id: "h7i8j9k0-l1m2-4n3o-4p5q-6r7s8t9u0v1w", source: "Member Dues - Fall Term (42 members)", amount: 4200, type: "dues", date: d(1, m - 2), recurring: true },
  { id: "i8j9k0l1-m2n3-4o4p-5q6r-7s8t9u0v1w2x", source: "TechCorp Sponsorship - Gold Tier", amount: 5000, type: "sponsorship", date: d(15, m - 1) },
]

// Rows
function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
    category: row.category as string,
    date: row.date ? new Date(row.date as string) : new Date(),
    status: row.status as ExpenseStatus,
    submittedBy: row.submitted_by as string,
    approvedBy: (row.approved_by as string) || undefined,
    receiptUrl: (row.receipt_url as string) || undefined,
    notes: (row.notes as string) || undefined,
  }
}
function expenseToRow(e: Expense) {
  return {
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: e.date ? new Date(e.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    status: e.status,
    submitted_by: e.submittedBy,
    approved_by: e.approvedBy || null,
    receipt_url: e.receiptUrl || null,
    notes: e.notes || null,
  }
}

function toReimbursement(row: Record<string, unknown>): Reimbursement {
  return {
    id: row.id as string,
    submittedBy: row.submitted_by as string,
    amount: Number(row.amount),
    description: row.description as string,
    category: row.category as string,
    date: row.date ? new Date(row.date as string) : new Date(),
    status: row.status as ReimbursementStatus,
    receiptUrl: (row.receipt_url as string) || undefined,
    approvedBy: (row.approved_by as string) || undefined,
    paidDate: row.paid_date ? new Date(row.paid_date as string) : undefined,
    notes: (row.notes as string) || undefined,
  }
}

function reimbursementToRow(r: Reimbursement) {
  return {
    submitted_by: r.submittedBy,
    amount: r.amount,
    description: r.description,
    category: r.category,
    date: r.date ? new Date(r.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    status: r.status,
    receipt_url: r.receiptUrl || null,
    approved_by: r.approvedBy || null,
    paid_date: r.paidDate ? new Date(r.paidDate).toISOString().split("T")[0] : null,
    notes: r.notes || null,
  }
}

function toIncome(row: Record<string, unknown>): Income {
  return {
    id: row.id as string,
    source: row.source as string,
    amount: Number(row.amount),
    type: row.type as Income["type"],
    date: row.date ? new Date(row.date as string) : new Date(),
    notes: (row.notes as string) || undefined,
    recurring: row.recurring as boolean | undefined,
  }
}

function incomeToRow(i: Income) {
  return {
    source: i.source,
    amount: i.amount,
    type: i.type,
    date: i.date ? new Date(i.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    notes: i.notes || null,
    recurring: i.recurring || false,
  }
}

interface FinanceContextType {
  budget: Budget
  expenses: Expense[]
  reimbursements: Reimbursement[]
  income: Income[]
  addExpense: (expense: Expense) => void
  updateExpenseStatus: (id: string, status: ExpenseStatus, approvedBy?: string) => void
  deleteExpense: (id: string) => void
  addReimbursement: (reimbursement: Reimbursement) => void
  updateReimbursementStatus: (id: string, status: ReimbursementStatus, approvedBy?: string) => void
  addIncome: (income: Income) => void
  deleteIncome: (id: string) => void
  totalSpent: number
  totalIncome: number
  totalPending: number
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ 
  children, 
  initialExpenses = [], 
  initialIncome = [], 
  initialReimbursements = [] 
}: { 
  children: React.ReactNode,
  initialExpenses?: Expense[],
  initialIncome?: Income[],
  initialReimbursements?: Reimbursement[]
}) {
  const [budget, setBudget] = useState<Budget>(SEED_BUDGET)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>(initialReimbursements)
  const [income, setIncome] = useState<Income[]>(initialIncome)
  const { user } = useAuth()
  const orgId = user?.id

  useEffect(() => {
    if (initialExpenses.length > 0 || initialIncome.length > 0 || initialReimbursements.length > 0) return
    async function load() {
      const budgetQuery = supabase.from("budgets").select("*").limit(1)
      if (orgId) {
        budgetQuery.eq("organization_id", orgId)
      }
      const { data: budgetData } = await budgetQuery.single()
      if (budgetData) {
        setBudget({ totalBudget: Number(budgetData.total_budget), termLabel: budgetData.term_label as string })
      }

      const expQuery = supabase.from("expenses").select("*").order("date", { ascending: false })
      if (orgId) {
        expQuery.eq("organization_id", orgId)
      }
      const { data: expData, error: expErr } = await expQuery
      if (expErr) {
        logError("Failed to load expenses", 'FinanceContext', expErr)
        setExpenses(SEED_EXPENSES)
      } else if (expData && expData.length > 0) {
        setExpenses(expData.map(toExpense))
      } else {
        const rows = SEED_EXPENSES.map(e => ({ ...expenseToRow(e), organization_id: orgId }))
        const { data: seeded } = await supabase.from("expenses").insert(rows).select()
        setExpenses(seeded ? seeded.map(toExpense) : SEED_EXPENSES)
      }

      // Reimbursements
      const reimQuery = supabase.from("reimbursements").select("*").order("date", { ascending: false })
      if (orgId) {
        reimQuery.eq("organization_id", orgId)
      }
      const { data: reimData, error: reimErr } = await reimQuery
      if (reimErr) {
        logError("Failed to load reimbursements", 'FinanceContext', reimErr)
        setReimbursements(SEED_REIMBURSEMENTS)
      } else if (reimData && reimData.length > 0) {
        setReimbursements(reimData.map(toReimbursement))
      } else {
        const rows = SEED_REIMBURSEMENTS.map(r => ({ ...reimbursementToRow(r), organization_id: orgId }))
        const { data: seeded } = await supabase.from("reimbursements").insert(rows).select()
        setReimbursements(seeded ? seeded.map(toReimbursement) : SEED_REIMBURSEMENTS)
      }

      // Income
      const incQuery = supabase.from("income").select("*").order("date", { ascending: false })
      if (orgId) {
        incQuery.eq("organization_id", orgId)
      }
      const { data: incData, error: incErr } = await incQuery
      if (incErr) {
        logError("Failed to load income", 'FinanceContext', incErr)
        setIncome(SEED_INCOME)
      } else if (incData && incData.length > 0) {
        setIncome(incData.map(toIncome))
      } else {
        const rows = SEED_INCOME.map(i => ({ ...incomeToRow(i), organization_id: orgId }))
        const { data: seeded } = await supabase.from("income").insert(rows).select()
        setIncome(seeded ? seeded.map(toIncome) : SEED_INCOME)
      }
    }
    load()
  }, [orgId, initialExpenses.length, initialIncome.length, initialReimbursements.length])

  const totalSpent = useMemo(
    () => expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const totalIncome = useMemo(
    () => income.reduce((sum, i) => sum + i.amount, 0),
    [income]
  )

  const totalPending = useMemo(
    () => expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const addExpense = useCallback(async (expense: Expense) => {
    const row = { ...expenseToRow({ ...expense, id: crypto.randomUUID() }), organization_id: orgId }
    const { data, error } = await supabase.from("expenses").insert(row).select().single()
    if (error) { 
      logError("Failed to add expense", 'FinanceContext', error)
      throw error
    }
    if (data) setExpenses((prev) => [toExpense(data), ...prev])
  }, [orgId])

  const updateExpenseStatus = useCallback(async (id: string, status: ExpenseStatus, approvedBy?: string) => {
  const update: { status: string; approved_by?: string; organization_id?: string } = { status }
  if (approvedBy) update.approved_by = approvedBy
  if (orgId) update.organization_id = orgId
  
  const { error } = await supabase.from("expenses").update(update as any).eq("id", id)
  
  if (error) { 
    logError("Failed to update expense", 'FinanceContext', error)
    throw error // This is vital for the .rejects test to work
  }

  setExpenses((prev) =>
    prev.map((e) => (e.id === id ? { ...e, status, approvedBy: approvedBy || e.approvedBy } : e))
  )
  }, [])

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id)
    if (error) {
       logError("Failed to delete expense", 'FinanceContext', error)
       throw error
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const addReimbursement = useCallback(async (reimbursement: Reimbursement) => {
    const row = { ...reimbursementToRow({ ...reimbursement, id: crypto.randomUUID() }), organization_id: orgId }
    const { data, error } = await supabase.from("reimbursements").insert(row).select().single()
    if (error) { 
      logError("Failed to add reimbursement", 'FinanceContext', error)
      throw error
    }
    if (data) setReimbursements((prev) => [toReimbursement(data), ...prev])
  }, [orgId])

  const updateReimbursementStatus = useCallback(
    async (id: string, status: ReimbursementStatus, approvedBy?: string) => {
      const update: { status: string; approved_by?: string; paid_date?: string; organization_id?: string } = { status }
      if (approvedBy) update.approved_by = approvedBy
      if (status === "paid") update.paid_date = new Date().toISOString().split("T")[0]
      if (orgId) update.organization_id = orgId
      const { error } = await supabase.from("reimbursements").update(update as any).eq("id", id)
      if (error) { 
        logError("Failed to update reimbursement", 'FinanceContext', error)
        throw error
      }
      setReimbursements((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                approvedBy: approvedBy || r.approvedBy,
                paidDate: status === "paid" ? new Date() : r.paidDate,
              }
            : r
        )
      )
    },
    [orgId]
  )

  const addIncome = useCallback(async (inc: Income) => {
    const row = { ...incomeToRow(inc), organization_id: orgId }
    const { data, error } = await supabase.from("income").insert(row).select().single()
    if (error) { logError("Failed to add income", 'FinanceContext', error); throw error }
    if (data) setIncome((prev) => [toIncome(data), ...prev])
  }, [orgId])

  const deleteIncome = useCallback(async (id: string) => {
    const query = supabase.from("income").delete().eq("id", id)
    if (orgId) {
      query.eq("organization_id", orgId)
    }
    const { error } = await query
    if (error) { logError("Failed to delete income", 'FinanceContext', error); return }
    setIncome((prev) => prev.filter((i) => i.id !== id))
  }, [orgId])

  return (
    <FinanceContext.Provider
      value={{
        budget,
        expenses,
        reimbursements,
        income,
        addExpense,
        updateExpenseStatus,
        deleteExpense,
        addReimbursement,
        updateReimbursementStatus,
        addIncome,
        deleteIncome,
        totalSpent,
        totalIncome,
        totalPending,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }
  return context
}