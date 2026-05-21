import { StatCard } from "../stat-card"
import { Widget } from "../widget"
import { ProgressBar } from "../progress-bar"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { Handshake, DollarSign, TrendingUp, Phone } from "lucide-react"
import { DashboardLayoutProvider, useDashboardLayout } from "../customization/dashboard-layout-provider"
import { SortableWidget } from "../customization/sortable-widget"
import { cn } from "@/lib/utils"
import { useFinance } from "@/context/finance-context"
import { useTasks } from "@/context/tasks-context"
import { useMemo } from "react"
import { DashboardControls } from "../customization/dashboard-controls"
import { VP_EXTERNAL_WIDGET_TITLES, VP_EXTERNAL_DEFAULT_WIDGETS } from "../widget-config"

export function VPExternalDashboard() {
  return (
    <DashboardLayoutProvider role="VP External" defaultWidgets={VP_EXTERNAL_DEFAULT_WIDGETS}>
      <VPExternalDashboardContent />
    </DashboardLayoutProvider>
  )
}

function VPExternalDashboardContent() {
  const { isCustomizing, layout, visibleWidgets } = useDashboardLayout()
  const { income } = useFinance()
  const { tasks } = useTasks()

  const sponsorshipIncome = useMemo(() => income.filter(i => i.type === 'sponsorship'), [income])
  const totalSponsorshipRevenue = useMemo(() => sponsorshipIncome.reduce((sum, i) => sum + i.amount, 0), [sponsorshipIncome])
  const externalTasks = useMemo(() => tasks.filter(t => t.section === "External" || t.tags.includes('sponsorship')), [tasks])
  const activeLeads = useMemo(() => externalTasks.filter(t => t.status === 'in_progress').length, [externalTasks])

  const renderWidget = (id: string) => {
    if (!visibleWidgets.has(id)) return null

    switch (id) {
      case "active-sponsors":
        return (
          <StatCard
            title="Confirmed Sponsors"
            value={sponsorshipIncome.length.toString()}
            trend={{ value: sponsorshipIncome.filter(i => new Date(i.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, label: "new this month" }}
            icon={<Handshake className="h-5 w-5" />}
          />
        )
      case "sponsorship-revenue":
        return (
          <StatCard
            title="Sponsorship Revenue"
            value={`$${totalSponsorshipRevenue.toLocaleString()}`}
            trend={{ value: 18, label: "vs last term" }}
            icon={<DollarSign className="h-5 w-5" />}
          />
        )
      case "pipeline-value":
        return (
          <StatCard
            title="Active Leads"
            value={activeLeads.toString()}
            description={`${externalTasks.length} total outreach tasks`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        )
      case "sponsor-tiers":
        return (
          <Widget title="Sponsor Tiers">
            <div className="space-y-3">
              <ProgressBar value={100} label="Platinum" subLabel="1 sponsor • $5,000" color="default" />
              <ProgressBar value={66} label="Gold" subLabel="2 sponsors • $5,500" color="amber" />
              <ProgressBar value={33} label="Silver" subLabel="1 sponsor • $1,500" color="default" />
              <ProgressBar value={16} label="Bronze" subLabel="1 sponsor • $750" color="default" />
            </div>
          </Widget>
        )
      case "recent-outreach":
        return (
          <Widget title="External Outreach" footer={<span className="cursor-pointer hover:text-primary transition-colors italic">View all interactions →</span>}>
            <DashboardList>
              {externalTasks.slice(0, 3).map(task => (
                <DashboardListItem
                  key={task.id}
                  title={task.title}
                  subtitle={task.status.replace('_', ' ')}
                  metadata={new Date(task.dueDate || 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  icon={task.status === 'done' ? <Handshake className="h-4 w-4 text-emerald-500" /> : <Phone className="h-4 w-4 text-blue-400" />}
                />
              ))}
              {externalTasks.length === 0 && <p className="text-sm text-muted-foreground italic p-4 text-center">No recent outreach</p>}
            </DashboardList>
          </Widget>
        )
      case "upcoming-renewals":
        return (
          <Widget title="Upcoming Renewals">
            <DashboardList>
              <DashboardListItem
                title="Campus Eats Co."
                subtitle="Bronze tier • Expires Apr 30"
                metadata="$750"
                icon={<Handshake className="h-4 w-4 text-amber-400" />}
              />
              <DashboardListItem
                title="TechNova Solutions"
                subtitle="Platinum tier • Expires Aug 31"
                metadata="$5,000"
                icon={<Handshake className="h-4 w-4 text-slate-300" />}
              />
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
          <h2 className="text-xl font-semibold tracking-tight">External Relations</h2>
          <p className="text-sm text-muted-foreground">Manage sponsorships and outreach pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardControls
            defaultWidgets={VP_EXTERNAL_DEFAULT_WIDGETS}
            widgetTitles={VP_EXTERNAL_WIDGET_TITLES}
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
