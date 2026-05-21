import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { logError } from "@/lib/logger"
import { type Task, type TaskStatus } from "@/components/tasks/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./auth-context"

const today = new Date()
const y = today.getFullYear()
const m = today.getMonth()

function d(day: number): Date {
  return new Date(y, m, day)
}

export const SEED_TASKS: Task[] = [
  {
    id: "t1",
    title: "Design event poster for Tech Talk",
    description: "Create a visually appealing poster for the upcoming AI Tech Talk. Must include date, location, speaker info, and QR code for registration.",
    status: "done",
    priority: "high",
    assignees: ["m6", "m2"],
    tags: ["design", "marketing"],
    dueDate: d(8),
    startDate: d(3),
    createdAt: d(1),
    completedAt: d(7),
    dependencies: [],
    subtasks: [
      { id: "s1a", title: "Draft initial concept", done: true },
      { id: "s1b", title: "Get VP approval", done: true },
      { id: "s1c", title: "Send to printer", done: true },
    ],
    section: "Marketing",
  },
  {
    id: "t2",
    title: "Book venue for Valentine Social",
    description: "Reserve Main Hall in Student Center for Feb 14. Need capacity for 100+ people. Confirm AV equipment and catering access.",
    status: "done",
    priority: "urgent",
    assignees: ["m2"],
    tags: ["logistics"],
    dueDate: d(5),
    startDate: d(2),
    createdAt: d(1),
    completedAt: d(4),
    dependencies: [],
    subtasks: [
      { id: "s2a", title: "Submit venue request form", done: true },
      { id: "s2b", title: "Confirm AV setup", done: true },
    ],
    section: "Events",
  },
  {
    id: "t3",
    title: "Update club website with new events",
    description: "Add all upcoming events to the website calendar. Update the hero banner and member spotlight section.",
    status: "in_progress",
    priority: "medium",
    assignees: ["m7"],
    tags: ["content", "feature"],
    dueDate: d(15),
    startDate: d(10),
    createdAt: d(8),
    completedAt: null,
    dependencies: ["t1"],
    subtasks: [
      { id: "s3a", title: "Update events page", done: true },
      { id: "s3b", title: "Update hero banner", done: false },
      { id: "s3c", title: "Add member spotlight", done: false },
    ],
    section: "Marketing",
  },
  {
    id: "t4",
    title: "Prepare Q1 budget report",
    description: "Compile all expenses and income for Q1. Include analysis of budget vs actuals, and projections for Q2.",
    status: "in_progress",
    priority: "high",
    assignees: ["m4"],
    tags: ["finance"],
    dueDate: d(20),
    startDate: d(12),
    createdAt: d(10),
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: "s4a", title: "Collect all receipts", done: true },
      { id: "s4b", title: "Categorize expenses", done: true },
      { id: "s4c", title: "Create charts and summary", done: false },
      { id: "s4d", title: "Get president sign-off", done: false },
    ],
    section: "Finance",
  },
  {
    id: "t5",
    title: "Send sponsor outreach emails",
    description: "Draft and send personalized emails to 15 potential sponsors for the spring hackathon. Include sponsorship tier details.",
    status: "todo",
    priority: "high",
    assignees: ["m5", "m1"],
    tags: ["outreach"],
    dueDate: d(18),
    startDate: d(14),
    createdAt: d(10),
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: "s5a", title: "Finalize sponsor deck", done: false },
      { id: "s5b", title: "Draft email templates", done: false },
      { id: "s5c", title: "Send batch 1 (top tier)", done: false },
      { id: "s5d", title: "Send batch 2 (standard)", done: false },
    ],
    section: "External",
  },
  {
    id: "t6",
    title: "Recruit volunteers for Valentine Social",
    description: "Need 15 volunteers for setup, registration, food service, and cleanup. Post in group chat and follow up individually.",
    status: "in_review",
    priority: "urgent",
    assignees: ["m3", "m8"],
    tags: ["logistics"],
    dueDate: d(12),
    startDate: d(6),
    createdAt: d(5),
    completedAt: null,
    dependencies: ["t2"],
    subtasks: [
      { id: "s6a", title: "Post volunteer sign-up form", done: true },
      { id: "s6b", title: "Follow up with members", done: true },
      { id: "s6c", title: "Assign volunteer roles", done: true },
      { id: "s6d", title: "Send confirmation emails", done: false },
    ],
    section: "Events",
  },
  {
    id: "t7",
    title: "Set up hackathon registration page",
    description: "Build and deploy the registration form for spring hackathon. Include team formation, dietary restrictions, and t-shirt size fields.",
    status: "todo",
    priority: "medium",
    assignees: ["m7", "m9"],
    tags: ["feature", "content"],
    dueDate: d(22),
    startDate: d(16),
    createdAt: d(12),
    completedAt: null,
    dependencies: ["t3"],
    subtasks: [
      { id: "s7a", title: "Design form layout", done: false },
      { id: "s7b", title: "Implement form logic", done: false },
      { id: "s7c", title: "Test and deploy", done: false },
    ],
    section: "Marketing",
  },
  {
    id: "t8",
    title: "Order club merchandise",
    description: "Order 100 t-shirts, 50 hoodies, and 200 stickers with the new club branding. Compare vendor quotes.",
    status: "backlog",
    priority: "low",
    assignees: ["m6"],
    tags: ["logistics", "marketing"],
    dueDate: d(28),
    startDate: null,
    createdAt: d(10),
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: "s8a", title: "Get vendor quotes", done: false },
      { id: "s8b", title: "Finalize designs", done: false },
      { id: "s8c", title: "Place order", done: false },
    ],
    section: "Marketing",
  },
  {
    id: "t9",
    title: "Plan study session series for midterms",
    description: "Organize a week-long series of study sessions across different subjects. Book rooms and recruit study leaders.",
    status: "todo",
    priority: "medium",
    assignees: ["m3", "m10"],
    tags: ["logistics"],
    dueDate: d(19),
    startDate: d(15),
    createdAt: d(11),
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: "s9a", title: "Survey members for subject demand", done: false },
      { id: "s9b", title: "Book rooms", done: false },
      { id: "s9c", title: "Recruit tutors", done: false },
    ],
    section: "Internal",
  },
  {
    id: "t10",
    title: "Collect member feedback survey",
    description: "Design and distribute an end-of-term member satisfaction survey. Analyze results and share report with exec team.",
    status: "backlog",
    priority: "low",
    assignees: ["m3"],
    tags: ["content", "outreach"],
    dueDate: d(30),
    startDate: null,
    createdAt: d(12),
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: "s10a", title: "Draft survey questions", done: false },
      { id: "s10b", title: "Send via email + socials", done: false },
      { id: "s10c", title: "Compile results", done: false },
    ],
    section: "Internal",
  },
  {
    id: "t11",
    title: "Fix bug in member registration flow",
    description: "Users report getting a 500 error when registering for events with special characters in their names. Investigate and fix.",
    status: "in_progress",
    priority: "urgent",
    assignees: ["m9"],
    tags: ["bug"],
    dueDate: d(13),
    startDate: d(12),
    createdAt: d(12),
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: "s11a", title: "Reproduce the bug", done: true },
      { id: "s11b", title: "Identify root cause", done: true },
      { id: "s11c", title: "Push fix and test", done: false },
    ],
    section: "Engineering",
  },
  {
    id: "t12",
    title: "Write social media content for next 2 weeks",
    description: "Create 8 posts (4 Instagram, 2 LinkedIn, 2 Twitter) covering upcoming events and member achievements.",
    status: "todo",
    priority: "medium",
    assignees: ["m6", "m8"],
    tags: ["content", "marketing"],
    dueDate: d(16),
    startDate: d(13),
    createdAt: d(11),
    completedAt: null,
    dependencies: ["t1"],
    subtasks: [
      { id: "s12a", title: "Draft Instagram posts", done: false },
      { id: "s12b", title: "Draft LinkedIn posts", done: false },
      { id: "s12c", title: "Get approval and schedule", done: false },
    ],
    section: "Marketing",
  },
  {
    id: "t13",
    title: "Negotiate catering for Valentine Social",
    description: "Contact 3 catering vendors, get quotes for 100 people. Budget is $500 max. Need vegetarian and halal options.",
    status: "in_review",
    priority: "high",
    assignees: ["m4", "m2"],
    tags: ["finance", "logistics"],
    dueDate: d(11),
    startDate: d(6),
    createdAt: d(5),
    completedAt: null,
    dependencies: ["t2"],
    subtasks: [
      { id: "s13a", title: "Contact vendors", done: true },
      { id: "s13b", title: "Compare quotes", done: true },
      { id: "s13c", title: "Select vendor and sign contract", done: false },
    ],
    section: "Finance",
  },
  {
    id: "t14",
    title: "Onboard 5 new executive members",
    description: "Walk new execs through responsibilities, tool access, communication channels, and meeting schedule. Assign mentors.",
    status: "backlog",
    priority: "medium",
    assignees: ["m1", "m3"],
    tags: ["outreach"],
    dueDate: d(25),
    startDate: null,
    createdAt: d(13),
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: "s14a", title: "Prepare onboarding doc", done: false },
      { id: "s14b", title: "Set up tool access", done: false },
      { id: "s14c", title: "Schedule intro meetings", done: false },
    ],
    section: "Internal",
  },
  {
    id: "t15",
    title: "Create hackathon judging criteria",
    description: "Define scoring rubric for hackathon projects. Include innovation, technical difficulty, presentation, and impact categories.",
    status: "backlog",
    priority: "low",
    assignees: ["m1", "m5"],
    tags: ["content"],
    dueDate: d(26),
    startDate: null,
    createdAt: d(13),
    completedAt: null,
    dependencies: ["t7"],
    subtasks: [],
    section: "Events",
  },
]

function toTask(row: Record<string, unknown>): Task {
  const subtasks = (row.subtasks as Array<{ id: string; title: string; done: boolean }>) || []
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as TaskStatus,
    priority: row.priority as Task["priority"],
    assignees: row.assignees as string[],
    tags: row.tags as string[],
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    startDate: row.start_date ? new Date(row.start_date as string) : null,
    createdAt: new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    dependencies: row.dependencies as string[],
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
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, newStatus: TaskStatus) => void
  reorderTasks: (activeId: string, overId: string, newStatus: TaskStatus) => void
}

const TasksContext = createContext<TasksContextType | undefined>(undefined)

export function TasksProvider({ children, initialTasks = [] }: { children: React.ReactNode, initialTasks?: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const { user } = useAuth()
  const orgId = user?.id

  useEffect(() => {
    if (initialTasks.length > 0) return
    async function load() {
      const query = supabase.from("tasks").select("*").order("created_at", { ascending: true })
      if (orgId) {
        query.eq("organization_id", orgId)
      }
      const { data, error } = await query
      if (error) {
        logError("Failed to load tasks", 'TasksContext', error)
        setTasks(SEED_TASKS)
        return
      }
      if (data && data.length > 0) {
        setTasks(data.map(toTask))
      } else {
        const rows = SEED_TASKS.map(t => ({ ...toRow(t), organization_id: orgId }))
        const { data: seeded, error: seedErr } = await supabase.from("tasks").insert(rows).select()
        if (seedErr) {
          logError("Failed to seed tasks", 'TasksContext', seedErr)
          setTasks(SEED_TASKS)
        } else if (seeded) {
          setTasks(seeded.map(toTask))
        }
      }
    }
    load()
  }, [orgId, initialTasks.length])

  const addTask = useCallback(async (task: Task) => {
    const row = { ...toRow(task), organization_id: orgId }
    const { data, error } = await supabase.from("tasks").insert(row).select().single()
    if (error) {
      logError("Failed to add task", 'TasksContext', error)
      return
    }
    if (data) setTasks((prev) => [...prev, toTask(data)])
  }, [orgId])

  const updateTask = useCallback(async (task: Task) => {
    const row = { ...toRow(task), organization_id: orgId }
    const { error } = await supabase.from("tasks").update(row).eq("id", task.id)
    if (error) {
      logError("Failed to update task", 'TasksContext', error)
      return
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
  }, [orgId])

  const deleteTask = useCallback(async (id: string) => {
    const query = supabase.from("tasks").delete().eq("id", id)
    if (orgId) {
      query.eq("organization_id", orgId)
    }
    const { error } = await query
    if (error) {
      logError("Failed to delete task", 'TasksContext', error)
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [orgId])

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const query = supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)
    if (orgId) {
      query.eq("organization_id", orgId)
    }
    const { error } = await query
    if (error) {
      logError("Failed to move task", 'TasksContext', error)
      return
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
  }, [orgId])

  const reorderTasks = useCallback(
    (activeId: string, overId: string, newStatus: TaskStatus) => {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId)
        if (activeIndex === -1) return prev

        const updated = [...prev]
        const [task] = updated.splice(activeIndex, 1)
        task.status = newStatus
        if (newStatus === "done" && !task.completedAt) {
          task.completedAt = new Date()
        }

        const overIndex = updated.findIndex((t) => t.id === overId)
        if (overIndex === -1) {
          updated.push(task)
        } else {
          updated.splice(overIndex, 0, task)
        }

        // Persist the status change
        const query = supabase.from("tasks").update({
          status: newStatus,
          completed_at: newStatus === "done" ? new Date().toISOString() : null,
        }).eq("id", activeId)
        if (orgId) {
          query.eq("organization_id", orgId)
        }
        query.then(({ error }) => {
          if (error) logError("Failed to persist reorder", 'TasksContext', error)
        })

        return updated
      })
    },
    []
  )

  return (
    <TasksContext.Provider
      value={{ tasks, addTask, updateTask, deleteTask, moveTask, reorderTasks }}
    >
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  const context = useContext(TasksContext)
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider")
  }
  return context
}
