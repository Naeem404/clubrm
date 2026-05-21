import { StatCard } from "../stat-card"
import { Widget } from "../widget"
import { ProgressBar } from "../progress-bar"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Wallet } from "lucide-react"
import { DashboardLayoutProvider, useDashboardLayout } from "../customization/dashboard-layout-provider"
import { SortableWidget } from "../customization/sortable-widget"
import { cn } from "@/lib/utils"
import { useFinance } from "@/context/finance-context"
import { useMemo } from "react"
import { DashboardControls } from "../customization/dashboard-controls"
import { VP_FINANCE_WIDGET_TITLES, VP_FINANCE_DEFAULT_WIDGETS } from "../widget-config"

export function VPFinanceDashboard() {
  return (
    <DashboardLayoutProvider role="VP Finance" defaultWidgets={VP_FINANCE_DEFAULT_WIDGETS}>
      <VPFinanceDashboardContent />
    </DashboardLayoutProvider>
  )
}

function VPFinanceDashboardContent() {
  const { isCustomizing, layout, visibleWidgets } = useDashboardLayout()
  const { budget, expenses, income, reimbursements } = useFinance()

  const totalSpent = useMemo(() => expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0), [expenses])
  const budgetRemaining = useMemo(() => budget.totalBudget - totalSpent, [budget.totalBudget, totalSpent])
  const pendingApprovals = useMemo(() => expenses.filter(e => e.status === 'pending').length, [expenses])
  const totalIncomeValue = useMemo(() => income.reduce((sum, i) => sum + i.amount, 0), [income])
  const pendingReimbursements = useMemo(() => reimbursements.filter(r => r.status === 'pending'), [reimbursements])

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {}
    expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount
    })
    return categories
  }, [expenses])

  const renderWidget = (id: string) => {
    if (!visibleWidgets.has(id)) return null

    switch (id) {
      case "budget-remaining":
        return (
          <StatCard
            title="Budget Remaining"
            value={`$${budgetRemaining.toLocaleString()}`}
            description={`${Math.round((budgetRemaining / budget.totalBudget) * 100)}% of $${budget.totalBudget.toLocaleString()} total`}
            trend={{ value: Math.round((totalSpent / budget.totalBudget) * 100), label: "budget utilization", inverse: true }}
            icon={<Wallet className="h-5 w-5" />}
          />
        )
      case "pending-approvals":
        return (
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals.toString()}
            description="Expense requests"
            trend={{ value: expenses.filter(e => new Date(e.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, label: "new this week", inverse: true }}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        )
      case "total-income":
        return (
          <StatCard
            title="Total Income"
            value={`$${totalIncomeValue.toLocaleString()}`}
            trend={{ value: income.filter(i => new Date(i.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, label: "new entries this month" }}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        )
      case "budget-category":
        return (
          <Widget title="Spending by Category">
            <div className="space-y-3">
              {Object.entries(expensesByCategory).map(([cat, amount], i) => (
                <ProgressBar 
                  key={cat}
                  value={amount} 
                  max={totalSpent || 1} 
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)} 
                  subLabel={`$${amount.toLocaleString()}`} 
                  color={i % 2 === 0 ? "pink" : "emerald"} 
                />
              ))}
              {Object.keys(expensesByCategory).length === 0 && <p className="text-sm text-muted-foreground italic">No expenses recorded</p>}
            </div>
          </Widget>
        )
      case "pending-reimbursements":
        return (
          <Widget title="Pending Reimbursements" footer={<span className="cursor-pointer hover:text-primary transition-colors italic">View all reimbursements →</span>}>
            <DashboardList>
              {pendingReimbursements.slice(0, 3).map(r => (
                <DashboardListItem
                  key={r.id}
                  title={`${r.submittedBy} — ${r.description}`}
                  subtitle={`Submitted ${new Date(r.date).toLocaleDateString()} • $${r.amount}`}
                  metadata="Pending"
                  icon={<DollarSign className="h-4 w-4 text-amber-500" />}
                />
              ))}
              {pendingReimbursements.length === 0 && <p className="text-sm text-muted-foreground italic p-4 text-center">No pending reimbursements</p>}
            </DashboardList>
          </Widget>
        )
      case "recent-transactions":
        return (
          <Widget title="Recent Approved Expenses">
            <DashboardList>
              {expenses.filter(e => e.status === 'approved').slice(0, 3).map(e => (
                <DashboardListItem
                  key={e.id}
                  title={e.description}
                  subtitle={`${e.submittedBy} — $${e.amount}`}
                  metadata="Approved"
                  icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
                />
              ))}
              {expenses.filter(e => e.status === 'approved').length === 0 && <p className="text-sm text-muted-foreground italic p-4 text-center">No recent approved expenses</p>}
            </DashboardList>
          </Widget>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Financial Status</h2>
          <p className="text-sm text-muted-foreground">Monitor budget allocation and reimbursement requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardControls
            defaultWidgets={VP_FINANCE_DEFAULT_WIDGETS}
            widgetTitles={VP_FINANCE_WIDGET_TITLES}
          />
        </div>
      </div>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500",
        isCustomizing && "scale-[0.98] blur-[0.5px]"
      )}>
        {layout.map((id) => (
          <SortableWidget key={id} id={id} isCustomizing={isCustomizing}>
            {renderWidget(id)}
          </SortableWidget>
        ))}
      </div>
    </div>
  )
}
