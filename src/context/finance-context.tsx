import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react"
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
import { useToast } from "./toast-context"

/*
 * Single-club data layer: every authenticated user reads the shared club rows;
 * access is enforced by RLS (see supabase/migration-security-hardening.sql).
 * owner_id is set by the database. New expenses/reimbursements are always
 * inserted as 'pending'; approval changes are restricted server-side to
 * VP Finance / President / Administrator.
 */

const EMPTY_BUDGET: Budget = { totalBudget: 0, termLabel: "" }

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message
  }
  return typeof err === "string" ? err : "Unknown error"
}

/** Toast helper that degrades to a no-op when no ToastProvider is mounted. */
function useErrorToast() {
  let showToast: ReturnType<typeof useToast>["showToast"] | null = null
  try {
    showToast = useToast().showToast
  } catch {
    showToast = null
  }
  return useCallback(
    (title: string, message?: string) => showToast?.({ type: "error", title, message }),
    [showToast]
  )
}

const isoDate = (d?: Date | string | null) =>
  (d ? new Date(d) : new Date()).toISOString().split("T")[0]

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

/** Insert payload: status/approval are never client-controlled on create. */
function expenseToInsertRow(e: Expense) {
  return {
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: isoDate(e.date),
    status: "pending" as const,
    submitted_by: e.submittedBy,
    approved_by: null,
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

function reimbursementToInsertRow(r: Reimbursement) {
  return {
    submitted_by: r.submittedBy,
    amount: r.amount,
    description: r.description,
    category: r.category,
    date: isoDate(r.date),
    status: "pending" as const,
    receipt_url: r.receiptUrl || null,
    approved_by: null,
    paid_date: null,
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
    date: isoDate(i.date),
    notes: i.notes || null,
    recurring: i.recurring || false,
  }
}

interface FinanceContextType {
  /** totalBudget is 0 until a budget row exists; check budgetSet before dividing. */
  budget: Budget
  budgetSet: boolean
  expenses: Expense[]
  reimbursements: Reimbursement[]
  income: Income[]
  loading: boolean
  /** Message of the last failed load, or null. */
  error: string | null
  refresh: () => Promise<void>
  /** All mutations update optimistically, roll back + toast on failure, then rethrow. */
  addExpense: (expense: Expense) => Promise<void>
  updateExpenseStatus: (id: string, status: ExpenseStatus, approvedBy?: string) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  addReimbursement: (reimbursement: Reimbursement) => Promise<void>
  updateReimbursementStatus: (id: string, status: ReimbursementStatus, approvedBy?: string) => Promise<void>
  addIncome: (income: Income) => Promise<void>
  deleteIncome: (id: string) => Promise<void>
  totalSpent: number
  totalIncome: number
  totalPending: number
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

/** Re-insert a removed item at its old index unless it already came back. */
function reinsert<T extends { id: string }>(list: T[], item: T, index: number): T[] {
  if (list.some((x) => x.id === item.id)) return list
  const next = [...list]
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
  return next
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const notifyError = useErrorToast()

  const [budget, setBudget] = useState<Budget>(EMPTY_BUDGET)
  const [budgetSet, setBudgetSet] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expensesRef = useRef(expenses)
  expensesRef.current = expenses
  const reimbursementsRef = useRef(reimbursements)
  reimbursementsRef.current = reimbursements
  const incomeRef = useRef(income)
  incomeRef.current = income
  const requestRef = useRef(0)

  const reset = useCallback(() => {
    setBudget(EMPTY_BUDGET)
    setBudgetSet(false)
    setExpenses([])
    setReimbursements([])
    setIncome([])
    setError(null)
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const [budgetRes, expRes, reimRes, incRes] = await Promise.all([
        supabase.from("budgets").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("reimbursements").select("*").order("date", { ascending: false }),
        supabase.from("income").select("*").order("date", { ascending: false }),
      ])
      if (requestId !== requestRef.current) return

      const failures: string[] = []
      const check = (name: string, err: unknown) => {
        if (!err) return true
        logError(`Failed to load ${name}`, "FinanceContext", err)
        failures.push(`${name}: ${errorMessage(err)}`)
        return false
      }

      if (check("budget", budgetRes.error)) {
        const row = budgetRes.data as Record<string, unknown> | null
        const total = row ? Number(row.total_budget) : 0
        const isSet = !!row && Number.isFinite(total) && total > 0
        setBudget({ totalBudget: isSet ? total : 0, termLabel: row ? String(row.term_label ?? "") : "" })
        setBudgetSet(isSet)
      }
      if (check("expenses", expRes.error)) {
        setExpenses(((expRes.data ?? []) as Record<string, unknown>[]).map(toExpense))
      }
      if (check("reimbursements", reimRes.error)) {
        setReimbursements(((reimRes.data ?? []) as Record<string, unknown>[]).map(toReimbursement))
      }
      if (check("income", incRes.error)) {
        setIncome(((incRes.data ?? []) as Record<string, unknown>[]).map(toIncome))
      }

      if (failures.length > 0) {
        const msg = failures.join("; ")
        setError(msg)
        notifyError("Couldn't load finance data", msg)
      }
    } catch (err) {
      if (requestId !== requestRef.current) return
      const msg = errorMessage(err)
      logError("Failed to load finance data", "FinanceContext", err)
      setError(msg)
      notifyError("Couldn't load finance data", msg)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [userId, notifyError])

  useEffect(() => {
    // Clear on sign-out / user switch; never query while signed out.
    reset()
    if (!userId) {
      requestRef.current++
      setLoading(false)
      return
    }
    void load()
    return () => {
      requestRef.current++
    }
  }, [userId, load, reset])

  const fail = useCallback((action: string, err: unknown): never => {
    logError(`Failed to ${action}`, "FinanceContext", err)
    notifyError(`Couldn't ${action}`, errorMessage(err))
    throw err
  }, [notifyError])

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

  // ── Expenses ──────────────────────────────────────────────────────────────

  const addExpense = useCallback(async (expense: Expense) => {
    const tempId = `temp-${crypto.randomUUID()}`
    setExpenses((prev) => [{ ...expense, id: tempId, status: "pending", approvedBy: undefined }, ...prev])
    try {
      const { data, error: err } = await supabase.from("expenses").insert(expenseToInsertRow(expense)).select().single()
      if (err) throw err
      if (!data) throw new Error("Expense was not created")
      const created = toExpense(data as Record<string, unknown>)
      setExpenses((prev) => prev.map((e) => (e.id === tempId ? created : e)))
    } catch (err) {
      setExpenses((prev) => prev.filter((e) => e.id !== tempId))
      fail("add expense", err)
    }
  }, [fail])

  const updateExpenseStatus = useCallback(async (id: string, status: ExpenseStatus, approvedBy?: string) => {
    const previous = expensesRef.current.find((e) => e.id === id)
    const update: { status: ExpenseStatus; approved_by?: string } = { status }
    if (approvedBy) update.approved_by = approvedBy
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status, approvedBy: approvedBy || e.approvedBy } : e))
    )
    try {
      const { error: err } = await supabase.from("expenses").update(update).eq("id", id)
      if (err) throw err
    } catch (err) {
      if (previous) setExpenses((prev) => prev.map((e) => (e.id === id ? previous : e)))
      fail("update expense", err)
    }
  }, [fail])

  const deleteExpense = useCallback(async (id: string) => {
    const index = expensesRef.current.findIndex((e) => e.id === id)
    const previous = index >= 0 ? expensesRef.current[index] : undefined
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    try {
      const { error: err } = await supabase.from("expenses").delete().eq("id", id)
      if (err) throw err
    } catch (err) {
      if (previous) setExpenses((prev) => reinsert(prev, previous, index))
      fail("delete expense", err)
    }
  }, [fail])

  // ── Reimbursements ────────────────────────────────────────────────────────

  const addReimbursement = useCallback(async (reimbursement: Reimbursement) => {
    const tempId = `temp-${crypto.randomUUID()}`
    setReimbursements((prev) => [
      { ...reimbursement, id: tempId, status: "pending", approvedBy: undefined, paidDate: undefined },
      ...prev,
    ])
    try {
      const { data, error: err } = await supabase
        .from("reimbursements")
        .insert(reimbursementToInsertRow(reimbursement))
        .select()
        .single()
      if (err) throw err
      if (!data) throw new Error("Reimbursement was not created")
      const created = toReimbursement(data as Record<string, unknown>)
      setReimbursements((prev) => prev.map((r) => (r.id === tempId ? created : r)))
    } catch (err) {
      setReimbursements((prev) => prev.filter((r) => r.id !== tempId))
      fail("add reimbursement", err)
    }
  }, [fail])

  const updateReimbursementStatus = useCallback(
    async (id: string, status: ReimbursementStatus, approvedBy?: string) => {
      const previous = reimbursementsRef.current.find((r) => r.id === id)
      const paidDate = status === "paid" ? new Date() : undefined
      const update: { status: ReimbursementStatus; approved_by?: string; paid_date?: string } = { status }
      if (approvedBy) update.approved_by = approvedBy
      if (paidDate) update.paid_date = isoDate(paidDate)
      setReimbursements((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status, approvedBy: approvedBy || r.approvedBy, paidDate: paidDate ?? r.paidDate }
            : r
        )
      )
      try {
        const { error: err } = await supabase.from("reimbursements").update(update).eq("id", id)
        if (err) throw err
      } catch (err) {
        if (previous) setReimbursements((prev) => prev.map((r) => (r.id === id ? previous : r)))
        fail("update reimbursement", err)
      }
    },
    [fail]
  )

  // ── Income ────────────────────────────────────────────────────────────────

  const addIncome = useCallback(async (inc: Income) => {
    const tempId = `temp-${crypto.randomUUID()}`
    setIncome((prev) => [{ ...inc, id: tempId }, ...prev])
    try {
      const { data, error: err } = await supabase.from("income").insert(incomeToRow(inc)).select().single()
      if (err) throw err
      if (!data) throw new Error("Income was not created")
      const created = toIncome(data as Record<string, unknown>)
      setIncome((prev) => prev.map((i) => (i.id === tempId ? created : i)))
    } catch (err) {
      setIncome((prev) => prev.filter((i) => i.id !== tempId))
      fail("add income", err)
    }
  }, [fail])

  const deleteIncome = useCallback(async (id: string) => {
    const index = incomeRef.current.findIndex((i) => i.id === id)
    const previous = index >= 0 ? incomeRef.current[index] : undefined
    setIncome((prev) => prev.filter((i) => i.id !== id))
    try {
      const { error: err } = await supabase.from("income").delete().eq("id", id)
      if (err) throw err
    } catch (err) {
      if (previous) setIncome((prev) => reinsert(prev, previous, index))
      fail("delete income", err)
    }
  }, [fail])

  const value = useMemo<FinanceContextType>(
    () => ({
      budget,
      budgetSet,
      expenses,
      reimbursements,
      income,
      loading,
      error,
      refresh: load,
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
    }),
    [
      budget, budgetSet, expenses, reimbursements, income, loading, error, load,
      addExpense, updateExpenseStatus, deleteExpense, addReimbursement, updateReimbursementStatus,
      addIncome, deleteIncome, totalSpent, totalIncome, totalPending,
    ]
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }
  return context
}
