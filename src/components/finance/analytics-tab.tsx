import { useMemo } from "react"
import { useFinance } from "@/context/finance-context"
import {
  EXPENSE_CATEGORIES,
  INCOME_TYPE_CONFIG,
  type IncomeType,
  formatCurrency,
} from "./types"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts"
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import {
  TrendingUp,
  TrendingDown,
  Target,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

// ─── Shared chart constants ───────────────────────────────────────────────────
const INCOME_COLOR   = "#34d399"  // emerald — always visible
const EXPENSE_COLOR  = "#fb7185"  // rose    — always visible
const BUDGET_COLOR   = "#fbbf24"  // amber   — always visible for the dashed budget line
const CURSOR_PROPS   = { fill: "#1e293b", opacity: 0.4 }
const AXIS_TICK      = { fontSize: 11, fill: "#94a3b8" }
const GRID_PROPS     = { strokeDasharray: "3 3", vertical: false, stroke: "#334155", opacity: 0.5 }

// ─── Custom tooltip matching Marketing / Reports style ────────────────────────
function ChartTooltip({ active, payload, label, currency = false }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
      {label && <p className="text-xs font-bold mb-2 text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.stroke }} />
              <span className="text-[10px] font-medium text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">
              {currency ? formatCurrency(entry.value) : entry.value?.toLocaleString?.() ?? entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsTab() {
  const { budget, expenses, income, totalSpent, totalIncome } = useFinance()
  const remaining  = budget.totalBudget - totalSpent
  const netIncome  = totalIncome - totalSpent
  const burnRate   = totalSpent > 0 ? Math.round(remaining / (totalSpent / 3)) : 0

  const monthlyData = useMemo(() => {
    const now = new Date()
    const months: { name: string; expenses: number; income: number; net: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date  = subMonths(now, i)
      const start = startOfMonth(date)
      const end   = endOfMonth(date)
      const name  = format(date, "MMM")
      const monthExpenses = expenses
        .filter((e) => e.status === "approved" && isWithinInterval(e.date, { start, end }))
        .reduce((s, e) => s + e.amount, 0)
      const monthIncome = income
        .filter((inc) => isWithinInterval(inc.date, { start, end }))
        .reduce((s, inc) => s + inc.amount, 0)
      months.push({ name, expenses: monthExpenses, income: monthIncome, net: monthIncome - monthExpenses })
    }
    return months
  }, [expenses, income])

  const cumulativeData = useMemo(() => {
    let cumExpense = 0
    let cumIncome  = 0
    return monthlyData.map((m) => {
      cumExpense += m.expenses
      cumIncome  += m.income
      return { name: m.name, cumExpenses: cumExpense, cumIncome, budget: budget.totalBudget }
    })
  }, [monthlyData, budget.totalBudget])

  const categoryTrends = useMemo(() => {
    const now = new Date()
    return EXPENSE_CATEGORIES.slice(0, 4).map((cat) => {
      const thisMonth = expenses
        .filter((e) => {
          const start = startOfMonth(now)
          const end   = endOfMonth(now)
          return e.status === "approved" && e.category === cat.id && isWithinInterval(e.date, { start, end })
        })
        .reduce((s, e) => s + e.amount, 0)
      const lastMonth = expenses
        .filter((e) => {
          const prev  = subMonths(now, 1)
          const start = startOfMonth(prev)
          const end   = endOfMonth(prev)
          return e.status === "approved" && e.category === cat.id && isWithinInterval(e.date, { start, end })
        })
        .reduce((s, e) => s + e.amount, 0)
      const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0
      return {
        name: cat.name, thisMonth, lastMonth, change,
        allocated: cat.allocated,
        pct: cat.allocated > 0 ? Math.round((thisMonth / cat.allocated) * 100) : 0,
        dotColor: cat.dotColor, color: cat.color,
      }
    })
  }, [expenses])

  const incomeSources = useMemo(() => {
    const map: Record<string, number> = {}
    income.forEach((i) => { map[i.type] = (map[i.type] || 0) + i.amount })
    return (Object.entries(INCOME_TYPE_CONFIG) as [IncomeType, typeof INCOME_TYPE_CONFIG[IncomeType]][])
      .map(([key, config]) => ({
        type: key, label: config.label,
        amount: map[key] || 0,
        pct: totalIncome > 0 ? Math.round(((map[key] || 0) / totalIncome) * 100) : 0,
        color: config.color, dotColor: config.dotColor,
      }))
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }, [income, totalIncome])

  const insights = useMemo(() => {
    const items: { icon: React.ReactNode; text: string; type: "success" | "warning" | "info" }[] = []
    if (remaining / budget.totalBudget > 0.5) {
      items.push({ icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, text: `Budget is healthy — ${Math.round((remaining / budget.totalBudget) * 100)}% remaining`, type: "success" })
    } else if (remaining / budget.totalBudget < 0.2) {
      items.push({ icon: <AlertTriangle className="h-4 w-4 text-red-400" />, text: `Low budget alert — only ${Math.round((remaining / budget.totalBudget) * 100)}% remaining`, type: "warning" })
    }
    if (burnRate > 4) {
      items.push({ icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, text: `At current spending rate, budget lasts ~${burnRate} more months`, type: "success" })
    } else if (burnRate > 0) {
      items.push({ icon: <AlertTriangle className="h-4 w-4 text-amber-400" />, text: `At current burn rate, budget runs out in ~${burnRate} months`, type: "warning" })
    }
    if (netIncome > 0) {
      items.push({ icon: <ArrowUpRight className="h-4 w-4 text-emerald-400" />, text: `Net positive: ${formatCurrency(netIncome)} more income than expenses`, type: "success" })
    } else {
      items.push({ icon: <ArrowDownRight className="h-4 w-4 text-red-400" />, text: `Net negative: spending exceeds income by ${formatCurrency(Math.abs(netIncome))}`, type: "warning" })
    }
    const overBudgetCats = categoryTrends.filter((c) => c.pct > 80)
    if (overBudgetCats.length > 0) {
      items.push({ icon: <AlertTriangle className="h-4 w-4 text-amber-400" />, text: `${overBudgetCats.map((c) => c.name).join(", ")} ${overBudgetCats.length > 1 ? "are" : "is"} over 80% of allocated budget`, type: "warning" })
    }
    return items
  }, [remaining, budget.totalBudget, burnRate, netIncome, categoryTrends])

  return (
    <div className="space-y-6">

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Net Cash Flow"     value={formatCurrency(netIncome)} positive={netIncome > 0} icon={netIncome > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} />
        <MetricCard title="Burn Rate"         value={`${burnRate} months`}      positive={burnRate > 3}  icon={<Target className="h-5 w-5" />} subtitle="at current pace" />
        <MetricCard title="Avg Monthly Spend" value={formatCurrency(totalSpent / Math.max(monthlyData.filter((m) => m.expenses > 0).length, 1))} icon={<ArrowDownRight className="h-5 w-5" />} />
        <MetricCard title="Savings Rate"      value={`${totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0}%`} positive={(totalIncome - totalSpent) > 0} icon={<PiggyBank className="h-5 w-5" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Income vs Expenses ── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-6 uppercase tracking-tight">Income vs Expenses (Monthly)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false}
                tickFormatter={(v) => v > 999 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`} />
              <Tooltip content={<ChartTooltip currency />} cursor={CURSOR_PROPS} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              <Bar dataKey="income"   fill={INCOME_COLOR}  radius={[4, 4, 0, 0]} name="Income"   barSize={22} />
              <Bar dataKey="expenses" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} name="Expenses" barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Cumulative Spending vs Budget ── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-6 uppercase tracking-tight">Cumulative Spending vs Budget</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false}
                tickFormatter={(v) => v > 999 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`} />
              <Tooltip content={<ChartTooltip currency />} cursor={CURSOR_PROPS} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              <Area type="monotone" dataKey="cumIncome"   stroke={INCOME_COLOR}  fill={INCOME_COLOR}  fillOpacity={0.12} strokeWidth={2} name="Cumulative Income"   />
              <Area type="monotone" dataKey="cumExpenses" stroke={EXPENSE_COLOR} fill={EXPENSE_COLOR} fillOpacity={0.12} strokeWidth={2} name="Cumulative Expenses" />
              <Line type="monotone" dataKey="budget"      stroke={BUDGET_COLOR}  strokeDasharray="8 4" strokeWidth={2} dot={false} name="Budget Limit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category trends + Income sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Category month-over-month */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Category Spending (This Month vs Last)</h3>
          <div className="space-y-4">
            {categoryTrends.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", cat.dotColor)} />
                    <span className="text-xs font-semibold">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(cat.thisMonth)}</span>
                    {cat.change !== 0 && (
                      <span className={cn("flex items-center gap-0.5 text-[11px] font-medium", cat.change > 0 ? "text-red-400" : "text-emerald-400")}>
                        {cat.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(cat.change)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", cat.pct > 90 ? "bg-red-500" : cat.pct > 70 ? "bg-amber-500" : "bg-primary")}
                    style={{ width: `${Math.min(cat.pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{cat.pct}% of {formatCurrency(cat.allocated)} budget</span>
                  <span>Last month: {formatCurrency(cat.lastMonth)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Income sources */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Income Sources</h3>
          <div className="space-y-3">
            {incomeSources.map((src) => (
              <div key={src.type} className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full shrink-0", src.dotColor)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{src.label}</span>
                    <span className="text-xs font-bold tabular-nums">{formatCurrency(src.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", src.dotColor)} style={{ width: `${src.pct}%` }} />
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">{src.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Financial Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div key={idx} className={cn(
              "flex items-start gap-3 p-3 rounded-xl border",
              insight.type === "success" && "bg-emerald-500/5 border-emerald-500/20",
              insight.type === "warning" && "bg-amber-500/5 border-amber-500/20",
              insight.type === "info"    && "bg-blue-500/5 border-blue-500/20"
            )}>
              <div className="mt-0.5 shrink-0">{insight.icon}</div>
              <p className="text-xs leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, positive, icon, subtitle }: {
  title: string; value: string; positive?: boolean; icon: React.ReactNode; subtitle?: string
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={cn("p-2 rounded-lg bg-muted/50", positive === true && "text-emerald-400", positive === false && "text-red-400", positive === undefined && "text-muted-foreground")}>
          {icon}
        </div>
      </div>
      <div className={cn("text-2xl font-bold", positive === true && "text-emerald-400", positive === false && "text-red-400")}>
        {value}
      </div>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  )
}