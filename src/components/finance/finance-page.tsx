import React, { useState } from "react"
import { type FinanceTab } from "./types"
import { BudgetOverview } from "./budget-overview"
import { ExpensesTab } from "./expenses-tab"
import { ReimbursementsTab } from "./reimbursements-tab"
import { IncomeTab } from "./income-tab"
import { AnalyticsTab } from "./analytics-tab"
import { cn } from "@/lib/utils"
import { useFinance } from "@/context/finance-context"
import { LayoutDashboard, Receipt, HandCoins, TrendingUp, BarChart3, Plus, Sparkles, ArrowUpRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const TAB_CONFIG: Record<FinanceTab, { label: string; icon: React.ReactNode; component: React.ComponentType }> = {
  overview:        { label: "Budget Overview",   icon: <LayoutDashboard className="h-4 w-4" />, component: BudgetOverview      },
  expenses:        { label: "Expenses",          icon: <Receipt className="h-4 w-4" />,        component: ExpensesTab          },
  reimbursements:  { label: "Reimbursements",    icon: <HandCoins className="h-4 w-4" />,      component: ReimbursementsTab    },
  income:          { label: "Income",            icon: <TrendingUp className="h-4 w-4" />,     component: IncomeTab            },
  analytics:       { label: "Analytics",         icon: <BarChart3 className="h-4 w-4" />,      component: AnalyticsTab         },
}

const EXPENSE_CATEGORIES = ["events", "marketing", "food", "technology", "operations"]
const INCOME_TYPES = ["dues", "sponsorship", "fundraising", "donation", "other"]

function fmt(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(n)
}

type TransactionType = "expense" | "reimbursement" | "income"

function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addExpense, addReimbursement, addIncome } = useFinance()
  const [type, setType] = useState<TransactionType>("expense")
  const [form, setForm] = useState({
    description: "",
    source: "",
    submittedBy: "",
    amount: "",
    category: "events",
    incomeType: "sponsorship",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setType("expense")
    setForm({
      description: "", source: "", submittedBy: "", amount: "",
      category: "events", incomeType: "sponsorship",
      date: new Date().toISOString().split("T")[0], notes: "",
    })
  }

  async function handleSubmit() {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return
    setSubmitting(true)
    const id = crypto.randomUUID()
    const date = new Date(form.date)

    if (type === "expense") {
      await addExpense({
        id, amount, date, notes: form.notes || undefined,
        description: form.description,
        category: form.category,
        status: "pending",
        submittedBy: form.submittedBy || "You",
      })
    } else if (type === "reimbursement") {
      await addReimbursement({
        id, amount, date, notes: form.notes || undefined,
        description: form.description,
        category: form.category,
        status: "pending",
        submittedBy: form.submittedBy || "You",
      })
    } else {
      await addIncome({
        id, amount, date, notes: form.notes || undefined,
        source: form.source,
        type: form.incomeType as any,
      })
    }

    setSubmitting(false)
    reset()
    onClose()
  }

  const field = "flex flex-col gap-1.5"
  const label = "text-xs font-medium text-muted-foreground uppercase tracking-wide"
  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
  const select = cn(input, "cursor-pointer")

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>

        {/* Type selector */}
        <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
          {(["expense", "reimbursement", "income"] as TransactionType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all",
                type === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-1">
          {/* Description / Source */}
          <div className={field}>
            <label className={label}>{type === "income" ? "Source" : "Description"}</label>
            {type === "income" ? (
              <input className={input} placeholder="e.g. TechCorp Sponsorship" value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
            ) : (
              <input className={input} placeholder="e.g. Venue deposit" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            )}
          </div>

          {/* Submitted By (expense / reimbursement only) */}
          {type !== "income" && (
            <div className={field}>
              <label className={label}>Submitted By</label>
              <input className={input} placeholder="Your name" value={form.submittedBy}
                onChange={(e) => setForm((f) => ({ ...f, submittedBy: e.target.value }))} />
            </div>
          )}

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={label}>Amount (CAD)</label>
              <input className={input} type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Date</label>
              <input className={input} type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          {/* Category / Type */}
          <div className={field}>
            <label className={label}>{type === "income" ? "Type" : "Category"}</label>
            {type === "income" ? (
              <select className={select} value={form.incomeType}
                onChange={(e) => setForm((f) => ({ ...f, incomeType: e.target.value }))}>
                {INCOME_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            ) : (
              <select className={select} value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            )}
          </div>

          {/* Notes */}
          <div className={field}>
            <label className={label}>Notes <span className="normal-case font-normal">(optional)</span></label>
            <textarea className={cn(input, "resize-none")} rows={2} placeholder="Any additional details…"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Add Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview")
  const [modalOpen, setModalOpen] = useState(false)   // ← new
  const ActiveComponent = TAB_CONFIG[activeTab].component
  const { budget, totalSpent, totalIncome } = useFinance()

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <NewTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />  {/* ← new */}

      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_right,rgba(34,197,94,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Financial Management
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                Track budgets, expenses, reimbursements, and club income
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-stretch">
            <div className="flex min-w-[168px] flex-col justify-between rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Net Cash Flow
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold">{fmt(totalIncome - totalSpent)}</p>
                  <p className="text-[11px] text-muted-foreground">income vs spending</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
            </div>

            <Button
              className="h-auto min-h-[96px] min-w-[184px] self-stretch gap-2 rounded-2xl px-5 text-sm font-semibold shadow-lg shadow-primary/15 sm:min-h-0"
              onClick={() => setModalOpen(true)}  // ← fixed
            >
              <Plus className="h-4 w-4" />
              New Transaction
            </Button>
          </div>
        </div>
      </section>

      {/* ── Tab Toolbar ── */}
      <section className="rounded-2xl border border-border/50 bg-card/80 p-3.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium mr-2 text-muted-foreground">Category:</span>
          <div className="flex gap-1 bg-background/50 p-1 rounded-xl border border-border/60 flex-wrap">
            {(Object.keys(TAB_CONFIG) as FinanceTab[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                  activeTab === tabKey
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {TAB_CONFIG[tabKey].icon}
                {TAB_CONFIG[tabKey].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tab Content ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        <ActiveComponent />
      </div>
    </div>
  )
}