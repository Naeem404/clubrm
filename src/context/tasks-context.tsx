import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react"
import { logError } from "@/lib/logger"
import { type Task, type TaskStatus } from "@/components/tasks/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./auth-context"
import { useToast } from "./toast-context"

/*
 * Single-club data layer: every authenticated user reads the shared club rows;
 * access is enforced by RLS (see supabase/migration-security-hardening.sql).
 * owner_id is set by the database, never by the client.
 */

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message
  }
  return typeof err === "string" ? err : "Unknown error"
}

/** Toast helper that degrades to a no-op when no ToastProvider is mounted. */
function useErrorToast() {
  let showToast: ReturnType<typeof useToast>["showToast"] | null = null
  try {
    showToast = useToast().showToast
  } catch {
    showToast = null
  }
  return useCallback(
    (title: string, message?: string) => showToast?.({ type: "error", title, message }),
    [showToast]
  )
}

function toTask(row: Record<string, unknown>): Task {
  const subtasks = (row.subtasks as Array<{ id: string; title: string; done: boolean }>) || []
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || "",
    status: row.status as TaskStatus,
    priority: row.priority as Task["priority"],
    assignees: (row.assignees as string[]) || [],
    tags: (row.tags as string[]) || [],
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    startDate: row.start_date ? new Date(row.start_date as string) : null,
    createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    dependencies: (row.dependencies as string[]) || [],
    subtasks,
    section: (row.section as string) || undefined,
  }
}

function toRow(t: Task) {
  return {
    title: t.title,
    description: t.description || "",
    status: t.status,
    priority: t.priority,
    assignees: t.assignees || [],
    tags: t.tags || [],
    due_date: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    start_date: t.startDate ? new Date(t.startDate).toISOString() : null,
    completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null,
    dependencies: t.dependencies || [],
    subtasks: t.subtasks ? [...t.subtasks.map(st => ({ ...st }))] : [],
    section: t.section || null,
  }
}

interface TasksContextType {
  tasks: Task[]
  loading: boolean
  /** Message of the last failed load, or null. */
  error: string | null
  refresh: () => Promise<void>
  /** All mutations update optimistically, roll back + toast on failure, then rethrow. */
  addTask: (task: Task) => Promise<void>
  updateTask: (task: Task) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>
  reorderTasks: (activeId: string, overId: string, newStatus: TaskStatus) => Promise<void>
}

const TasksContext = createContext<TasksContextType | undefined>(undefined)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const notifyError = useErrorToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Latest tasks, used to snapshot rows for rollback without stale closures.
  const tasksRef = useRef<Task[]>(tasks)
  tasksRef.current = tasks
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    if (!userId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const { data, error: loadErr } = await supabase.from("tasks").select("*").order("created_at", { ascending: true })
      if (requestId !== requestRef.current) return
      if (loadErr) throw loadErr
      setTasks(((data ?? []) as Record<string, unknown>[]).map(toTask))
    } catch (err) {
      if (requestId !== requestRef.current) return
      const msg = errorMessage(err)
      logError("Failed to load tasks", "TasksContext", err)
      setError(msg)
      notifyError("Couldn't load tasks", msg)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [userId, notifyError])

  useEffect(() => {
    // Clear on sign-out / user switch; never query while signed out.
    setTasks([])
    setError(null)
    if (!userId) {
      requestRef.current++
      setLoading(false)
      return
    }
    void load()
    return () => {
      requestRef.current++ // ignore in-flight responses after unmount / user change
    }
  }, [userId, load])

  const fail = useCallback((action: string, err: unknown): never => {
    logError(`Failed to ${action}`, "TasksContext", err)
    notifyError(`Couldn't ${action}`, errorMessage(err))
    throw err
  }, [notifyError])

  const restore = useCallback((previous: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === previous.id ? previous : t)))
  }, [])

  const addTask = useCallback(async (task: Task) => {
    const tempId = `temp-${crypto.randomUUID()}`
    setTasks((prev) => [...prev, { ...task, id: tempId }])
    try {
      const { data, error: err } = await supabase.from("tasks").insert(toRow(task)).select().single()
      if (err) throw err
      if (!data) throw new Error("Task was not created")
      const created = toTask(data as Record<string, unknown>)
      setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)))
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId))
      fail("add task", err)
    }
  }, [fail])

  const updateTask = useCallback(async (task: Task) => {
    const previous = tasksRef.current.find((t) => t.id === task.id)
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    try {
      const { error: err } = await supabase.from("tasks").update(toRow(task)).eq("id", task.id)
      if (err) throw err
    } catch (err) {
      if (previous) restore(previous)
      fail("update task", err)
    }
  }, [fail, restore])

  const deleteTask = useCallback(async (id: string) => {
    const index = tasksRef.current.findIndex((t) => t.id === id)
    const previous = index >= 0 ? tasksRef.current[index] : undefined
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      const { error: err } = await supabase.from("tasks").delete().eq("id", id)
      if (err) throw err
    } catch (err) {
      if (previous) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === id)) return prev
          const next = [...prev]
          next.splice(Math.min(index, next.length), 0, previous)
          return next
        })
      }
      fail("delete task", err)
    }
  }, [fail])

  const persistStatus = useCallback(async (previous: Task, updated: Task, action: string) => {
    try {
      const { error: err } = await supabase
        .from("tasks")
        .update({
          status: updated.status,
          completed_at: updated.completedAt ? updated.completedAt.toISOString() : null,
        })
        .eq("id", updated.id)
      if (err) throw err
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === previous.id ? { ...t, status: previous.status, completedAt: previous.completedAt } : t))
      )
      fail(action, err)
    }
  }, [fail])

  const withStatus = (task: Task, status: TaskStatus): Task => ({
    ...task,
    status,
    completedAt: status === "done" ? task.completedAt ?? new Date() : null,
  })

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const previous = tasksRef.current.find((t) => t.id === taskId)
    if (!previous) return
    const updated = withStatus(previous, newStatus)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    await persistStatus(previous, updated, "move task")
  }, [persistStatus])

  const reorderTasks = useCallback(async (activeId: string, overId: string, newStatus: TaskStatus) => {
    const current = tasksRef.current
    const activeIndex = current.findIndex((t) => t.id === activeId)
    if (activeIndex === -1) return
    const previous = current[activeIndex]
    const updated = previous.status === newStatus ? previous : withStatus(previous, newStatus)

    const next = [...current]
    next.splice(activeIndex, 1)
    const overIndex = next.findIndex((t) => t.id === overId)
    if (overIndex === -1) next.push(updated)
    else next.splice(overIndex, 0, updated)
    tasksRef.current = next
    setTasks(next)

    // Order is local-only; only a status change is persisted.
    if (previous.status !== newStatus) {
      await persistStatus(previous, updated, "move task")
    }
  }, [persistStatus])

  const value = useMemo(
    () => ({ tasks, loading, error, refresh: load, addTask, updateTask, deleteTask, moveTask, reorderTasks }),
    [tasks, loading, error, load, addTask, updateTask, deleteTask, moveTask, reorderTasks]
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const context = useContext(TasksContext)
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider")
  }
  return context
}
