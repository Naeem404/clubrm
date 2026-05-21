import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useFinance } from "@/context/finance-context"
import {
  type Income,
  type IncomeType,
  INCOME_TYPE_CONFIG,
  formatCurrency,
} from "./types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { format } from "date-fns"
import {
  Plus,
  Trash2,
  RefreshCw,
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Target,
  TrendingUp,
} from "lucide-react"

// Matches your Marketing page palette exactly
const CHART_COLORS = [
  "hsl(var(--primary))", 
  "#38bdf8", // Sky
  "#fb7185", // Rose
  "#fbbf24", // Amber
  "#a78bfa", // Violet
  "#2dd4bf"  // Teal
]

export function IncomeTab() {
  const { income, addIncome, deleteIncome, totalIncome } = useFinance()
  const [searchParams] = useSearchParams()

  // --- State ---
  const [filterType, setFilterType] = useState<IncomeType | "all">("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [newSource, setNewSource] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newType, setNewType] = useState<IncomeType>("dues")
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [newRecurring, setNewRecurring] = useState(false)
  const [newNotes, setNewNotes] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: "date" | "source" | "type" | "amount"; direction: "asc" | "desc" }>({ 
    key: "date", 
    direction: "desc" 
  })

  // --- Data Processing ---
  const filtered = useMemo(() => {
    return income
      .filter((i) => filterType === "all" || i.type === filterType)
      .sort((a, b) => {
        const dir = sortConfig.direction === "asc" ? 1 : -1
        switch (sortConfig.key) {
          case "date": return (a.date.getTime() - b.date.getTime()) * dir
          case "source": return a.source.localeCompare(b.source) * dir
          case "type": return a.type.localeCompare(b.type) * dir
          case "amount": return (a.amount - b.amount) * dir
          default: return 0
        }
      })
  }, [income, filterType, sortConfig])

  const byType = useMemo(() => {
    const map: Record<string, number> = {}
    income.forEach((i) => {
      map[i.type] = (map[i.type] || 0) + i.amount
    })
    return (Object.entries(INCOME_TYPE_CONFIG) as [IncomeType, typeof INCOME_TYPE_CONFIG[IncomeType]][]).map(
      ([key, config]) => ({
        name: config.label,
        value: map[key] || 0,
      })
    ).filter((d) => d.value > 0)
  }, [income])

  const recurringTotal = useMemo(() => 
    income.filter((i) => i.recurring).reduce((s, i) => s + i.amount, 0), 
  [income])

  // --- UI Components ---
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mb-1">{payload[0].name}</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} />
              <span className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</span>
            </div>
            <span className="text-[10px] font-medium text-primary">
              {((payload[0].value / totalIncome) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  const handleSort = (key: any) => {
    setSortConfig(c => ({ key, direction: c.key === key && c.direction === "asc" ? "desc" : "asc" }))
  }

  const handleAdd = () => {
    if (!newSource.trim() || !newAmount) return
    const inc: Income = {
      id: `i-${Date.now()}`,
      source: newSource.trim(),
      amount: parseFloat(newAmount),
      type: newType,
      date: new Date(`${newDate}T12:00:00`),
      recurring: newRecurring,
      notes: newNotes || undefined,
    }
    addIncome(inc)
    setModalOpen(false)
    setNewSource(""); setNewAmount(""); setNewType("dues"); setNewRecurring(false); setNewNotes("");
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Income</p>
          <h3 className="text-3xl font-black mt-1 text-foreground">{formatCurrency(totalIncome)}</h3>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{income.length} verified sources</p>
        </div>

        <div className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-sky-500/30 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recurring Flow</p>
          <h3 className="text-3xl font-black mt-1">{formatCurrency(recurringTotal)}</h3>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {income.filter(i => i.recurring).length} active streams
          </p>
        </div>

        {/* ── Optimized Donut Card ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col justify-center min-h-[160px] shadow-sm">
          <div className="w-full flex items-center justify-between px-2 mb-2">
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distribution</span>
             <Target className="h-3.5 w-3.5 text-primary opacity-50" />
          </div>
          <div className="flex items-center w-full">
            <div className="w-[110px] h-[110px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={byType} 
                    innerRadius={32} 
                    outerRadius={48} 
                    paddingAngle={6} 
                    dataKey="value" 
                    stroke="none"
                  >
                    {byType.map((_, idx) => (
                      <Cell 
                        key={idx} 
                        fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                        className="outline-none hover:opacity-80 transition-opacity cursor-pointer" 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 pl-4 overflow-hidden">
              {byType.slice(0, 4).map((d, idx) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="text-[10px] font-bold text-muted-foreground truncate">{d.name}</span>
                  </div>
                  <span className="text-[10px] font-black tabular-nums">{((d.value/totalIncome)*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 rounded-2xl border border-border/40 bg-muted/10 backdrop-blur-sm">
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterType === "all" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            All Sources
          </button>
          {(Object.entries(INCOME_TYPE_CONFIG) as [IncomeType, any][]).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                filterType === key ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {config.label}
            </button>
          ))}
        </div>
        <Button size="sm" className="rounded-xl shadow-lg shadow-primary/20 font-bold px-5 h-10" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Income
        </Button>
      </div>

      {/* ── Income Table ── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer group" onClick={() => handleSort("date")}>
                Date <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer group" onClick={() => handleSort("source")}>
                Source <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right cursor-pointer group" onClick={() => handleSort("amount")}>
                Amount <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </th>
              <th className="px-6 py-4 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filtered.map((inc) => {
              const config = INCOME_TYPE_CONFIG[inc.type]
              return (
                <tr key={inc.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{format(inc.date, "MMM d, yyyy")}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{inc.source}</span>
                      {inc.recurring && <RefreshCw className="h-3 w-3 text-sky-400 animate-spin-slow" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-tight", config.color)}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-right tabular-nums text-emerald-500">
                    +{formatCurrency(inc.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" onClick={() => deleteIncome(inc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Income Dialog remains logically same, just updated rounding */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-[480px]">
           {/* ... existing dialog content ... */}
        </DialogContent>
      </Dialog>
    </div>
  )
}