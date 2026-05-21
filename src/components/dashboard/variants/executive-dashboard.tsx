import { StatCard } from "../stat-card"
import { Widget } from "../widget"
import { ProgressBar } from "../progress-bar"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { CheckSquare, Calendar, Clock } from "lucide-react"
import { DashboardLayoutProvider, useDashboardLayout } from "../customization/dashboard-layout-provider"
import { SortableWidget } from "../customization/sortable-widget"
import { cn } from "@/lib/utils"
import { useTasks } from "@/context/tasks-context"
import { useEvents } from "@/context/events-context"
import { useAuth } from "@/context/auth-context"
import { useMemo } from "react"
import { DashboardControls } from "../customization/dashboard-controls"
import { EXECUTIVE_WIDGET_TITLES, EXECUTIVE_DEFAULT_WIDGETS } from "../widget-config"

export function ExecutiveDashboard() {
  return (
    <DashboardLayoutProvider role="Executive" defaultWidgets={EXECUTIVE_DEFAULT_WIDGETS}>
      <ExecutiveDashboardContent />
    </DashboardLayoutProvider>
  )
}

function ExecutiveDashboardContent() {
  const { isCustomizing, layout, visibleWidgets } = useDashboardLayout()
  const { tasks } = useTasks()
  const { events } = useEvents()
  const { user } = useAuth()

  // Mock ID if user not logged in for demo purposes, 
  // but in real app we'd use user.id
  const userId = user?.id || "m1" 

  const myTasks = useMemo(() => tasks.filter(t => t.assignees.includes(userId)), [tasks, userId])
  const myEvents = useMemo(() => events.filter(e => e.collaborators.includes(userId)), [events, userId])
  const upcomingEvents = useMemo(() => events.filter(e => new Date(e.startDate) > new Date()).slice(0, 3), [events])

  const renderWidget = (id: string) => {
    if (!visibleWidgets.has(id)) return null

    switch (id) {
      case "my-tasks":
        return (
          <StatCard
            title="My Tasks"
            value={myTasks.length.toString()}
            description={`${myTasks.filter(t => t.status !== 'done').length} pending tasks`}
            trend={{ value: myTasks.filter(t => t.status === 'done').length, label: "completed tasks" }}
            icon={<CheckSquare className="h-5 w-5" />}
          />
        )
      case "events-attending":
        return (
          <StatCard
            title="Events Attending"
            value={myEvents.length.toString()}
            description="Collaborating or attending"
            icon={<Calendar className="h-5 w-5" />}
          />
        )
      case "hours-this-month":
        return (
          <StatCard
            title="Work Focus"
            value={myTasks.length > 0 ? "Active" : "Idle"}
            description={`${myTasks.filter(k => k.priority === 'urgent' || k.priority === 'high').length} high priority`}
            icon={<Clock className="h-5 w-5" />}
          />
        )
      case "task-progress":
        return (
          <Widget title="My Task Progress" fullWidth>
            <div className="space-y-3">
              {myTasks.slice(0, 6).map(task => {
                const completedSubtasks = task.subtasks.filter(s => s.done).length
                const progress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : (task.status === 'done' ? 100 : 0)
                return (
                  <ProgressBar 
                    key={task.id}
                    value={progress} 
                    label={task.title} 
                    subLabel={task.status.replace('_', ' ')} 
                    color={task.status === "done" ? "emerald" : "default"} 
                  />
                )
              })}
              {myTasks.length === 0 && <p className="text-sm text-muted-foreground italic">No tasks assigned to you</p>}
            </div>
          </Widget>
        )
      case "upcoming-events":
        return (
          <Widget title="Upcoming Events" footer={<span className="cursor-pointer hover:text-primary transition-colors italic">View full calendar →</span>}>
            <DashboardList>
              {upcomingEvents.map(event => (
                <DashboardListItem
                  key={event.id}
                  title={event.title}
                  subtitle={`${new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • ${event.location}`}
                  metadata={myEvents.some(e => e.id === event.id) ? "Attending" : "Open"}
                  icon={<Calendar className="h-4 w-4" />}
                />
              ))}
              {upcomingEvents.length === 0 && <p className="text-sm text-muted-foreground italic p-4 text-center">No upcoming events</p>}
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
          <h2 className="text-xl font-semibold tracking-tight">Executive Status</h2>
          <p className="text-sm text-muted-foreground">Track your tasks and upcoming events.</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardControls
            defaultWidgets={EXECUTIVE_DEFAULT_WIDGETS}
            widgetTitles={EXECUTIVE_WIDGET_TITLES}
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
