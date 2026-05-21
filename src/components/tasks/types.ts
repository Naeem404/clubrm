export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done"
export type TaskPriority = "urgent" | "high" | "medium" | "low"
export type TaskView = "board" | "list" | "timeline" | "calendar" | "workflow"

export interface TaskColumn {
  id: TaskStatus
  title: string
  color: string
  dotColor: string
}

export const TASK_COLUMNS: TaskColumn[] = [
  { id: "backlog", title: "Backlog", color: "bg-slate-500/15 text-slate-400 border-slate-500/30", dotColor: "bg-slate-500" },
  { id: "todo", title: "To Do", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", dotColor: "bg-blue-500" },
  { id: "in_progress", title: "In Progress", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dotColor: "bg-amber-500" },
  { id: "in_review", title: "In Review", color: "bg-violet-500/15 text-violet-400 border-violet-500/30", dotColor: "bg-violet-500" },
  { id: "done", title: "Done", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
]

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dotColor: string; icon: string }> = {
  urgent: { label: "Urgent", color: "bg-red-500/15 text-red-400 border-red-500/30", dotColor: "bg-red-500", icon: "🔴" },
  high: { label: "High", color: "bg-orange-500/15 text-orange-400 border-orange-500/30", dotColor: "bg-orange-500", icon: "🟠" },
  medium: { label: "Medium", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dotColor: "bg-amber-500", icon: "🟡" },
  low: { label: "Low", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500", icon: "🟢" },
}

export interface TaskTag {
  id: string
  name: string
  color: string
}

export const TASK_TAGS: TaskTag[] = [
  { id: "bug", name: "Bug", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { id: "feature", name: "Feature", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { id: "design", name: "Design", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  { id: "marketing", name: "Marketing", color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { id: "finance", name: "Finance", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { id: "logistics", name: "Logistics", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { id: "content", name: "Content", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { id: "outreach", name: "Outreach", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
]

export interface TaskMember {
  id: string
  name: string
  initials: string
  role: string
  avatar?: string
}

export const TASK_MEMBERS: TaskMember[] = [
  { id: "m1", name: "John Doe", initials: "JD", role: "President" },
  { id: "m2", name: "Sarah Smith", initials: "SS", role: "VP Events" },
  { id: "m3", name: "Mike Johnson", initials: "MJ", role: "VP Internal" },
  { id: "m4", name: "Emily Chen", initials: "EC", role: "VP Finance" },
  { id: "m5", name: "Alex Brown", initials: "AB", role: "VP External" },
  { id: "m6", name: "Lisa Wang", initials: "LW", role: "Marketing" },
  { id: "m7", name: "Tom Davis", initials: "TD", role: "Executive" },
  { id: "m8", name: "Rachel Kim", initials: "RK", role: "Executive" },
  { id: "m9", name: "David Park", initials: "DP", role: "Executive" },
  { id: "m10", name: "Nina Patel", initials: "NP", role: "Executive" },
]

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignees: string[]
  tags: string[]
  dueDate: Date | null
  startDate: Date | null
  createdAt: Date
  completedAt: Date | null
  dependencies: string[]
  subtasks: { id: string; title: string; done: boolean }[]
  section?: string
}

export interface WorkflowNode {
  id: string
  label: string
  status: TaskStatus
  x: number
  y: number
  connections: string[]
}



export function getColumn(status: TaskStatus): TaskColumn {
  return TASK_COLUMNS.find((c) => c.id === status) || TASK_COLUMNS[0]
}

export function getTag(tagId: string): TaskTag | undefined {
  return TASK_TAGS.find((t) => t.id === tagId)
}

export function getMember(id: string): TaskMember | undefined {
  return TASK_MEMBERS.find((m) => m.id === id)
}
