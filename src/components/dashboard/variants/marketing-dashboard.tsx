import { StatCard } from "../stat-card"
import { Widget } from "../widget"
import { ProgressBar } from "../progress-bar"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { Eye, Heart, Share2, Megaphone, TrendingUp } from "lucide-react"
import { DashboardLayoutProvider, useDashboardLayout } from "../customization/dashboard-layout-provider"
import { SortableWidget } from "../customization/sortable-widget"
import { cn } from "@/lib/utils"
import { useTasks } from "@/context/tasks-context"
import { useMemo } from "react"
// Resolved: Using the centralized config from Taziz's refactor
import { DashboardControls } from "../customization/dashboard-controls"
import { MARKETING_WIDGET_TITLES, MARKETING_DEFAULT_WIDGETS } from "../widget-config"

export function MarketingDashboard() {
  return (
    <DashboardLayoutProvider role="Marketing" defaultWidgets={MARKETING_DEFAULT_WIDGETS}>
      <MarketingDashboardContent />
    </DashboardLayoutProvider>
  )
}

function MarketingDashboardContent() {
  const { isCustomizing, layout, visibleWidgets } = useDashboardLayout()
  const { tasks } = useTasks()

  const marketingTasks = useMemo(() => tasks.filter(t => t.section === "Marketing"), [tasks])
  const activeCampaigns = useMemo(() => marketingTasks.filter(t => t.status === "in_progress"), [marketingTasks])

  const renderWidget = (id: string) => {
    if (!visibleWidgets.has(id)) return null

    switch (id) {
      case "total-reach":
        return <StatCard title="Total Reach" value="28.1K" trend={{ value: 34, label: "vs last month" }} icon={<Eye className="h-5 w-5 text-primary" />} />
      case "engagement-rate":
        return <StatCard title="Engagement Rate" value="14.9%" trend={{ value: 3, label: "vs last month" }} icon={<TrendingUp className="h-5 w-5 text-primary" />} />
      case "active-campaigns":
        return <StatCard title="Active Campaigns" value={activeCampaigns.length.toString()} description={`${marketingTasks.length} total initiatives`} icon={<Megaphone className="h-5 w-5 text-primary" />} />
      case "campaign-performance":
        return (
          <Widget title="Campaign Performance">
            <div className="space-y-3">
              {marketingTasks.slice(0, 4).map(task => {
                const progress = task.subtasks.length > 0 ? (task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100 : 0
                return <ProgressBar key={task.id} value={progress} label={task.title} subLabel={task.status.replace('_', ' ')} color={task.status === "done" ? "emerald" : "default"} />
              })}
            </div>
          </Widget>
        )
      case "top-posts":
        return (
          <Widget title="Top Posts" footer={<span className="cursor-pointer transition-colors italic hover:underline text-primary">View all posts →</span>}>
            <DashboardList>
              <DashboardListItem title="TikTok — ClubRM Valentine" subtitle="567 likes • 78 comments" metadata="8.2K imp" icon={<Heart className="h-4 w-4 text-primary" />} />
              <DashboardListItem title="LinkedIn — Exec Spotlight" subtitle="156 likes • 23 comments" metadata="4.5K imp" icon={<Share2 className="h-4 w-4 text-blue-400" />} />
            </DashboardList>
          </Widget>
        )
      case "scheduled-posts":
        return (
          <Widget title="Scheduled Posts">
            <DashboardList>
              <DashboardListItem title="Instagram — Meet the team" subtitle="Feb 18" metadata="IG" icon={<Megaphone className="h-4 w-4 text-primary" />} />
            </DashboardList>
            <div className="mt-4 p-3 bg-muted/30 rounded-xl text-center">
               <p className="text-[10px] font-bold uppercase text-primary">New Campaign Required</p>
            </div>
          </Widget>
        )
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Campaign Insights</h2>
          <p className="text-sm text-muted-foreground font-medium">Manage your outreach and brand visibility.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Resolved: Replaced manual buttons with the refactored DashboardControls */}
          <DashboardControls 
            defaultWidgets={MARKETING_DEFAULT_WIDGETS} 
            widgetTitles={MARKETING_WIDGET_TITLES} 
          />
        </div>
      </div>

      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500", isCustomizing && "scale-[0.98] blur-[0.5px]")}>
        {layout.map((id) => (
          <SortableWidget key={id} id={id} isCustomizing={isCustomizing}>
            {renderWidget(id)}
          </SortableWidget>
        ))}
      </div>
    </div>
  )
}