import { useState, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useTasks } from "@/context/tasks-context"
import {
  type Task,
  type TaskStatus,
  type TaskView,
  TASK_MEMBERS,
  PRIORITY_CONFIG,
  type TaskPriority,
} from "./types"
import { BoardView } from "./board-view"
import { ListView } from "./list-view"
import { TimelineView } from "./timeline-view"
import { TaskCalendarView } from "./calendar-view"
import { WorkflowView } from "./workflow-view"
import { TaskModal } from "./task-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Kanban,
  List,
  GanttChart,
  CalendarDays,
  Workflow,
  Filter,
  X,
  Users,
  Flag,
  LayoutGrid,
  Search,
  Sparkles,
  SlidersHorizontal,
  ClipboardList,
  CircleDot,
} from "lucide-react"
import { format, addMonths } from "date-fns"

export function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks()

  const [view, setView] = useState<TaskView>("board")
  const [currentDate, setCurrentDate] = useState(new Date())

  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get("search") || ""

  const handleSearchChange = (val: string) => {
    setSearchParams(prev => {
      if (val) prev.set("search", val)
      else prev.delete("search")
      return prev
    }, { replace: true })
  }

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo")

  // Filters
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // List view groupBy
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "assignee" | "section">("status")

  const handleCreateTask = useCallback((status?: TaskStatus) => {
    setEditingTask(null)
    setDefaultStatus(status || "todo")
    setModalOpen(true)
  }, [])

  const handleTaskClick = useCallback((task: Task) => {
    setEditingTask(task)
    setModalOpen(true)
  }, [])

  const handleSaveTask = useCallback(
    (task: Task) => {
      if (editingTask) {
        updateTask(task)
      } else {
        addTask(task)
      }
    },
    [editingTask, updateTask, addTask]
  )

  const handleDeleteTask = useCallback(
    (id: string) => {
      deleteTask(id)
    },
    [deleteTask]
  )

  const views: { value: TaskView; label: string; icon: React.ReactNode }[] = [
    { value: "board", label: "Board", icon: <Kanban className="h-3.5 w-3.5" /> },
    { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> },
    { value: "timeline", label: "Timeline", icon: <GanttChart className="h-3.5 w-3.5" /> },
    { value: "calendar", label: "Calendar", icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { value: "workflow", label: "Workflow", icon: <Workflow className="h-3.5 w-3.5" /> },
  ]

  const hasFilters = filterAssignee || filterPriority
  const activeTaskCount = useMemo(() => tasks.filter((task) => task.status !== "done").length, [tasks])
  const urgentTaskCount = useMemo(() => tasks.filter((task) => task.priority === "urgent" && task.status !== "done").length, [tasks])
  const doneTaskCount = useMemo(() => tasks.filter((task) => task.status === "done").length, [tasks])

  const viewDescriptions: Record<TaskView, string> = {
    board: "Plan work by lane and keep momentum visible at a glance.",
    list: "Scan priorities quickly with a structured operational view.",
    timeline: "Track due dates and sequencing across the month.",
    calendar: "See delivery load against the calendar in one place.",
    workflow: "Visualize task flow and dependencies with more context.",
  }

  return (
    <div className="flex h-full flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_32%),radial-gradient(circle_at_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Task Command Center
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {view} view
                </p>
              </div>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                Plan, track, and review execution without wasting space on decoration.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{viewDescriptions[view]}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[430px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur">
              <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                Active
              </p>
              <p className="mt-1.5 text-xl font-bold tracking-tight">{activeTaskCount}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">tasks still in motion</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-background/70 p-3 backdrop-blur">
              <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-amber-400">
                <CircleDot className="h-3.5 w-3.5" />
                Urgent
              </p>
              <p className="mt-1.5 text-xl font-bold tracking-tight">{urgentTaskCount}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">need immediate attention</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-background/70 p-3 backdrop-blur">
              <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-400">
                <Workflow className="h-3.5 w-3.5" />
                Done
              </p>
              <p className="mt-1.5 text-xl font-bold tracking-tight">{doneTaskCount}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">completed tasks logged</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-card/85 p-3.5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-10 rounded-xl border-border/60 bg-background/70 pl-10"
              />
            </div>

            {(view === "timeline" || view === "calendar") && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 px-2 py-1.5 lg:min-w-[180px]">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setCurrentDate((d) => addMonths(d, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground min-w-[100px] text-center">
                  {format(currentDate, "MMM yyyy")}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={hasFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-10 gap-2 rounded-xl"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {hasFilters && (
                  <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                    {(filterAssignee ? 1 : 0) + (filterPriority ? 1 : 0)}
                  </span>
                )}
              </Button>

              {view === "list" && (
                <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/70 p-1">
                  <LayoutGrid className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                  {(["status", "priority", "assignee", "section"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroupBy(g)}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-[11px] font-medium capitalize transition-all",
                        groupBy === g
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl border border-border/60 bg-background/70 p-1">
                {views.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setView(v.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                      view === v.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v.icon}
                    {v.label}
                  </button>
                ))}
              </div>

              <Button onClick={() => handleCreateTask()} size="sm" className="h-10 gap-2 rounded-xl px-4 shadow-lg shadow-primary/15">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? `Searching for "${searchQuery}"` : "Use views and filters to shape the workspace."}
            </p>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      {showFilters && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 rounded-2xl border border-border/50 bg-card/85 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
          {/* Assignee filter */}
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Assignee:</span>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterAssignee(null)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
                  !filterAssignee
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {TASK_MEMBERS.slice(0, 6).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setFilterAssignee(filterAssignee === m.id ? null : m.id)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
                    filterAssignee === m.id
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m.initials}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Priority:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterPriority(null)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
                  !filterPriority
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(
                ([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterPriority(filterPriority === key ? null : key)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
                      filterPriority === key
                        ? cn(config.color)
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {config.icon} {config.label}
                  </button>
                )
              )}
            </div>
          </div>

          {hasFilters && (
            <>
              <div className="h-4 w-px bg-border" />
              <button
                onClick={() => {
                  setFilterAssignee(null)
                  setFilterPriority(null)
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </>
          )}
          </div>
        </div>
      )}

      {/* View content */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-3 shadow-sm backdrop-blur">
        {view === "board" && (
          <BoardView
            onTaskClick={handleTaskClick}
            onCreateTask={handleCreateTask}
            filterAssignee={filterAssignee}
            filterPriority={filterPriority}
            searchQuery={searchQuery}
          />
        )}
        {view === "list" && (
          <ListView
            onTaskClick={handleTaskClick}
            filterAssignee={filterAssignee}
            filterPriority={filterPriority}
            groupBy={groupBy}
            searchQuery={searchQuery}
          />
        )}
        {view === "timeline" && (
          <TimelineView
            currentDate={currentDate}
            onTaskClick={handleTaskClick}
            filterAssignee={filterAssignee}
            filterPriority={filterPriority}
            searchQuery={searchQuery}
          />
        )}
        {view === "calendar" && (
          <TaskCalendarView
            currentDate={currentDate}
            onTaskClick={handleTaskClick}
            filterAssignee={filterAssignee}
            filterPriority={filterPriority}
            searchQuery={searchQuery}
          />
        )}
        {view === "workflow" && (
          <WorkflowView
            onTaskClick={handleTaskClick}
            filterAssignee={filterAssignee}
            filterPriority={filterPriority}
            searchQuery={searchQuery}
          />
        )}
      </section>

      {/* Task modal */}
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editingTask}
        defaultStatus={defaultStatus}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  )
}
