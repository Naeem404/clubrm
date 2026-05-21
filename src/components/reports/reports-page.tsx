import { useState, useMemo } from "react"
import { useMembers } from "@/context/members-context"
import { useEvents } from "@/context/events-context"
import { useTasks } from "@/context/tasks-context"
import { useFinance } from "@/context/finance-context"
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Line,
  Legend,
} from "recharts"
import {
  Users,
  Calendar,
  CheckSquare,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  FileBarChart,
  Activity,
  Target,
  Zap,
  Download,
  AlertTriangle,
  Clock,
  Award,
  Shield,
  BarChart3,
  PieChart as PieChartIcon,
  UserCheck,
  UserX,
  CalendarCheck,
  Wallet,
  Receipt,
  CircleDollarSign,
  Gauge,
  Flame,
  Star,
} from "lucide-react"

// ─── Chart Palette ───────────────────────────────────────────────────────────
const PIE_COLORS = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb923c", "#f87171", "#06b6d4", "#e879f9"]

const STATUS_COLORS: Record<string, string> = {
  backlog: "#64748b", todo: "#3b82f6", in_progress: "#f59e0b", in_review: "#8b5cf6", done: "#10b981",
}
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
}

// ─── Shared axis / grid props ─────────────────────────────────────────────────
const AXIS_TICK  = { fontSize: 11, fill: "#94a3b8" }
const AXIS_TICK_SM = { fontSize: 10, fill: "#94a3b8" }
const GRID_PROPS = {
  strokeDasharray: "3 3",
  vertical: false,
  stroke: "hsl(var(--border))",
  opacity: 0.4,
} as const
const XAXIS_PROPS = { tick: AXIS_TICK, tickLine: false, axisLine: false } as const
const YAXIS_PROPS = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  tickFormatter: (v: number) => v > 999 ? `${(v / 1000).toFixed(1)}k` : String(v),
} as const
const CURSOR_PROPS = { fill: "hsl(var(--muted))", opacity: 0.2 }

// ─── Shared custom tooltip — matches Marketing page exactly ──────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
      {label && <p className="text-xs font-bold mb-2 text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] font-medium text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">
              {typeof entry.value === "number" && entry.name?.includes("$")
                ? fmt(entry.value)
                : entry.value?.toLocaleString?.() ?? entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
      {label && <p className="text-xs font-bold mb-2 text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.fill }} />
              <span className="text-[10px] font-medium text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(n)
}
function pct(a: number, b: number) {
  return b > 0 ? ((a / b) * 100).toFixed(1) : "0"
}
function safeDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? null : d
}

const pieLabel = (props: any) => {
  const { name, percent, x, y, textAnchor } = props
  return (
    <text x={x} y={y} textAnchor={textAnchor} fill="#94a3b8" fontSize={10}>
      {`${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ReportsPage() {
  const { members, stats: memberStats } = useMembers()
  const { events } = useEvents()
  const { tasks } = useTasks()
  const { budget, totalSpent: financeTotalSpent, totalIncome: financeTotalIncome, totalPending: financeTotalPending, expenses, reimbursements, income } = useFinance()
  const [period, setPeriod] = useState("this-term")
  const [selectedDept, setSelectedDept] = useState<string>("all")

  const departments = useMemo(() => {
    const depts = new Set<string>()
    members.forEach(m => depts.add(m.department))
    tasks.forEach(t => t.section && depts.add(t.section))
    return Array.from(depts).sort()
  }, [members, tasks])

  const fMembers      = useMemo(() => selectedDept === "all" ? members  : members.filter(m => m.department === selectedDept), [members, selectedDept])
  const fTasks        = useMemo(() => selectedDept === "all" ? tasks    : tasks.filter(t => t.section === selectedDept), [tasks, selectedDept])
  const fEvents       = useMemo(() => selectedDept === "all" ? events   : events.filter(e => e.tags.some(t => t.toLowerCase() === selectedDept.toLowerCase())), [events, selectedDept])
  const fExpenses     = useMemo(() => selectedDept === "all" ? expenses : expenses.filter(e => e.category.toLowerCase() === selectedDept.toLowerCase()), [expenses, selectedDept])
  const fIncome       = useMemo(() => selectedDept === "all" ? income   : income.filter(i => i.type.toLowerCase() === selectedDept.toLowerCase()), [income, selectedDept])
  const fReimbursements = useMemo(() => selectedDept === "all" ? reimbursements : reimbursements.filter(r => r.category.toLowerCase() === selectedDept.toLowerCase()), [reimbursements, selectedDept])

  const fMemberStats = useMemo(() => ({
    total:    fMembers.length,
    active:   fMembers.filter(m => m.status === "active").length,
    inactive: fMembers.filter(m => m.status === "inactive").length,
    alumni:   fMembers.filter(m => m.status === "alumni").length,
  }), [fMembers])

  const fTotalSpent   = fExpenses.reduce((s, e) => s + e.amount, 0)
  const fTotalIncome  = fIncome.reduce((s, i) => s + i.amount, 0)
  const fTotalPending = fExpenses.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0)
                      + fReimbursements.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0)

  // Tasks
  const completedTasks    = fTasks.filter(t => t.status === "done").length
  const completionRate    = fTasks.length > 0 ? (completedTasks / fTasks.length) * 100 : 0
  const now               = new Date()
  const overdueTasks      = fTasks.filter(t => { const due = safeDate(t.dueDate); return due && due < now && t.status !== "done" })
  const inProgressTasks   = fTasks.filter(t => t.status === "in_progress").length
  const totalSubtasks     = fTasks.reduce((s, t) => s + (t.subtasks ?? []).length, 0)
  const doneSubtasks      = fTasks.reduce((s, t) => s + (t.subtasks ?? []).filter(st => st.done).length, 0)
  const subtaskRate        = totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0
  const avgSubtasksPerTask = fTasks.length > 0 ? (totalSubtasks / fTasks.length).toFixed(1) : "0"

  const tasksByStatus = useMemo(() =>
    (["backlog", "todo", "in_progress", "in_review", "done"] as const).map(s => ({
      name: s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: fTasks.filter(t => t.status === s).length,
      fill: STATUS_COLORS[s],
    })), [fTasks])

  const tasksByPriority = useMemo(() =>
    (["urgent", "high", "medium", "low"] as const).map(p => ({
      name: p.charAt(0).toUpperCase() + p.slice(1),
      value: fTasks.filter(t => t.priority === p).length,
      fill: PRIORITY_COLORS[p],
    })), [fTasks])

  const tasksBySection = useMemo(() => {
    const map: Record<string, number> = {}
    fTasks.forEach(t => { const s = t.section || "Unsorted"; map[s] = (map[s] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [fTasks])

  const tasksByTag = useMemo(() => {
    const map: Record<string, number> = {}
    fTasks.forEach(t => (t.tags ?? []).forEach(tag => { map[tag] = (map[tag] || 0) + 1 }))
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value)
  }, [fTasks])

  const assigneeStats = useMemo(() => {
    const map: Record<string, { assigned: number; completed: number }> = {}
    fTasks.forEach(t => {
      ;(t.assignees ?? []).forEach(a => {
        if (!map[a]) map[a] = { assigned: 0, completed: 0 }
        map[a].assigned++
        if (t.status === "done") map[a].completed++
      })
    })
    return Object.entries(map)
      .map(([id, stats]) => {
        const member = fMembers.find(m => m.id === id)
        return { id, name: member?.name || id, ...stats, rate: stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0 }
      })
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 8)
  }, [fTasks, fMembers])

  // Events
  const upcomingEvents     = fEvents.filter(e => { const d = safeDate(e.startDate); return d && d > now }).length
  const pastEvents         = fEvents.filter(e => { const d = safeDate(e.endDate);   return d && d < now }).length
  const eventsWithCapacity = fEvents.filter(e => e.capacity && e.capacity > 0)
  const totalCapacity      = eventsWithCapacity.reduce((s, e) => s + (e.capacity || 0), 0)
  const totalRegistered    = eventsWithCapacity.reduce((s, e) => s + (e.registered || 0), 0)
  const avgFillRate        = totalCapacity > 0 ? (totalRegistered / totalCapacity) * 100 : 0

  const eventsByTag = useMemo(() => {
    const map: Record<string, number> = {}
    fEvents.forEach(e => (e.tags ?? []).forEach(t => { map[t] = (map[t] || 0) + 1 }))
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [fEvents])

  const eventFillData = useMemo(() =>
    eventsWithCapacity.map(e => ({
      name: e.title.length > 18 ? e.title.slice(0, 18) + "..." : e.title,
      registered: e.registered || 0,
      capacity:   e.capacity   || 0,
      fillPct: ((e.registered || 0) / (e.capacity || 1)) * 100,
    })), [eventsWithCapacity])

  const eventsByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    fEvents.forEach(e => { const s = e.status || "confirmed"; map[s] = (map[s] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
  }, [fEvents])

  // Finance
  const budgetUtil         = budget.totalBudget > 0 ? (fTotalSpent / budget.totalBudget) * 100 : 0
  const budgetRemaining    = budget.totalBudget - fTotalSpent
  const netCashFlow        = fTotalIncome - fTotalSpent
  const approvedExpenses   = fExpenses.filter(e => e.status === "approved").length
  const pendingExpenses    = fExpenses.filter(e => e.status === "pending").length
  const deniedExpenses     = fExpenses.filter(e => e.status === "denied").length
  const expenseApprovalRate = fExpenses.length > 0 ? (approvedExpenses / fExpenses.length) * 100 : 0
  const pendingReimb       = fReimbursements.filter(r => r.status === "pending").length

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    fExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value)
  }, [fExpenses])

  const incomeByType = useMemo(() => {
    const map: Record<string, number> = {}
    fIncome.forEach(i => { map[i.type] = (map[i.type] || 0) + i.amount })
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value)
  }, [fIncome])

  const topExpenses = useMemo(() => [...fExpenses].sort((a, b) => b.amount - a.amount).slice(0, 8), [fExpenses])
  const topIncomes  = useMemo(() => [...fIncome].sort((a, b) => b.amount - a.amount).slice(0, 6),   [fIncome])

  // Monthly Trend
  const monthlyTrend = useMemo(() => {
    const months: { month: string; members: number; events: number; tasks: number; income: number; spending: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date  = subMonths(now, i)
      const start = startOfMonth(date)
      const end   = endOfMonth(date)
      const label = format(date, "MMM")
      const monthIncome   = income.filter(inc => { const d = safeDate(inc.date);    return d && isWithinInterval(d, { start, end }) }).reduce((s, inc) => s + inc.amount, 0)
      const monthSpending = expenses.filter(exp => { const d = safeDate(exp.date);  return d && isWithinInterval(d, { start, end }) }).reduce((s, exp) => s + exp.amount, 0)
      const monthEvents   = events.filter(ev => { const d = safeDate(ev.startDate); return d && isWithinInterval(d, { start, end }) }).length
      const monthTasks    = tasks.filter(t => { const d = safeDate(t.createdAt);    return d && isWithinInterval(d, { start, end }) }).length
      const monthMembers  = members.filter(m => { const d = safeDate(m.joinDate);   return d && d <= end && m.status === "active" }).length
      months.push({ month: label, members: monthMembers, events: monthEvents, tasks: monthTasks, income: Math.round(monthIncome), spending: Math.round(monthSpending) })
    }
    return months
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fExpenses, fIncome, fEvents, fTasks, fMembers])

  // Members derived
  const membersByRole = useMemo(() => {
    const map: Record<string, number> = {}
    fMembers.forEach(m => { map[m.role] = (map[m.role] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [fMembers])

  const membersByDept = useMemo(() => {
    const map: Record<string, number> = {}
    fMembers.forEach(m => { map[m.department] = (map[m.department] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + "..." : name, value })).sort((a, b) => b.value - a.value)
  }, [fMembers])

  const membersByYear = useMemo(() => {
    const map: Record<string, number> = {}
    fMembers.forEach(m => { map[m.year] = (map[m.year] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [fMembers])

  const engagementScores = useMemo(() =>
    fMembers.filter(m => m.status === "active")
      .map(m => ({ ...m, score: Math.min(100, Math.round((m.tasksCompleted * 2 + m.eventsAttended * 3) / 1.5)) }))
      .sort((a, b) => b.score - a.score), [fMembers])

  const avgEngagement  = engagementScores.length > 0 ? Math.round(engagementScores.reduce((s, m) => s + m.score, 0) / engagementScores.length) : 0
  const atRiskMembers  = engagementScores.filter(m => m.score < 20)
  const retentionRate  = fMemberStats.total > 0 ? ((fMemberStats.active / fMemberStats.total) * 100).toFixed(0) : "0"

  // Org Health
  const orgHealth = useMemo(() => {
    const retention    = fMemberStats.total > 0 ? (fMemberStats.active / fMemberStats.total) * 100 : 0
    const taskHealth   = completionRate
    const budgetHealth = Math.max(0, 100 - Math.abs(budgetUtil - 50))
    const eventHealth  = avgFillRate
    return Math.min(100, Math.max(0, Math.round(retention * 0.3 + taskHealth * 0.25 + budgetHealth * 0.2 + eventHealth * 0.25)))
  }, [fMemberStats, completionRate, budgetUtil, avgFillRate])

  const healthColor  = orgHealth >= 75 ? "text-emerald-400" : orgHealth >= 50 ? "text-amber-400" : "text-red-400"
  const healthBg     = orgHealth >= 75 ? "bg-emerald-500"   : orgHealth >= 50 ? "bg-amber-500"   : "bg-red-500"
  const healthLabel  = orgHealth >= 75 ? "Excellent"        : orgHealth >= 50 ? "Good"           : "Needs Attention"
  const healthRadial = [{ name: "Health", value: orgHealth, fill: orgHealth >= 75 ? "#10b981" : orgHealth >= 50 ? "#f59e0b" : "#ef4444" }]

  // Smart Insights
  const insights = useMemo(() => {
    const list: { type: "success" | "warning" | "danger" | "info"; title: string; detail: string }[] = []
    if (Number(retentionRate) >= 80) list.push({ type: "success", title: "Strong member retention", detail: `${retentionRate}% of members are active — above the 80% benchmark` })
    else list.push({ type: "warning", title: "Member retention below target", detail: `${retentionRate}% active — ${fMemberStats.inactive} inactive member(s) need re-engagement` })
    if (overdueTasks.length > 0) list.push({ type: "danger", title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`, detail: overdueTasks.map(t => t.title).slice(0, 3).join(", ") })
    if (completionRate >= 60) list.push({ type: "success", title: `Task completion at ${completionRate.toFixed(0)}%`, detail: `${completedTasks} of ${fTasks.length} tasks done — solid progress` })
    else list.push({ type: "warning", title: `Task completion at ${completionRate.toFixed(0)}%`, detail: `Only ${completedTasks} of ${fTasks.length} tasks done — may need resource reallocation` })
    if (budgetUtil > 85) list.push({ type: "danger", title: `Budget ${budgetUtil.toFixed(0)}% utilized`, detail: `Only ${fmt(budgetRemaining)} remaining — review upcoming expenses` })
    else if (budgetUtil > 60) list.push({ type: "info", title: `Budget ${budgetUtil.toFixed(0)}% utilized`, detail: `${fmt(budgetRemaining)} remaining — on track for the term` })
    else list.push({ type: "success", title: `Budget ${budgetUtil.toFixed(0)}% utilized`, detail: `${fmt(budgetRemaining)} remaining — healthy budget position` })
    if (pendingExpenses > 3) list.push({ type: "warning", title: `${pendingExpenses} pending expense approvals`, detail: `${fmt(fTotalPending)} waiting for VP Finance review` })
    if (avgFillRate > 70) list.push({ type: "success", title: `Events averaging ${avgFillRate.toFixed(0)}% fill rate`, detail: `${totalRegistered} total registrations across ${eventsWithCapacity.length} events` })
    if (atRiskMembers.length > 0) list.push({ type: "warning", title: `${atRiskMembers.length} at-risk member${atRiskMembers.length > 1 ? "s" : ""}`, detail: atRiskMembers.map(m => m.name).join(", ") + " — low engagement scores" })
    if (netCashFlow > 0) list.push({ type: "success", title: `Positive cash flow: ${fmt(netCashFlow)}`, detail: `Income (${fmt(fTotalIncome)}) exceeds spending (${fmt(fTotalSpent)})` })
    else list.push({ type: "danger", title: `Negative cash flow: ${fmt(netCashFlow)}`, detail: `Spending exceeds income — review budget allocation` })
    return list
  }, [retentionRate, fMemberStats, overdueTasks, completionRate, completedTasks, fTasks, budgetUtil, budgetRemaining, pendingExpenses, fTotalPending, avgFillRate, totalRegistered, eventsWithCapacity, atRiskMembers, netCashFlow, fTotalIncome, fTotalSpent])

  const insightColors = { success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", warning: "bg-amber-500/10 border-amber-500/20 text-amber-400", danger: "bg-red-500/10 border-red-500/20 text-red-400", info: "bg-blue-500/10 border-blue-500/20 text-blue-400" }
  const insightIcons  = { success: <ArrowUpRight className="h-4 w-4" />, warning: <AlertTriangle className="h-4 w-4" />, danger: <Flame className="h-4 w-4" />, info: <Activity className="h-4 w-4" /> }

  function handleExport(exportFormat: string) {
    if (exportFormat === "csv") {
      const lines: string[] = []
      lines.push("Module,Metric,Value")
      lines.push(`Members,Total,${memberStats.total}`)
      lines.push(`Members,Active,${fMemberStats.active}`)
      lines.push(`Members,Inactive,${fMemberStats.inactive}`)
      lines.push(`Members,Alumni,${fMemberStats.alumni}`)
      lines.push(`Members,Retention Rate,${retentionRate}%`)
      lines.push(`Tasks,Total,${fTasks.length}`)
      lines.push(`Tasks,Completed,${completedTasks}`)
      lines.push(`Tasks,Completion Rate,${completionRate.toFixed(1)}%`)
      lines.push(`Tasks,Overdue,${overdueTasks.length}`)
      lines.push(`Tasks,In Progress,${inProgressTasks}`)
      lines.push(`Finance,Budget Total,${budget.totalBudget}`)
      lines.push(`Finance,Total Spent,${fTotalSpent}`)
      lines.push(`Finance,Remaining,${budgetRemaining}`)
      lines.push(`Finance,Total Income,${fTotalIncome}`)
      lines.push(`Finance,Net Cash Flow,${netCashFlow}`)
      lines.push(`Finance,Pending Approvals,${pendingExpenses}`)
      lines.push(`Events,Total,${fEvents.length}`)
      lines.push(`Events,Upcoming,${upcomingEvents}`)
      lines.push(`Events,Past,${pastEvents}`)
      lines.push(`Events,Avg Fill Rate,${avgFillRate.toFixed(1)}%`)
      lines.push(`Org Health,Score,${orgHealth}/100`)
      lines.push("")
      lines.push("--- Expenses ---")
      lines.push("Description,Amount,Category,Status,Submitted By,Date")
      fExpenses.forEach(e => { const d = safeDate(e.date); lines.push(`"${e.description}",${e.amount},${e.category},${e.status},"${e.submittedBy}",${d ? format(d, "yyyy-MM-dd") : ""}`) })
      lines.push("")
      lines.push("--- Income ---")
      lines.push("Source,Amount,Type,Date")
      fIncome.forEach(i => { const d = safeDate(i.date); lines.push(`"${i.source}",${i.amount},${i.type},${d ? format(d, "yyyy-MM-dd") : ""}`) })
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `clubrm-report-${format(new Date(), "yyyy-MM-dd")}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      window.print()
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-module intelligence across members, operations, finance, and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this-term">This Term</SelectItem>
              <SelectItem value="last-term">Last Term</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => handleExport("csv")}><Download className="h-3.5 w-3.5" /> CSV</Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => handleExport("pdf")}><Download className="h-3.5 w-3.5" /> PDF</Button>
        </div>
      </div>

      {/* Org Health + KPI Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center justify-center">
          <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider mb-1">Org Health Score</p>
          <div className="relative">
            <ResponsiveContainer width={140} height={140}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={healthRadial}>
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--muted))" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
              <span className={cn("text-3xl font-bold", healthColor)}>{orgHealth}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={cn("h-2 w-2 rounded-full", healthBg)} />
            <span className={cn("text-xs font-medium", healthColor)}>{healthLabel}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Based on retention, tasks, budget & events</p>
        </div>

        <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "Active Members",    value: fMemberStats.active,             sub: `of ${fMemberStats.total} total`,         icon: <UserCheck className="h-4 w-4" />,                                         color: "text-emerald-400", trend: `${retentionRate}% retention`      },
            { label: "Task Completion",   value: `${completionRate.toFixed(0)}%`, sub: `${completedTasks}/${fTasks.length} done`, icon: <Target className="h-4 w-4" />,                                           color: "text-violet-400",  trend: `${overdueTasks.length} overdue`   },
            { label: "Budget Used",       value: `${budgetUtil.toFixed(0)}%`,     sub: `${fmt(budgetRemaining)} left`,            icon: <Wallet className="h-4 w-4" />,                                           color: "text-cyan-400",    trend: fmt(budget.totalBudget) + " total" },
            { label: "Net Cash Flow",     value: fmt(netCashFlow),                sub: `${fmt(fTotalIncome)} in / ${fmt(fTotalSpent)} out`, icon: netCashFlow >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />, color: netCashFlow >= 0 ? "text-emerald-400" : "text-red-400", trend: netCashFlow >= 0 ? "Positive" : "Negative" },
            { label: "Events",            value: fEvents.length,                  sub: `${upcomingEvents} upcoming`,              icon: <Calendar className="h-4 w-4" />,                                         color: "text-pink-400",    trend: `${pastEvents} completed`          },
            { label: "Avg Fill Rate",     value: `${avgFillRate.toFixed(0)}%`,    sub: `${totalRegistered} registrations`,        icon: <CalendarCheck className="h-4 w-4" />,                                    color: "text-amber-400",   trend: `${eventsWithCapacity.length} events` },
            { label: "Pending Approvals", value: pendingExpenses + pendingReimb,  sub: `${fmt(fTotalPending)} expenses`,          icon: <Clock className="h-4 w-4" />,                                            color: "text-orange-400",  trend: `${pendingReimb} reimbursements`   },
            { label: "Engagement Avg",    value: `${avgEngagement}`,             sub: `${atRiskMembers.length} at risk`,         icon: <Activity className="h-4 w-4" />,                                         color: "text-blue-400",    trend: `${engagementScores.length} active` },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card border border-border/50 rounded-2xl p-3 space-y-1 hover:border-primary/30 transition-colors">
              <div className={cn("flex items-center gap-1.5", kpi.color)}>
                {kpi.icon}
                <span className="text-[10px] font-medium uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold leading-none">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
              <p className="text-[9px] text-muted-foreground/70 italic">{kpi.trend}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="executive"  className="gap-1.5 text-xs"><Gauge className="h-3 w-3" /> Executive Summary</TabsTrigger>
          <TabsTrigger value="members"    className="gap-1.5 text-xs"><Users className="h-3 w-3" /> Members</TabsTrigger>
          <TabsTrigger value="operations" className="gap-1.5 text-xs"><CheckSquare className="h-3 w-3" /> Operations</TabsTrigger>
          <TabsTrigger value="financial"  className="gap-1.5 text-xs"><DollarSign className="h-3 w-3" /> Financial</TabsTrigger>
          <TabsTrigger value="events"     className="gap-1.5 text-xs"><Calendar className="h-3 w-3" /> Events</TabsTrigger>
        </TabsList>

        {/* ── EXECUTIVE SUMMARY ── */}
        <TabsContent value="executive">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Monthly Trend */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight">
                <FileBarChart className="h-4 w-4 text-primary" /> Monthly Activity & Spending Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyTrend}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" {...XAXIS_PROPS} />
                  <YAxis yAxisId="left"  {...YAXIS_PROPS} />
                  <YAxis yAxisId="right" orientation="right" {...YAXIS_PROPS} />
                  <Tooltip content={<ChartTooltip />} cursor={CURSOR_PROPS} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", paddingTop: "16px" }} />
                  <Area  yAxisId="left"  type="monotone" dataKey="tasks"    stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.08} name="Tasks" />
                  <Bar   yAxisId="left"  dataKey="members"  fill="#3b82f6"  radius={[4, 4, 0, 0]} name="Members"  barSize={18} />
                  <Bar   yAxisId="left"  dataKey="events"   fill="#f472b6"  radius={[4, 4, 0, 0]} name="Events"   barSize={18} />
                  <Line  yAxisId="right" type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: "#ef4444" }} name="Spending ($)" />
                  <Line  yAxisId="right" type="monotone" dataKey="income"   stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} name="Income ($)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Smart Insights */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight">
                <Zap className="h-4 w-4 text-primary" /> Smart Insights ({insights.length})
              </h3>
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {insights.map((insight, i) => (
                  <div key={i} className={cn("border rounded-xl p-3", insightColors[insight.type])}>
                    <div className="flex items-center gap-2">
                      {insightIcons[insight.type]}
                      <p className="text-sm font-medium">{insight.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{insight.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Module Breakdown */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight">
                <BarChart3 className="h-4 w-4 text-primary" /> Module Breakdown
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Members",    val: fMemberStats.active,    max: fMemberStats.total,  color: "#3b82f6", detail: `${fMemberStats.inactive} inactive, ${fMemberStats.alumni} alumni` },
                  { label: "Tasks Done", val: completedTasks,          max: fTasks.length,       color: "#10b981", detail: `${inProgressTasks} in progress, ${overdueTasks.length} overdue` },
                  { label: "Budget",     val: Math.round(fTotalSpent), max: budget.totalBudget,  color: budgetUtil > 85 ? "#ef4444" : "#f59e0b", detail: `${fmt(budgetRemaining)} remaining` },
                  { label: "Events",     val: pastEvents,              max: fEvents.length,      color: "#f472b6", detail: `${upcomingEvents} upcoming, ${avgFillRate.toFixed(0)}% avg fill` },
                  { label: "Subtasks",   val: doneSubtasks,            max: totalSubtasks,       color: "#8b5cf6", detail: `${subtaskRate.toFixed(0)}% done, ${avgSubtasksPerTask} avg per task` },
                ].map(item => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground text-xs">{item.val} / {item.max} ({item.max > 0 ? ((item.val / item.max) * 100).toFixed(0) : 0}%)</span>
                    </div>
                    <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.max > 0 ? (item.val / item.max) * 100 : 0}%`, backgroundColor: item.color }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── MEMBERS ── */}
        <TabsContent value="members">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Engagement Leaderboard */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight"><Award className="h-4 w-4 text-primary" /> Engagement Leaderboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {engagementScores.slice(0, 9).map((m, idx) => (
                  <div key={m.id} className={cn("flex items-center gap-3 rounded-xl p-3 border transition-colors", idx < 3 ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/30")}>
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", idx === 0 ? "bg-amber-500/20 text-amber-400" : idx === 1 ? "bg-slate-300/20 text-slate-300" : idx === 2 ? "bg-orange-700/20 text-orange-400" : "bg-muted/50 text-muted-foreground")}>
                      {idx < 3 ? <Star className="h-4 w-4" /> : `#${idx + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.role} · {m.department}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-bold", m.score >= 70 ? "text-emerald-400" : m.score >= 40 ? "text-amber-400" : "text-red-400")}>{m.score}</p>
                      <p className="text-[9px] text-muted-foreground">score</p>
                    </div>
                    <div className="w-12 h-2 bg-muted/50 rounded-full overflow-hidden shrink-0">
                      <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: m.score >= 70 ? "#10b981" : m.score >= 40 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Role */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><Shield className="h-4 w-4 text-primary" /> Distribution by Role</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={membersByRole} layout="vertical">
                  <CartesianGrid {...GRID_PROPS} horizontal={false} vertical={false} />
                  <XAxis type="number" {...XAXIS_PROPS} tick={AXIS_TICK_SM} />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK_SM} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} cursor={CURSOR_PROPS} />
                  <Bar dataKey="value" fill="#38bdf8" radius={[0, 6, 6, 0]} name="Members" barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By Department */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><PieChartIcon className="h-4 w-4 text-primary" /> Distribution by Department</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={260}>
                  <PieChart>
                    <Pie data={membersByDept} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value" label={pieLabel} labelLine={false} stroke="none">
                      {membersByDept.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {membersByDept.map((d, idx) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="truncate flex-1">{d.name}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* By Year */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 uppercase tracking-tight">Members by Year</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={membersByYear}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" {...XAXIS_PROPS} tick={AXIS_TICK_SM} />
                  <YAxis {...YAXIS_PROPS} />
                  <Tooltip content={<ChartTooltip />} cursor={CURSOR_PROPS} />
                  <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Members" barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* At-Risk */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight"><UserX className="h-4 w-4 text-red-400" /> At-Risk Members ({atRiskMembers.length})</h3>
              {atRiskMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <UserCheck className="h-8 w-8 mb-2 text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-400">All members are engaged!</p>
                  <p className="text-xs mt-0.5">No members below the risk threshold</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {atRiskMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.role} · {m.tasksCompleted} tasks, {m.eventsAttended} events</p>
                      </div>
                      <span className="text-xs font-bold text-red-400">{m.score}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-2 italic">Members with engagement scores below 20 are flagged as at-risk</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── OPERATIONS ── */}
        <TabsContent value="operations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Task Pipeline */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><CheckSquare className="h-4 w-4 text-primary" /> Task Pipeline</h3>
              <div className="space-y-3">
                {tasksByStatus.map(s => {
                  const width = fTasks.length > 0 ? (s.value / fTasks.length) * 100 : 0
                  return (
                    <div key={s.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.fill }} />
                          <span className="font-medium">{s.name}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">{s.value} ({width.toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: s.fill }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 uppercase tracking-tight">Priority Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={tasksByPriority} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value" label={pieLabel} stroke="none">
                    {tasksByPriority.map(entry => (<Cell key={entry.name} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Workload by Section */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 uppercase tracking-tight">Workload by Section</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tasksBySection}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" {...XAXIS_PROPS} tick={AXIS_TICK_SM} />
                  <YAxis {...YAXIS_PROPS} />
                  <Tooltip content={<ChartTooltip />} cursor={CURSOR_PROPS} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Tasks" barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tasks by Tag */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 uppercase tracking-tight">Tasks by Tag</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tasksByTag} layout="vertical">
                  <CartesianGrid {...GRID_PROPS} horizontal={false} vertical={false} />
                  <XAxis type="number" {...XAXIS_PROPS} tick={AXIS_TICK_SM} />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK_SM} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<ChartTooltip />} cursor={CURSOR_PROPS} />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Count" barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Assignee Productivity */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight"><Users className="h-4 w-4 text-primary" /> Assignee Productivity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border/30">
                      <th className="text-left py-2 pr-4 font-medium">Member</th>
                      <th className="text-center py-2 px-3 font-medium">Assigned</th>
                      <th className="text-center py-2 px-3 font-medium">Completed</th>
                      <th className="text-center py-2 px-3 font-medium">Rate</th>
                      <th className="text-left py-2 pl-3 font-medium w-40">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assigneeStats.map(a => (
                      <tr key={a.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-4 font-medium">{a.name}</td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground">{a.assigned}</td>
                        <td className="py-2.5 px-3 text-center">{a.completed}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={cn("font-medium", a.rate >= 70 ? "text-emerald-400" : a.rate >= 40 ? "text-amber-400" : "text-red-400")}>{a.rate}%</span>
                        </td>
                        <td className="py-2.5 pl-3">
                          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${a.rate}%`, backgroundColor: a.rate >= 70 ? "#10b981" : a.rate >= 40 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overdue Tasks */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight"><AlertTriangle className="h-4 w-4 text-red-400" /> Overdue Tasks ({overdueTasks.length})</h3>
              {overdueTasks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-400">All tasks are on schedule!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {overdueTasks.map(t => {
                    const daysOver = Math.ceil((new Date().getTime() - new Date(t.dueDate!).getTime()) / 86400000)
                    return (
                      <div key={t.id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0", daysOver > 5 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>
                          {daysOver}d
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.section} · {t.priority} priority · {t.assignees.length} assignee{t.assignees.length > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── FINANCIAL ── */}
        <TabsContent value="financial">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Income vs Expenses Trend */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><CircleDollarSign className="h-4 w-4 text-primary" /> Income vs Expenses Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" {...XAXIS_PROPS} />
                  <YAxis {...YAXIS_PROPS} />
                  <Tooltip content={<CurrencyTooltip />} cursor={CURSOR_PROPS} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", paddingTop: "16px" }} />
                  <Area type="monotone" dataKey="income"   stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Income"   strokeWidth={2} />
                  <Area type="monotone" dataKey="spending" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Spending" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Spending by Category */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><PieChartIcon className="h-4 w-4 text-primary" /> Spending by Category</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart>
                    <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                      {expenseByCategory.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip content={<CurrencyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {expenseByCategory.map((item, idx) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{fmt(item.value)}</span>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct(item.value, fTotalSpent)}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Income by Source */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><Receipt className="h-4 w-4 text-primary" /> Income by Source</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart>
                    <Pie data={incomeByType} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                      {incomeByType.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[(idx + 3) % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip content={<CurrencyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {incomeByType.map((item, idx) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[(idx + 3) % PIE_COLORS.length] }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{fmt(item.value)}</span>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct(item.value, fTotalIncome)}%`, backgroundColor: PIE_COLORS[(idx + 3) % PIE_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Health Dashboard */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight"><Gauge className="h-4 w-4 text-primary" /> Financial Health Dashboard</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { icon: <Wallet className="h-4 w-4 text-cyan-400 mx-auto" />,                                                                                               val: fmt(budget.totalBudget), label: "Total Budget"   },
                  { icon: <TrendingDown className="h-4 w-4 text-red-400 mx-auto" />,                                                                                          val: fmt(fTotalSpent),        label: "Total Spent"    },
                  { icon: <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto" />,                                                                                        val: fmt(fTotalIncome),       label: "Total Income"   },
                  { icon: netCashFlow >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-400 mx-auto" /> : <ArrowDownRight className="h-4 w-4 text-red-400 mx-auto" />,    val: fmt(netCashFlow),        label: "Net Cash Flow", valColor: netCashFlow >= 0 ? "text-emerald-400" : "text-red-400" },
                  { icon: <Clock className="h-4 w-4 text-amber-400 mx-auto" />,                                                                                               val: fmt(fTotalPending),      label: "Pending"        },
                  { icon: <Shield className="h-4 w-4 text-violet-400 mx-auto" />,                                                                                             val: `${expenseApprovalRate.toFixed(0)}%`, label: "Approval Rate" },
                ].map(card => (
                  <div key={card.label} className="bg-muted/20 rounded-xl p-3 text-center space-y-1">
                    {card.icon}
                    <p className={cn("text-lg font-bold", card.valColor)}>{card.val}</p>
                    <p className="text-[10px] text-muted-foreground">{card.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Expenses */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Top Expenses</h3>
              <div className="space-y-2">
                {topExpenses.map((e, i) => (
                  <div key={e.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">{e.description}</p>
                      <p className="text-[10px] text-muted-foreground">{e.category} · {e.submittedBy}</p>
                    </div>
                    <span className={cn("text-xs font-bold shrink-0", e.status === "approved" ? "text-emerald-400" : e.status === "pending" ? "text-amber-400" : "text-red-400")}>{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Income + Approval Funnel */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Top Income Sources</h3>
              <div className="space-y-2 mb-6">
                {topIncomes.map((i, idx) => (
                  <div key={i.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">{i.source}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{i.type}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0">{fmt(i.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/30 pt-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Expense Approval Funnel</h4>
                <div className="space-y-2">
                  {[
                    { label: "Total Submitted", value: fExpenses.length,  color: "#3b82f6" },
                    { label: "Approved",         value: approvedExpenses,  color: "#10b981" },
                    { label: "Pending",          value: pendingExpenses,   color: "#f59e0b" },
                    { label: "Denied",           value: deniedExpenses,    color: "#ef4444" },
                  ].map(step => (
                    <div key={step.label} className="flex items-center gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                      <span className="flex-1">{step.label}</span>
                      <span className="font-bold">{step.value}</span>
                      <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${fExpenses.length > 0 ? (step.value / fExpenses.length) * 100 : 0}%`, backgroundColor: step.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── EVENTS ── */}
        <TabsContent value="events">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Event Overview */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight"><Calendar className="h-4 w-4 text-primary" /> Event Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { val: fEvents.length,            label: "Total Events",       color: ""                },
                  { val: pastEvents,                 label: "Completed",          color: "text-emerald-400"},
                  { val: upcomingEvents,             label: "Upcoming",           color: "text-blue-400"   },
                  { val: `${avgFillRate.toFixed(0)}%`, label: "Avg Fill Rate",   color: "text-amber-400"  },
                  { val: totalRegistered,            label: "Total Registrations",color: "text-pink-400"   },
                ].map(item => (
                  <div key={item.label} className="bg-muted/20 rounded-xl p-3 text-center">
                    <p className={cn("text-2xl font-bold", item.color)}>{item.val}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Fill Rates */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><BarChart3 className="h-4 w-4 text-primary" /> Registration Fill Rates</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={eventFillData} layout="vertical">
                  <CartesianGrid {...GRID_PROPS} horizontal={false} vertical={false} />
                  <XAxis type="number" {...XAXIS_PROPS} tick={AXIS_TICK_SM} />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK_SM} tickLine={false} axisLine={false} width={120} />
                  <Tooltip content={<ChartTooltip />} cursor={CURSOR_PROPS} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", paddingTop: "16px" }} />
                  <Bar dataKey="registered" fill="#38bdf8" radius={[0, 4, 4, 0]} name="Registered" barSize={16} />
                  <Bar dataKey="capacity"   fill="#94a3b8" radius={[0, 4, 4, 0]} name="Capacity"   barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Event Categories */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 uppercase tracking-tight">Event Categories</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={eventsByTag} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value" label={pieLabel} stroke="none">
                    {eventsByTag.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Event Status & Details */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-tight">Event Status & Details</h3>
              <div className="flex items-center gap-4 mb-4">
                {eventsByStatus.map(s => (
                  <div key={s.name} className="bg-muted/20 rounded-xl px-3 py-2 text-center flex-1">
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{s.name}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {fEvents.map(e => {
                  const fill = e.capacity ? ((e.registered || 0) / e.capacity) * 100 : null
                  return (
                    <div key={e.id} className="flex items-center gap-3 text-xs bg-muted/10 rounded-xl p-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground">{e.location}</p>
                      </div>
                      {fill !== null && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-12 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${fill}%`, backgroundColor: fill > 80 ? "#10b981" : fill > 50 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <span className="text-[10px] font-medium">{fill.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}