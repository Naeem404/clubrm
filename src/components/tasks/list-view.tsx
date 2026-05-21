import { useMemo, useState } from "react"
import { useTasks } from "@/context/tasks-context"
import { type Task, PRIORITY_CONFIG, getTag, getMember, getColumn } from "./types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { format, isPast, isToday } from "date-fns"
import { ChevronDown, ChevronRight, Calendar, ArrowUpDown, SearchX } from "lucide-react"

interface ListViewProps {
  onTaskClick: (task: Task) => void
  filterAssignee: string | null
  filterPriority: string | null
  groupBy: "status" | "priority" | "assignee" | "section"
  searchQuery?: string
}

type SortKey = "title" | "priority" | "dueDate" | "status"
type SortDir = "asc" | "desc"

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const STATUS_ORDER: Record<string, number> = { backlog: 0, todo: 1, in_progress: 2, in_review: 3, done: 4 }

export function ListView({ onTaskClick, filterAssignee, filterPriority, groupBy, searchQuery = "" }: ListViewProps) {
  const { tasks, moveTask } = useTasks()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("priority")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterAssignee && !t.assignees.includes(filterAssignee)) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [tasks, filterAssignee, filterPriority, searchQuery])

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title)
          break
        case "priority":
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
          break
        case "dueDate":
          cmp = (a.dueDate?.getTime() || Infinity) - (b.dueDate?.getTime() || Infinity)
          break
        case "status":
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [filteredTasks, sortKey, sortDir])

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; color: string; dotColor: string; tasks: Task[] }>()

    sortedTasks.forEach((task) => {
      let key: string
      let label: string
      let color: string
      let dotColor: string

      switch (groupBy) {
        case "status": {
          const col = getColumn(task.status)
          key = task.status
          label = col.title
          color = col.color
          dotColor = col.dotColor
          break
        }
        case "priority": {
          const p = PRIORITY_CONFIG[task.priority]
          key = task.priority
          label = `${p.icon} ${p.label}`
          color = p.color
          dotColor = p.dotColor
          break
        }
        case "assignee": {
          if (task.assignees.length === 0) {
            key = "unassigned"
            label = "Unassigned"
            color = "bg-muted text-muted-foreground border-border"
            dotColor = "bg-muted-foreground"
          } else {
            const member = getMember(task.assignees[0])
            key = task.assignees[0]
            label = member?.name || "Unknown"
            color = "bg-primary/10 text-primary border-primary/30"
            dotColor = "bg-primary"
          }
          break
        }
        case "section": {
          key = task.section || "No Section"
          label = task.section || "No Section"
          color = "bg-muted text-muted-foreground border-border"
          dotColor = "bg-muted-foreground"
          break
        }
      }

      if (!map.has(key)) {
        map.set(key, { label, color, dotColor, tasks: [] })
      }
      map.get(key)!.tasks.push(task)
    })

    return map
  }, [sortedTasks, groupBy])

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const handleToggleDone = (task: Task) => {
    moveTask(task.id, task.status === "done" ? "todo" : "done")
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col h-full shadow-sm">
      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_120px_120px_100px_100px] gap-2 px-4 py-3 border-b border-border/50 bg-muted/25 text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">
        <div />
        <button onClick={() => handleSort("title")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
          Task {sortKey === "title" && <ArrowUpDown className="h-3 w-3" />}
        </button>
        <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          Status {sortKey === "status" && <ArrowUpDown className="h-3 w-3" />}
        </button>
        <button onClick={() => handleSort("priority")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          Priority {sortKey === "priority" && <ArrowUpDown className="h-3 w-3" />}
        </button>
        <button onClick={() => handleSort("dueDate")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          Due {sortKey === "dueDate" && <ArrowUpDown className="h-3 w-3" />}
        </button>
        <div>Assignee</div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-auto">
        {sortedTasks.length === 0 && (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
            <SearchX className="h-5 w-5 text-muted-foreground/60" />
            <p className="text-sm font-semibold">No tasks match these filters</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Try changing the assignee, priority, or search input to widen the list view.
            </p>
          </div>
        )}
        {Array.from(groups.entries()).map(([key, group]) => {
          const isCollapsed = collapsedGroups.has(key)
          return (
            <div key={key}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/15 border-b border-border/30 hover:bg-muted/35 transition-colors text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <div className={cn("h-2 w-2 rounded-full", group.dotColor)} />
                <span className="text-sm font-semibold">{group.label}</span>
                <span className="text-xs text-muted-foreground ml-1">({group.tasks.length})</span>
              </button>

              {/* Tasks */}
              {!isCollapsed &&
                group.tasks.map((task) => {
                  const priority = PRIORITY_CONFIG[task.priority]
                  const column = getColumn(task.status)
                  const isOverdue = task.dueDate && isPast(task.dueDate) && task.status !== "done"
                  const isDueToday = task.dueDate && isToday(task.dueDate)

                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-[40px_1fr_120px_120px_100px_100px] gap-2 px-4 py-3 border-b border-border/20 hover:bg-muted/20 transition-colors group cursor-pointer items-center"
                      onClick={() => onTaskClick(task)}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleDone(task)
                        }}
                      >
                        <Checkbox checked={task.status === "done"} />
                      </div>

                      {/* Title + tags */}
                      <div className="min-w-0">
                        <div className={cn(
                          "text-sm font-medium truncate",
                          task.status === "done" && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </div>
                        {task.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {task.tags.slice(0, 3).map((tagId) => {
                              const tag = getTag(tagId)
                              if (!tag) return null
                              return (
                                <span key={tagId} className={cn("text-[9px] px-1 py-px rounded-full border font-medium", tag.color)}>
                                  {tag.name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit", column.color)}>
                        {column.title}
                      </span>

                      {/* Priority */}
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit", priority.color)}>
                        {priority.icon} {priority.label}
                      </span>

                      {/* Due date */}
                      <div>
                        {task.dueDate ? (
                          <span
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-medium",
                              isOverdue ? "text-red-400" : isDueToday ? "text-amber-400" : "text-muted-foreground"
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {format(task.dueDate, "MMM d")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">—</span>
                        )}
                      </div>

                      {/* Assignees */}
                      <div className="flex -space-x-1.5">
                        {task.assignees.slice(0, 3).map((id) => {
                          const member = getMember(id)
                          if (!member) return null
                          return (
                            <Avatar key={id} className="h-6 w-6 border-2 border-card" title={member.name}>
                              <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                          )
                        })}
                        {task.assignees.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
