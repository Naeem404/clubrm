import { type Task, PRIORITY_CONFIG, getTag, getMember, getColumn } from "./types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, CheckCircle2, ArrowRight } from "lucide-react"
import { format, isPast, isToday } from "date-fns"

interface TaskCardProps {
  task: Task
  onClick?: (task: Task) => void
  compact?: boolean
  isDragging?: boolean
}

export function TaskCard({ task, onClick, compact = false, isDragging = false }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]
  const column = getColumn(task.status)
  const completedSubtasks = task.subtasks.filter((s) => s.done).length
  const totalSubtasks = task.subtasks.length
  const isOverdue = task.dueDate && isPast(task.dueDate) && task.status !== "done"
  const isDueToday = task.dueDate && isToday(task.dueDate)

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(task)}
        className={cn(
          "w-full text-left rounded-xl border border-border/50 bg-card/95 p-2.5 transition-all duration-150",
          "hover:border-primary/25 hover:bg-card hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          isDragging && "shadow-xl rotate-2 scale-105 opacity-90 z-50"
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priority.dotColor)} />
          <span className="text-xs font-medium truncate">{task.title}</span>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick?.(task)}
      className={cn(
        "group w-full text-left rounded-2xl border border-border/50 bg-card/95 p-4 transition-all duration-200",
        "hover:border-primary/25 hover:bg-card hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        isDragging && "shadow-2xl rotate-1 scale-105 opacity-90 z-50 border-primary/50"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", column.dotColor)} />
          <span className={cn("truncate text-[11px] font-semibold uppercase tracking-[0.16em]", column.id === "done" ? "text-emerald-400" : "text-muted-foreground")}>
            {column.title}
          </span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
      </div>

      {/* Priority & Tags row */}
      <div className="mb-3 flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold border uppercase tracking-wide",
            priority.color
          )}
        >
          {priority.label}
        </span>
        {task.tags.slice(0, 2).map((tagId) => {
          const tag = getTag(tagId)
          if (!tag) return null
          return (
            <span
              key={tagId}
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border",
                tag.color
              )}
            >
              {tag.name}
            </span>
          )
        })}
        {task.tags.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
        )}
      </div>

      {/* Title */}
      <h4 className={cn(
        "mb-1 text-sm font-semibold leading-snug",
        task.status === "done" && "line-through text-muted-foreground"
      )}>
        {task.title}
      </h4>

      {task.description && (
        <p className="mb-3 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
          {task.description}
        </p>
      )}

      {/* Subtasks progress */}
      {totalSubtasks > 0 && (
        <div className="mb-3 rounded-xl border border-border/40 bg-background/50 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Progress
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" />
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                completedSubtasks === totalSubtasks ? "bg-emerald-500" : column.dotColor
              )}
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Due date */}
        <div className="flex items-center gap-1.5">
          {task.dueDate && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium",
                isOverdue
                  ? "bg-red-500/15 text-red-400"
                  : isDueToday
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(task.dueDate, "MMM d")}
            </span>
          )}
        </div>

        {/* Assignee avatars */}
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
    </button>
  )
}
