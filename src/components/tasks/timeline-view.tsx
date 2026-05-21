import { useMemo, useRef } from "react"
import { useTasks } from "@/context/tasks-context"
import { type Task, PRIORITY_CONFIG, getColumn, getMember } from "./types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarRange } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  format,
  isToday,
  isSameMonth,
  isWeekend,
} from "date-fns"

interface TimelineViewProps {
  currentDate: Date
  onTaskClick: (task: Task) => void
  filterAssignee: string | null
  filterPriority: string | null
  searchQuery?: string
}

export function TimelineView({
  currentDate,
  onTaskClick,
  filterAssignee,
  filterPriority,
  searchQuery = "",
}: TimelineViewProps) {
  const { tasks } = useTasks()
  const scrollRef = useRef<HTMLDivElement>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const totalDays = days.length

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (filterAssignee && !t.assignees.includes(filterAssignee)) return false
        if (filterPriority && t.priority !== filterPriority) return false
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
        if (!t.startDate && !t.dueDate) return false
        return true
      })
      .sort((a, b) => {
        const aStart = a.startDate || a.dueDate || new Date()
        const bStart = b.startDate || b.dueDate || new Date()
        return aStart.getTime() - bStart.getTime()
      })
  }, [tasks, filterAssignee, filterPriority, searchQuery])

  const getBarPosition = (task: Task) => {
    const start = task.startDate || task.dueDate || monthStart
    const end = task.dueDate || task.startDate || monthEnd

    const startOffset = Math.max(differenceInDays(start, monthStart), 0)
    const endOffset = Math.min(differenceInDays(end, monthStart), totalDays - 1)
    const duration = Math.max(endOffset - startOffset + 1, 1)

    const left = (startOffset / totalDays) * 100
    const width = (duration / totalDays) * 100

    return { left: `${left}%`, width: `${width}%` }
  }

  const getDependencyLine = (task: Task) => {
    if (task.dependencies.length === 0) return null
    const depTask = filteredTasks.find((t) => t.id === task.dependencies[0])
    if (!depTask) return null

    const depEnd = depTask.dueDate || depTask.startDate || monthStart
    const taskStart = task.startDate || task.dueDate || monthStart

    const depEndOffset = Math.min(differenceInDays(depEnd, monthStart), totalDays - 1)
    const taskStartOffset = Math.max(differenceInDays(taskStart, monthStart), 0)

    const depRow = filteredTasks.indexOf(depTask)
    const taskRow = filteredTasks.indexOf(task)

    if (depRow === -1 || taskRow === -1) return null

    return { depEndOffset, taskStartOffset, depRow, taskRow }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col h-full shadow-sm">
      {/* Month header */}
      <div className="border-b border-border/50 px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarRange className="h-4 w-4 text-primary" />
          {format(currentDate, "MMMM yyyy")}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Task labels */}
        <div className="w-[260px] shrink-0 border-r border-border/50 overflow-auto">
          <div className="h-10 border-b border-border/30 px-3 flex items-center bg-muted/10">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</span>
          </div>
          {filteredTasks.map((task) => {
            const priority = PRIORITY_CONFIG[task.priority]
            const column = getColumn(task.status)
            return (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full h-12 border-b border-border/20 px-3 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", column.dotColor)} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{task.title}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn("text-[9px] px-1 py-px rounded border", priority.color)}>
                      {priority.label}
                    </span>
                    <div className="flex -space-x-1">
                      {task.assignees.slice(0, 2).map((id) => {
                        const member = getMember(id)
                        if (!member) return null
                        return (
                          <Avatar key={id} className="h-4 w-4 border border-card">
                            <AvatarFallback className="bg-primary/10 text-primary text-[7px]">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          {filteredTasks.length === 0 && (
            <div className="flex h-28 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-muted-foreground">
              <CalendarRange className="h-4 w-4 text-muted-foreground/60" />
              <span className="font-medium text-foreground/80">No dated tasks</span>
              <span>Add start or due dates to see work plotted on the timeline.</span>
            </div>
          )}
        </div>

        {/* Timeline grid */}
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          {/* Day headers */}
          <div className="flex h-10 border-b border-border/30 sticky top-0 bg-card z-10">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 min-w-[32px] flex items-center justify-center border-r border-border/20 text-[10px]",
                  isToday(day) && "bg-primary/10",
                  isWeekend(day) && "bg-muted/30"
                )}
              >
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-muted-foreground">{format(day, "EEE")}</span>
                  <span className={cn("font-bold", isToday(day) && "text-primary")}>
                    {format(day, "d")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Task bars */}
          <div className="relative">
            {/* Grid lines */}
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "absolute top-0 bottom-0 border-r border-border/10",
                  isToday(day) && "border-primary/30 bg-primary/5",
                  isWeekend(day) && "bg-muted/10"
                )}
                style={{
                  left: `${(differenceInDays(day, monthStart) / totalDays) * 100}%`,
                  width: `${(1 / totalDays) * 100}%`,
                }}
              />
            ))}

            {/* Today indicator */}
            {isSameMonth(new Date(), currentDate) && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-primary z-20"
                style={{
                  left: `${(differenceInDays(new Date(), monthStart) / totalDays) * 100}%`,
                }}
              />
            )}

            {filteredTasks.map((task, idx) => {
              const pos = getBarPosition(task)
              const column = getColumn(task.status)
              const dep = getDependencyLine(task)

              return (
                <div key={task.id} className="h-12 relative border-b border-border/10">
                  {/* Dependency arrow */}
                  {dep && (
                    <svg
                      className="absolute inset-0 pointer-events-none z-10"
                      style={{ overflow: "visible" }}
                    >
                      <line
                        x1={`${((dep.depEndOffset + 0.5) / totalDays) * 100}%`}
                        y1={`${(dep.depRow - idx) * 48 + 24}px`}
                        x2={`${((dep.taskStartOffset + 0.5) / totalDays) * 100}%`}
                        y2="24px"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        className="text-muted-foreground/30"
                        markerEnd="url(#arrow)"
                      />
                    </svg>
                  )}

                  {/* Bar */}
                  <button
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      "absolute top-2 h-8 rounded-lg border flex items-center px-2.5 text-[11px] font-medium truncate transition-all",
                      "hover:shadow-lg hover:shadow-primary/10 hover:z-20 hover:scale-y-110",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50",
                      column.color
                    )}
                    style={{ left: pos.left, width: pos.width, minWidth: "24px" }}
                  >
                    <span className="truncate">{task.title}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* SVG defs for arrows */}
      <svg className="absolute" width="0" height="0">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="text-muted-foreground/30" />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
