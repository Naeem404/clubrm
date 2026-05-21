import { StatCard } from "../stat-card"
import { Widget } from "../widget"
import { ProgressBar } from "../progress-bar"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { CheckSquare, Clock, Users, AlertTriangle, TrendingUp } from "lucide-react"
import { DashboardLayoutProvider, useDashboardLayout } from "../customization/dashboard-layout-provider"
import { SortableWidget } from "../customization/sortable-widget"
import { cn } from "@/lib/utils"
import { useTasks } from "@/context/tasks-context"
import { useMemo } from "react"
import { DashboardControls } from "../customization/dashboard-controls"
import { VP_INTERNAL_WIDGET_TITLES, VP_INTERNAL_DEFAULT_WIDGETS } from "../widget-config"

export function VPInternalDashboard() {
  return (
    <DashboardLayoutProvider role="VP Internal" defaultWidgets={VP_INTERNAL_DEFAULT_WIDGETS}>
      <VPInternalDashboardContent />
    </DashboardLayoutProvider>
  )
}

function VPInternalDashboardContent() {
  const { isCustomizing, layout, visibleWidgets } = useDashboardLayout()
  const { tasks } = useTasks()

  const completedCount = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks])
  const totalCount = useMemo(() => tasks.length, [tasks])
  const overdueCount = useMemo(() => tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length, [tasks])
  const productivity = useMemo(() => totalCount > 0 ? (completedCount / totalCount) * 100 : 0, [completedCount, totalCount])

  const taskBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })
    return counts
  }, [tasks])

  const renderWidget = (id: string) => {
    if (!visibleWidgets.has(id)) return null

    switch (id) {
      case "tasks-completed":
        return (
          <StatCard
            title="Tasks Completed"
            value={`${completedCount}/${totalCount}`}
            trend={{ value: tasks.filter(t => t.status === 'done' && new Date(t.completedAt || 0) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, label: "this week" }}
            icon={<CheckSquare className="h-5 w-5" />}
          />
        )
      case "overdue-tasks":
        return (
          <StatCard
            title="Overdue Tasks"
            value={overdueCount.toString()}
            trend={{ value: overdueCount, label: "active bottlenecks", inverse: true }}
            icon={<Clock className="h-5 w-5" />}
          />
        )
      case "team-productivity":
        return (
          <StatCard
            title="Team Productivity"
            value={`${Math.round(productivity)}%`}
            description="Overall completion rate"
            trend={{ value: 5, label: "trend stable" }}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        )
      case "task-breakdown":
        return (
          <Widget title="Task Breakdown">
            <div className="space-y-3">
              {Object.entries(taskBreakdown).map(([status, count], i) => (
                <ProgressBar 
                  key={status}
                  value={count} 
                  max={totalCount || 1} 
                  label={status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)} 
                  subLabel={`${count} task${count > 1 ? 's' : ''}`} 
                  color={status === "done" ? "emerald" : (status === "todo" ? "amber" : "default")} 
                />
              ))}
              {totalCount === 0 && <p className="text-sm text-muted-foreground italic">No tasks available</p>}
            </div>
          </Widget>
        )
      case "blocked-tasks":
        return (
          <Widget title="Blocked Tasks" footer={<span className="cursor-pointer hover:text-primary transition-colors italic">View task board →</span>}>
            <DashboardList>
              <DashboardListItem
                title="Sponsor outreach emails"
                subtitle="Blocked by: awaiting sponsor list from VP External"
                metadata="High"
                icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              />
              <DashboardListItem
                title="Event poster design"
                subtitle="Blocked by: missing brand assets"
                metadata="Medium"
                icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              />
            </DashboardList>
          </Widget>
        )
      case "team-activity":
        return (
          <Widget title="Team Activity" footer={<span className="cursor-pointer hover:text-primary transition-colors italic">View all members →</span>}>
            <DashboardList>
              <DashboardListItem
                title="Sarah Chen completed 3 tasks"
                subtitle="Today at 2:30 PM"
                icon={<Users className="h-4 w-4" />}
              />
              <DashboardListItem
                title="David Kim submitted for review"
                subtitle="Today at 1:15 PM"
                icon={<Users className="h-4 w-4" />}
              />
              <DashboardListItem
                title="Emily Watson started 2 tasks"
                subtitle="Yesterday at 4:00 PM"
                icon={<Users className="h-4 w-4" />}
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
          <h2 className="text-xl font-semibold tracking-tight">Internal Operations</h2>
          <p className="text-sm text-muted-foreground">Monitor team productivity and task statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardControls
            defaultWidgets={VP_INTERNAL_DEFAULT_WIDGETS}
            widgetTitles={VP_INTERNAL_WIDGET_TITLES}
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
