import { StatCard } from "../stat-card"
import { Widget } from "../widget"
import { ProgressBar } from "../progress-bar"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { Shield, Users, Server, Activity, CheckCircle, AlertTriangle } from "lucide-react"
import { DashboardLayoutProvider, useDashboardLayout } from "../customization/dashboard-layout-provider"
import { SortableWidget } from "../customization/sortable-widget"
import { cn } from "@/lib/utils"
import { useMembers } from "@/context/members-context"
import { useTasks } from "@/context/tasks-context"
import { useEvents } from "@/context/events-context"
import { useMemo } from "react"
import { DashboardControls } from "../customization/dashboard-controls"
import { ADMIN_WIDGET_TITLES, ADMIN_DEFAULT_WIDGETS } from "../widget-config"

export function AdminDashboard() {
  return (
    <DashboardLayoutProvider role="Administrator" defaultWidgets={ADMIN_DEFAULT_WIDGETS}>
      <AdminDashboardContent />
    </DashboardLayoutProvider>
  )
}

function AdminDashboardContent() {
  const { isCustomizing, layout, visibleWidgets } = useDashboardLayout()
  const { members, stats: memberStats } = useMembers()
  const { tasks } = useTasks()
  const { events } = useEvents()

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    members.forEach(m => {
      counts[m.role] = (counts[m.role] || 0) + 1
    })
    return counts
  }, [members])

  const activeRolesCount = useMemo(() => Object.keys(roleCounts).length, [roleCounts])

  const recentActivity = useMemo(() => {
    const allActivities = [
      ...tasks.map(t => ({ title: "Task updated", subtitle: t.title, date: t.createdAt, icon: <Activity className="h-4 w-4 text-blue-400" /> })),
      ...events.map(e => ({ title: "Event scheduled", subtitle: e.title, date: e.startDate, icon: <CheckCircle className="h-4 w-4 text-emerald-500" /> }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return allActivities.slice(0, 3)
  }, [tasks, events])

  const renderWidget = (id: string) => {
    if (!visibleWidgets.has(id)) return null

    switch (id) {
      case "system-health":
        return (
          <StatCard
            title="System Health"
            value="99.8%"
            trend={{ value: 0.2, label: "uptime this month" }}
            icon={<Server className="h-5 w-5" />}
          />
        )
      case "total-users":
        return (
          <StatCard
            title="Total Users"
            value={memberStats.total.toString()}
            trend={{ value: members.filter(m => new Date(m.joinDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, label: "new this month" }}
            icon={<Users className="h-5 w-5" />}
          />
        )
      case "active-roles":
        return (
          <StatCard
            title="Active Roles"
            value={activeRolesCount.toString()}
            description="Across all club departments"
            icon={<Shield className="h-5 w-5" />}
          />
        )
      case "role-distribution":
        return (
          <Widget title="Role Distribution">
            <div className="space-y-3">
              {Object.entries(roleCounts).map(([role, count], index) => (
                <ProgressBar 
                  key={role}
                  value={count} 
                  max={members.length} 
                  label={role} 
                  subLabel={`${count} member${count > 1 ? 's' : ''}`} 
                  color={index % 2 === 0 ? "default" : "amber"} 
                />
              ))}
            </div>
          </Widget>
        )
      case "system-activity":
        return (
          <Widget title="Recent System Activity" footer={<span className="cursor-pointer hover:text-primary transition-colors italic">View audit log →</span>}>
            <DashboardList>
              {recentActivity.map((activity, i) => (
                <DashboardListItem
                  key={i}
                  title={activity.title}
                  subtitle={activity.subtitle}
                  metadata={new Date(activity.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  icon={activity.icon}
                />
              ))}
            </DashboardList>
          </Widget>
        )
      case "system-alerts":
        return (
          <Widget title="System Alerts">
            <DashboardList>
              <DashboardListItem
                title="Database backup"
                subtitle="Last backup: 2 hours ago"
                metadata="OK"
                icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
              />
              <DashboardListItem
                title="Storage usage"
                subtitle="2.1 GB of 10 GB used (21%)"
                metadata="OK"
                icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
              />
              <DashboardListItem
                title="1 inactive member"
                subtitle="Lisa Park — inactive since Nov 2025"
                metadata="Review"
                icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
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
          <h2 className="text-xl font-semibold tracking-tight">System Status</h2>
          <p className="text-sm text-muted-foreground">Monitor platform health and user activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardControls
            defaultWidgets={ADMIN_DEFAULT_WIDGETS}
            widgetTitles={ADMIN_WIDGET_TITLES}
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
