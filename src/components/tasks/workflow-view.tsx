import { useMemo } from "react"
import { useTasks } from "@/context/tasks-context"
import { type Task, type TaskStatus, TASK_COLUMNS, PRIORITY_CONFIG } from "./types"
import { cn } from "@/lib/utils"
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, Zap } from "lucide-react"

interface WorkflowViewProps {
  onTaskClick: (task: Task) => void
  filterAssignee: string | null
  filterPriority: string | null
  searchQuery?: string
}

export function WorkflowView({ onTaskClick, filterAssignee, filterPriority, searchQuery = "" }: WorkflowViewProps) {
  const { tasks } = useTasks()

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterAssignee && !t.assignees.includes(filterAssignee)) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [tasks, filterAssignee, filterPriority, searchQuery])

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    }
    filteredTasks.forEach((t) => counts[t.status]++)
    return counts
  }, [filteredTasks])

  const totalTasks = filteredTasks.length
  const completedTasks = statusCounts.done
  const inProgressTasks = statusCounts.in_progress + statusCounts.in_review
  const blockedTasks = filteredTasks.filter(
    (t) => t.priority === "urgent" && t.status !== "done"
  ).length

  const avgCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const bottlenecks = useMemo(() => {
    const issues: { label: string; severity: "high" | "medium"; description: string }[] = []

    if (statusCounts.in_review > 3) {
      issues.push({
        label: "Review Bottleneck",
        severity: "high",
        description: `${statusCounts.in_review} tasks stuck in review`,
      })
    }
    if (blockedTasks > 2) {
      issues.push({
        label: "Urgent Tasks Pile-up",
        severity: "high",
        description: `${blockedTasks} urgent tasks still open`,
      })
    }
    if (statusCounts.backlog > 5) {
      issues.push({
        label: "Large Backlog",
        severity: "medium",
        description: `${statusCounts.backlog} tasks in backlog need triage`,
      })
    }
    if (statusCounts.in_progress > 4) {
      issues.push({
        label: "WIP Limit Exceeded",
        severity: "medium",
        description: `${statusCounts.in_progress} tasks in progress (recommended: ≤4)`,
      })
    }

    return issues
  }, [statusCounts, blockedTasks])

  const getFlowRate = (status: TaskStatus): string => {
    const count = statusCounts[status]
    if (count === 0) return "empty"
    if (count <= 2) return "low"
    if (count <= 4) return "medium"
    return "high"
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-auto">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
          </div>
          <div className="text-3xl font-bold">{totalTasks}</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
          </div>
          <div className="text-3xl font-bold text-amber-400">{inProgressTasks}</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">{completedTasks}</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Completion</span>
          </div>
          <div className="text-3xl font-bold">{avgCompletionRate}%</div>
          <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${avgCompletionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Workflow pipeline visualization */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          Workflow Pipeline
        </h3>
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
          {TASK_COLUMNS.map((column, idx) => {
            const count = statusCounts[column.id]
            const flowRate = getFlowRate(column.id)
            const columnTasks = filteredTasks
              .filter((t) => t.status === column.id)
              .sort((a, b) => {
                const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
                return po[a.priority] - po[b.priority]
              })

            return (
              <div key={column.id} className="flex items-stretch flex-1">
                {/* Column */}
                <div className="flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("h-3 w-3 rounded-full", column.dotColor)} />
                    <span className="text-sm font-semibold">{column.title}</span>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded-full",
                      count === 0 ? "bg-muted text-muted-foreground" : column.color
                    )}>
                      {count}
                    </span>
                  </div>

                  {/* Flow indicator */}
                  <div className={cn(
                    "h-2 rounded-full mb-3 transition-all",
                    flowRate === "empty" && "bg-muted/50",
                    flowRate === "low" && "bg-emerald-500/30",
                    flowRate === "medium" && "bg-amber-500/30",
                    flowRate === "high" && "bg-red-500/30"
                  )}>
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        flowRate === "empty" && "bg-muted",
                        flowRate === "low" && "bg-emerald-500",
                        flowRate === "medium" && "bg-amber-500",
                        flowRate === "high" && "bg-red-500"
                      )}
                      style={{ width: totalTasks > 0 ? `${(count / totalTasks) * 100}%` : "0%" }}
                    />
                  </div>

                  {/* Tasks in this stage */}
                  <div className="space-y-1.5 min-h-[80px]">
                    {columnTasks.slice(0, 4).map((task) => {
                      const priority = PRIORITY_CONFIG[task.priority]
                      return (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={cn(
                          "w-full text-left rounded-lg border p-2.5 text-[11px] transition-all",
                            "hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5",
                            column.color
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priority.dotColor)} />
                            <span className="truncate font-medium">{task.title}</span>
                          </div>
                        </button>
                      )
                    })}
                    {columnTasks.length > 4 && (
                      <div className="text-[10px] text-muted-foreground text-center py-1">
                        +{columnTasks.length - 4} more
                      </div>
                    )}
                    {columnTasks.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/50 text-center py-4">
                        Empty
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow between columns */}
                {idx < TASK_COLUMNS.length - 1 && (
                  <div className="flex items-center px-2 pt-8">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottlenecks & Insights */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Bottlenecks & Alerts
          </h3>
          {bottlenecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-sm">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2" />
              All clear! No bottlenecks detected.
            </div>
          ) : (
            <div className="space-y-2">
              {bottlenecks.map((issue, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg border p-3",
                    issue.severity === "high"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-amber-500/10 border-amber-500/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        "h-3.5 w-3.5",
                        issue.severity === "high" ? "text-red-400" : "text-amber-400"
                      )}
                    />
                    <span className="text-sm font-semibold">{issue.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-5.5">
                    {issue.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribution chart */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Priority Distribution
          </h3>
          <div className="space-y-3">
            {(["urgent", "high", "medium", "low"] as const).map((p) => {
              const config = PRIORITY_CONFIG[p]
              const count = filteredTasks.filter((t) => t.priority === p).length
              const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0
              return (
                <div key={p} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {config.icon} {config.label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {count} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", config.dotColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
