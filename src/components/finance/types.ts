export type ExpenseStatus = "pending" | "approved" | "denied"
export type ReimbursementStatus = "pending" | "approved" | "denied" | "paid"
export type IncomeType = "dues" | "sponsorship" | "fundraising" | "donation" | "other"
export type FinanceTab = "overview" | "expenses" | "reimbursements" | "income" | "analytics"

export interface ExpenseCategory {
  id: string
  name: string
  color: string
  dotColor: string
  allocated: number
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "events", name: "Events", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", dotColor: "bg-blue-500", allocated: 6000 },
  { id: "marketing", name: "Marketing", color: "bg-pink-500/15 text-pink-400 border-pink-500/30", dotColor: "bg-pink-500", allocated: 3500 },
  { id: "operations", name: "Operations", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dotColor: "bg-amber-500", allocated: 3000 },
  { id: "technology", name: "Technology", color: "bg-violet-500/15 text-violet-400 border-violet-500/30", dotColor: "bg-violet-500", allocated: 2000 },
  { id: "food", name: "Food & Catering", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500", allocated: 2500 },
  { id: "other", name: "Other", color: "bg-slate-500/15 text-slate-400 border-slate-500/30", dotColor: "bg-slate-500", allocated: 1000 },
]

export const STATUS_CONFIG: Record<ExpenseStatus, { label: string; color: string; dotColor: string }> = {
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dotColor: "bg-amber-500" },
  approved: { label: "Approved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
  denied: { label: "Denied", color: "bg-red-500/15 text-red-400 border-red-500/30", dotColor: "bg-red-500" },
}

export const REIMBURSEMENT_STATUS_CONFIG: Record<ReimbursementStatus, { label: string; color: string; dotColor: string }> = {
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dotColor: "bg-amber-500" },
  approved: { label: "Approved", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", dotColor: "bg-blue-500" },
  denied: { label: "Denied", color: "bg-red-500/15 text-red-400 border-red-500/30", dotColor: "bg-red-500" },
  paid: { label: "Paid", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
}

export const INCOME_TYPE_CONFIG: Record<IncomeType, { label: string; color: string; dotColor: string }> = {
  dues: { label: "Member Dues", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", dotColor: "bg-blue-500" },
  sponsorship: { label: "Sponsorship", color: "bg-violet-500/15 text-violet-400 border-violet-500/30", dotColor: "bg-violet-500" },
  fundraising: { label: "Fundraising", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
  donation: { label: "Donation", color: "bg-pink-500/15 text-pink-400 border-pink-500/30", dotColor: "bg-pink-500" },
  other: { label: "Other", color: "bg-slate-500/15 text-slate-400 border-slate-500/30", dotColor: "bg-slate-500" },
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: Date
  status: ExpenseStatus
  submittedBy: string
  approvedBy?: string
  receiptUrl?: string
  notes?: string
}

export interface Reimbursement {
  id: string
  submittedBy: string
  amount: number
  description: string
  category: string
  date: Date
  status: ReimbursementStatus
  receiptUrl?: string
  approvedBy?: string
  paidDate?: Date
  notes?: string
}

export interface Income {
  id: string
  source: string
  amount: number
  type: IncomeType
  date: Date
  notes?: string
  recurring?: boolean
}

export interface Budget {
  totalBudget: number
  termLabel: string
}

export function getCategory(id: string): ExpenseCategory | undefined {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
