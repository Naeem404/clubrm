import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useFinance } from "@/context/finance-context"
import { useAuth } from "@/context/auth-context"
import {
  type Expense,
  type ExpenseStatus,
  EXPENSE_CATEGORIES,
  STATUS_CONFIG,
  getCategory,
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
import { format } from "date-fns"
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

type SortKey = "date" | "description" | "category" | "submittedBy" | "amount" | "status"

interface ExpensesTabProps {
  onAddExpense?: () => void
}

export function ExpensesTab({}: ExpensesTabProps) {
  const { expenses, addExpense, updateExpenseStatus, deleteExpense } = useFinance()
  const { user } = useAuth()
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Unknown"
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "all">("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const [modalOpen, setModalOpen] = useState(false)
  const [newDesc, setNewDesc] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newCategory, setNewCategory] = useState("events")
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [newNotes, setNewNotes] = useState("")

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "date", direction: "desc" })

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        if (filterStatus !== "all" && e.status !== filterStatus) return false
        if (filterCategory !== "all" && e.category !== filterCategory) return false
        if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        const dir = sortConfig.direction === "asc" ? 1 : -1
        switch (sortConfig.key) {
          case "date":
            return (a.date.getTime() - b.date.getTime()) * dir
          case "description":
            return a.description.localeCompare(b.description) * dir
          case "category":
            return a.category.localeCompare(b.category) * dir
          case "submittedBy":
            return a.submittedBy.localeCompare(b.submittedBy) * dir
          case "amount":
            return (a.amount - b.amount) * dir
          case "status":
            return a.status.localeCompare(b.status) * dir
          default:
            return 0
        }
      })
  }, [expenses, filterStatus, filterCategory, search, sortConfig])

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity inline-block" />
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-1.5 h-3 w-3 inline-block" />
    ) : (
      <ArrowDown className="ml-1.5 h-3 w-3 inline-block" />
    )
  }

  const handleAddExpense = () => {
    if (!newDesc.trim() || !newAmount) return
    const expense: Expense = {
      id: `e-${Date.now()}`,
      description: newDesc.trim(),
      amount: parseFloat(newAmount),
      category: newCategory,
      date: new Date(`${newDate}T12:00:00`),
      status: "pending",
      submittedBy: currentUserName,
      notes: newNotes || undefined,
    }
    addExpense(expense)
    setModalOpen(false)
    setNewDesc("")
    setNewAmount("")
    setNewCategory("events")
    setNewDate(format(new Date(), "yyyy-MM-dd"))
    setNewNotes("")
  }

  const totalFiltered = filteredExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/50">
            <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            {(["all", "pending", "approved", "denied"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium transition-all capitalize",
                  filterStatus === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filteredExpenses.length} items · {formatCurrency(totalFiltered)}
          </span>
          <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("date")}>
                  Date <SortIcon columnKey="date" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("description")}>
                  Description <SortIcon columnKey="description" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("category")}>
                  Category <SortIcon columnKey="category" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("submittedBy")}>
                  Submitted By <SortIcon columnKey="submittedBy" />
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("amount")}>
                  Amount <SortIcon columnKey="amount" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("status")}>
                  Status <SortIcon columnKey="status" />
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const cat = getCategory(expense.category)
                const status = STATUS_CONFIG[expense.status]
                return (
                  <tr
                    key={expense.id}
                    className="border-b border-border/10 hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {format(expense.date, "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{expense.description}</div>
                      {expense.notes && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{expense.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cat && (
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", cat.color)}>
                          {cat.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{expense.submittedBy}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {expense.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => updateExpenseStatus(expense.id, "approved", currentUserName)}
                              title="Approve"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-red-400 hover:bg-red-500/10"
                              onClick={() => updateExpenseStatus(expense.id, "denied")}
                              title="Deny"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteExpense(expense.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No expenses match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit a new expense for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What was the expense for?"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Category</Label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Notes (optional)</Label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddExpense} disabled={!newDesc.trim() || !newAmount}>
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
