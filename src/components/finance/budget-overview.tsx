import { useMemo } from "react"
import { useFinance } from "@/context/finance-context"
import {
  EXPENSE_CATEGORIES,
  STATUS_CONFIG,
  getCategory,
  formatCurrency,
} from "./types"
import { cn } from "@/lib/utils"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts"
import { format } from "date-fns"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

const PIE_COLORS = ["#38bdf8", "#f472b6", "#fbbf24", "#a78bfa", "#34d399", "#94a3b8"]

// Explicit hex so Recharts SVG never sees an unresolved CSS variable
const BAR_ALLOCATED = "#334155"  // slate-700  — visible dark-mode reference bar
const BAR_SPENT     = "#38bdf8"  // sky-400     — matches the rest of the vibrant palette

// Custom tooltip matching the app-wide style
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
      {label && <p className="text-xs font-bold mb-2 text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill ?? entry.color }} />
              <span className="text-[10px] font-medium text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BudgetOverview() {
  const { budget, expenses, totalSpent, totalPending, totalIncome } = useFinance()
  const remaining    = budget.totalBudget - totalSpent
  const remainingPct = Math.round((remaining / budget.totalBudget) * 100)

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.filter((e) => e.status === "approved").forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount })
    return EXPENSE_CATEGORIES.map((cat, idx) => ({
      name: cat.name, value: map[cat.id] || 0, allocated: cat.allocated,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    })).filter((c) => c.value > 0)
  }, [expenses])

  const budgetUtilization = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const spent = expenses.filter((e) => e.status === "approved" && e.category === cat.id).reduce((s, e) => s + e.amount, 0)
      return {
        name: cat.name, spent, allocated: cat.allocated,
        remaining: Math.max(cat.allocated - spent, 0),
        pct: cat.allocated > 0 ? Math.round((spent / cat.allocated) * 100) : 0,
      }
    })
  }, [expenses])

  const recentExpenses = useMemo(() => [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6), [expenses])

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Budget"  value={formatCurrency(budget.totalBudget)} subtitle={budget.termLabel}                              icon={<Wallet className="h-5 w-5" />}         iconColor="text-primary"      />
        <StatCard title="Total Spent"   value={formatCurrency(totalSpent)}          subtitle={`${100 - remainingPct}% of budget`}            icon={<ArrowDownRight className="h-5 w-5" />}  iconColor="text-red-400"      trend={{ value: -12, label: "vs last month" }} />
        <StatCard title="Remaining"     value={formatCurrency(remaining)}           subtitle={`${remainingPct}% available`}                  icon={<DollarSign className="h-5 w-5" />}      iconColor="text-emerald-400"  />
        <StatCard title="Total Income"  value={formatCurrency(totalIncome)}         subtitle={`Net: ${formatCurrency(totalIncome - totalSpent)}`} icon={<ArrowUpRight className="h-5 w-5" />} iconColor="text-blue-400"     trend={{ value: 8, label: "vs last month" }} />
      </div>

      {/* Budget progress bar */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-tight">Budget Utilization</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-primary" /> Spent</span>
            <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Pending</span>
            <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-muted" /> Remaining</span>
          </div>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden flex">
          <div className="bg-primary rounded-l-full transition-all duration-700"   style={{ width: `${(totalSpent   / budget.totalBudget) * 100}%` }} />
          <div className="bg-amber-500/60 transition-all duration-700"             style={{ width: `${(totalPending / budget.totalBudget) * 100}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Spent: {formatCurrency(totalSpent)}</span>
          <span>Pending: {formatCurrency(totalPending)}</span>
          <span>Remaining: {formatCurrency(remaining)}</span>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Spending by category — Pie */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Spending by Category</h3>
          <div className="flex items-center gap-4">
            <div className="w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categorySpending} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                    {categorySpending.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categorySpending.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs font-medium">{cat.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(cat.value)} ({totalSpent > 0 ? Math.round((cat.value / totalSpent) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budget vs Actual — Bar */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Budget vs Actual by Category</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetUtilization} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v > 999 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#1e293b", opacity: 0.4 }} />
                <Bar dataKey="allocated" fill={BAR_ALLOCATED} radius={[4, 4, 0, 0]} name="Allocated" barSize={18} />
                <Bar dataKey="spent"     fill={BAR_SPENT}     radius={[4, 4, 0, 0]} name="Spent"     barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category budget breakdown */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Category Budgets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetUtilization.map((cat) => (
            <div key={cat.name} className="rounded-xl border border-border/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">{cat.name}</span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  cat.pct > 90 ? "bg-red-500/15 text-red-400" : cat.pct > 70 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                )}>
                  {cat.pct}% used
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", cat.pct > 90 ? "bg-red-500" : cat.pct > 70 ? "bg-amber-500" : "bg-primary")}
                  style={{ width: `${Math.min(cat.pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{formatCurrency(cat.spent)} spent</span>
                <span>{formatCurrency(cat.allocated)} budget</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent expenses */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border/30">
          <h3 className="text-sm font-bold uppercase tracking-tight">Recent Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((expense) => {
                const cat    = getCategory(expense.category)
                const status = STATUS_CONFIG[expense.status]
                return (
                  <tr key={expense.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{format(expense.date, "MMM d")}</td>
                    <td className="px-5 py-3 text-sm font-medium">{expense.description}</td>
                    <td className="px-5 py-3">
                      {cat && <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", cat.color)}>{cat.name}</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-right tabular-nums">{formatCurrency(expense.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", status.color)}>{status.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, iconColor, trend }: {
  title: string; value: string; subtitle: string; icon: React.ReactNode; iconColor: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={cn("p-2 rounded-lg bg-muted/50", iconColor)}>{icon}</div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{subtitle}</span>
        {trend && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-medium", trend.value > 0 ? "text-emerald-400" : "text-red-400")}>
            {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}