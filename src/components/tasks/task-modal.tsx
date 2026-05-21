import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  type Task,
  type TaskStatus,
  type TaskPriority,
  TASK_COLUMNS,
  PRIORITY_CONFIG,
  TASK_TAGS,
  TASK_MEMBERS,
  getTag,
  getMember,
} from "./types"
import { cn } from "@/lib/utils"
import {
  Trash2,
  Plus,
  X,
  Calendar,
  AlignLeft,
  Users,
  Tag,
  Flag,
  Columns3,
  ListChecks,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
} from "lucide-react"
import { format } from "date-fns"

interface TaskModalProps {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultStatus?: TaskStatus
  onSave: (task: Task) => void
  onDelete?: (id: string) => void
}

export function TaskModal({
  open,
  onClose,
  task,
  defaultStatus,
  onSave,
  onDelete,
}: TaskModalProps) {
  const isEditing = !!task

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>("todo")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [assignees, setAssignees] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [dueDate, setDueDate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; done: boolean }[]>([])
  const [newSubtask, setNewSubtask] = useState("")
  const [section, setSection] = useState("")

  const [showAssignees, setShowAssignees] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState("")

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
      setStatus(task.status)
      setPriority(task.priority)
      setAssignees(task.assignees)
      setTags(task.tags)
      setDueDate(task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : "")
      setStartDate(task.startDate ? format(task.startDate, "yyyy-MM-dd") : "")
      setSubtasks([...task.subtasks])
      setSection(task.section || "")
    } else {
      setTitle("")
      setDescription("")
      setStatus(defaultStatus || "todo")
      setPriority("medium")
      setAssignees([])
      setTags([])
      setDueDate("")
      setStartDate("")
      setSubtasks([])
      setSection("")
    }
    setNewSubtask("")
    setShowAssignees(false)
    setShowTags(false)
    setAssigneeSearch("")
  }, [task, defaultStatus, open])

  const handleSave = () => {
    if (!title.trim()) return

    const newTask: Task = {
      id: task?.id || `t-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignees,
      tags,
      dueDate: dueDate ? new Date(`${dueDate}T23:59:59`) : null,
      startDate: startDate ? new Date(`${startDate}T00:00:00`) : null,
      createdAt: task?.createdAt || new Date(),
      completedAt: status === "done" ? (task?.completedAt || new Date()) : null,
      dependencies: task?.dependencies || [],
      subtasks,
      section: section || undefined,
    }

    onSave(newTask)
    onClose()
  }

  const toggleAssignee = (id: string) => {
    setAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const toggleTag = (tagId: string) => {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    setSubtasks((prev) => [
      ...prev,
      { id: `sub-${Date.now()}`, title: newSubtask.trim(), done: false },
    ])
    setNewSubtask("")
  }

  const toggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    )
  }

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const filteredMembers = TASK_MEMBERS.filter(
    (m) =>
      m.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      m.role.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  const completedSubtasks = subtasks.filter((s) => s.done).length
  const statusMeta = TASK_COLUMNS.find((column) => column.id === status) || TASK_COLUMNS[1]
  const priorityMeta = PRIORITY_CONFIG[priority]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Color accent based on priority */}
        <div
          className={cn(
            "h-1.5 w-full rounded-t-lg",
            PRIORITY_CONFIG[priority].dotColor
          )}
        />

        <DialogHeader className="px-6 pt-4 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {isEditing ? "Task Detail" : "New Task Draft"}
              </div>
              <DialogTitle className="text-xl">
                {isEditing ? "Edit Task" : "Create New Task"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEditing ? "Update the task details below." : "Fill in the details to create a new task."}
              </DialogDescription>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", statusMeta.dotColor)} />
                  <span className="text-sm font-medium">{statusMeta.title}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Priority</p>
                <p className="mt-2 text-sm font-medium">{priorityMeta.icon} {priorityMeta.label}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 overflow-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          <div className="space-y-5 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                className="h-11 text-base font-semibold border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Description</Label>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                className="flex w-full rounded-xl border border-input bg-transparent px-3 py-3 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Section
                </p>
                <p className="mt-2 text-sm font-medium">{section || "No section yet"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Assignees
                </p>
                <p className="mt-2 text-sm font-medium">{assignees.length || 0}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Subtasks
                </p>
                <p className="mt-2 text-sm font-medium">
                  {subtasks.length > 0 ? `${completedSubtasks}/${subtasks.length} done` : "No subtasks"}
                </p>
              </div>
            </div>

            {/* Status & Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Columns3 className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Status</Label>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {TASK_COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setStatus(col.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                        status === col.id
                          ? cn(col.color, "ring-1 ring-primary/30")
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn("h-2 w-2 rounded-full", col.dotColor)} />
                      {col.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Priority</Label>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(
                    ([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPriority(key)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                          priority === key
                            ? cn(config.color, "ring-1 ring-primary/30")
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {config.icon} {config.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Start Date</Label>
                </div>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Due Date</Label>
                </div>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Section</Label>
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Marketing, Engineering, Events..."
                className="h-9 text-xs"
              />
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTags(!showTags)}
                className="flex items-center gap-2 w-full rounded-xl border border-border/50 bg-muted/15 px-3 py-2"
              >
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium cursor-pointer">Tags</Label>
                {tags.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {tags.length} selected
                  </span>
                )}
                <ArrowRight className={cn("ml-1 h-3.5 w-3.5 text-muted-foreground transition-transform", showTags && "rotate-90")} />
              </button>

              {tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pl-4">
                  {tags.map((tagId) => {
                    const tag = getTag(tagId)
                    if (!tag) return null
                    return (
                      <Badge
                        key={tagId}
                        variant="outline"
                        className={cn("text-[11px] gap-1 cursor-pointer hover:opacity-80", tag.color)}
                        onClick={() => toggleTag(tagId)}
                      >
                        {tag.name}
                        <X className="h-3 w-3" />
                      </Badge>
                    )
                  })}
                </div>
              )}

              {showTags && (
                <div className="flex gap-2 flex-wrap pl-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {TASK_TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all",
                        tags.includes(tag.id)
                          ? cn(tag.color, "ring-2 ring-primary/30")
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAssignees(!showAssignees)}
                className="flex items-center gap-2 w-full rounded-xl border border-border/50 bg-muted/15 px-3 py-2"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium cursor-pointer">Assignees</Label>
                {assignees.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {assignees.length} people
                  </span>
                )}
                <ArrowRight className={cn("ml-1 h-3.5 w-3.5 text-muted-foreground transition-transform", showAssignees && "rotate-90")} />
              </button>

              {assignees.length > 0 && (
                <div className="flex -space-x-2 pl-4">
                  {assignees.slice(0, 8).map((id) => {
                    const member = getMember(id)
                    if (!member) return null
                    return (
                      <Avatar
                        key={id}
                        className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 hover:scale-110 transition-transform"
                        onClick={() => toggleAssignee(id)}
                        title={`${member.name} (click to remove)`}
                      >
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    )
                  })}
                </div>
              )}

              {showAssignees && (
                <div className="pl-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Input
                    placeholder="Search members..."
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="max-h-40 overflow-auto space-y-0.5 rounded-md border border-border/50 p-1">
                    {filteredMembers.map((member) => {
                      const isSelected = assignees.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleAssignee(member.id)}
                          className={cn(
                            "flex items-center gap-3 w-full rounded-md px-2 py-1.5 text-left transition-colors",
                            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                          )}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{member.name}</div>
                            <div className="text-[10px] text-muted-foreground">{member.role}</div>
                          </div>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Subtasks */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Subtasks
                  {subtasks.length > 0 && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                      ({completedSubtasks}/{subtasks.length} done)
                    </span>
                  )}
                </Label>
              </div>

              {subtasks.length > 0 && (
                <div className="space-y-1 pl-4">
                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="group flex items-center gap-2 rounded-xl border border-border/40 bg-muted/15 px-3 py-2 hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={sub.done}
                        onCheckedChange={() => toggleSubtask(sub.id)}
                      />
                      <span
                        className={cn(
                          "text-sm flex-1",
                          sub.done && "line-through text-muted-foreground"
                        )}
                      >
                        {sub.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(sub.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pl-4">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask..."
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between w-full">
            <div>
              {isEditing && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                  onClick={() => {
                    onDelete(task!.id)
                    onClose()
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
                {isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
