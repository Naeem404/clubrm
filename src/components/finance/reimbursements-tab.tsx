import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useFinance } from "@/context/finance-context"
import { useAuth } from "@/context/auth-context"
import {
  type Reimbursement,
  type ReimbursementStatus,
  EXPENSE_CATEGORIES,
  REIMBURSEMENT_STATUS_CONFIG,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"
import {
  Plus,
  CheckCircle,
  XCircle,
  Receipt,
  Clock,
  DollarSign,
  Banknote,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortKey = "date" | "amount" | "submittedBy"

export function ReimbursementsTab() {
  const { reimbursements, addReimbursement, updateReimbursementStatus } = useFinance()
  const { user } = useAuth()
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Unknown"
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [filterStatus, setFilterStatus] = useState<ReimbursementStatus | "all">("all")
  const [modalOpen, setModalOpen] = useState(false)

  const [newDesc, setNewDesc] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newCategory, setNewCategory] = useState("events")
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [newNotes, setNewNotes] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "date", direction: "desc" })

  const filtered = useMemo(() => {
    return [...reimbursements]
      .filter((r) => filterStatus === "all" || r.status === filterStatus)
      .sort((a, b) => {
        const dir = sortConfig.direction === "asc" ? 1 : -1
        switch (sortConfig.key) {
          case "date":
            return (a.date.getTime() - b.date.getTime()) * dir
          case "amount":
            return (a.amount - b.amount) * dir
          case "submittedBy":
            return a.submittedBy.localeCompare(b.submittedBy) * dir
          default:
            return 0
        }
      })
  }, [reimbursements, filterStatus, sortConfig])

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-40 inline-block ml-1" />
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3 w-3 inline-block ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 inline-block ml-1" />
    )
  }

  const grouped = useMemo(() => {
    const groups: Record<string, Reimbursement[]> = {
      pending: [],
      approved: [],
      paid: [],
      denied: [],
    }
    filtered.forEach((r) => groups[r.status]?.push(r))
    return groups
  }, [filtered])

  const pendingTotal = reimbursements
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.amount, 0)

  const handleSubmit = () => {
    if (!newDesc.trim() || !newAmount) return
    const r: Reimbursement = {
      id: `r-${Date.now()}`,
      submittedBy: currentUserName,
      amount: parseFloat(newAmount),
      description: newDesc.trim(),
      category: newCategory,
      date: new Date(`${newDate}T12:00:00`),
      status: "pending",
      notes: newNotes || undefined,
    }
    addReimbursement(r)
    setModalOpen(false)
    setNewDesc("")
    setNewAmount("")
    setNewCategory("events")
    setNewDate(format(new Date(), "yyyy-MM-dd"))
    setNewNotes("")
  }

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/50">
            {(["all", "pending", "approved", "paid", "denied"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize",
                  filterStatus === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          {pendingTotal > 0 && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatCurrency(pendingTotal)} pending
            </span>
          )}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Submit Reimbursement
        </Button>
      </div>

      {/* Reimbursement groups */}
      {(["pending", "approved", "paid", "denied"] as const).map((status) => {
        const items = grouped[status]
        if (!items || items.length === 0) return null
        const config = REIMBURSEMENT_STATUS_CONFIG[status]

        return (
          <div key={status} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30 bg-muted/20">
                <div className={cn("h-2.5 w-2.5 rounded-full", config.dotColor)} />
                <span className="text-sm font-semibold capitalize">{config.label}</span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 tabular-nums">
                  {items.length}
                </span>
                
                <div className="ml-auto flex items-center gap-4">
                  <button onClick={() => handleSort("date")} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center">
                    Date <SortIcon columnKey="date" />
                  </button>
                  <button onClick={() => handleSort("amount")} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center">
                    Amount <SortIcon columnKey="amount" />
                  </button>
                </div>
              </div>

            <div className="divide-y divide-border/20">
              {items.map((r) => {
                const cat = getCategory(r.category)
                return (
                  <div
                    key={r.id}
                    className="px-5 py-4 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(r.submittedBy)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold">{r.submittedBy}</span>
                            <span className="text-sm font-bold tabular-nums">{formatCurrency(r.amount)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {cat && (
                              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", cat.color)}>
                                {cat.name}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">{format(r.date, "MMM d, yyyy")}</span>
                            {r.approvedBy && (
                              <span className="text-[11px] text-muted-foreground">
                                · Approved by {r.approvedBy}
                              </span>
                            )}
                            {r.paidDate && (
                              <span className="text-[11px] text-emerald-400">
                                · Paid {format(r.paidDate, "MMM d")}
                              </span>
                            )}
                          </div>
                          {r.notes && (
                            <p className="text-[11px] text-amber-400 mt-1">{r.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Receipt
                        </Button>

                        {r.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              className="gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() => updateReimbursementStatus(r.id, "approved", currentUserName)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => updateReimbursementStatus(r.id, "denied")}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Deny
                            </Button>
                          </>
                        )}

                        {r.status === "approved" && (
                          <Button
                            variant="outline"
                            size="xs"
                            className="gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => updateReimbursementStatus(r.id, "paid")}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 rounded-xl border border-border/50 bg-card text-muted-foreground">
          <DollarSign className="h-8 w-8 mb-2 opacity-30" />
          <span className="text-sm">No reimbursements found</span>
        </div>
      )}

      {/* Submit Reimbursement Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Submit Reimbursement</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit a personal expense for reimbursement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What did you purchase?"
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
                <Label className="text-sm">Date of Purchase</Label>
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
                placeholder="Any additional details or context..."
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!newDesc.trim() || !newAmount}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
