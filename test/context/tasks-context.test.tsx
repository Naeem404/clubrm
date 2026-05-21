import { describe, it, expect, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { TasksProvider, useTasks, SEED_TASKS } from "../../src/context/tasks-context"
import type { ReactNode } from "react"

const { mockSupabase } = vi.hoisted(() => {
  const tasks = [{ id: "seed-1", title: "Seed Task", status: "backlog", priority: "medium", section: "General", subtasks: [], created_at: new Date().toISOString() }];
  return {
    mockSupabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: tasks, error: null })),
      })),
    }
  };
});

vi.mock("../../src/lib/supabase", () => ({
  supabase: mockSupabase,
  supabaseUntyped: mockSupabase,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <TasksProvider initialTasks={SEED_TASKS}>{children}</TasksProvider>
}

describe("TasksContext", () => {
  it("adds a task", async () => {
    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.tasks.length).toBeGreaterThan(0))
    
    const before = result.current.tasks.length
    await act(async () => {
      await result.current.addTask({
        id: "test-task",
        title: "Test Task",
        status: "backlog",
        priority: "medium",
        section: "General",
        subtasks: [], 
        createdAt: new Date(),
        description: "Task desc",
        assignees: [],
        tags: [],
        dependencies: [],
        dueDate: null,
        startDate: null,
        completedAt: null
      })
    })

    await waitFor(() => {
      expect(result.current.tasks.length).toBe(before + 1)
    })
  })

  it("updates a task", async () => {
    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.tasks.length).toBeGreaterThan(0))
    
    const first = result.current.tasks[0]
    await act(async () => {
      await result.current.updateTask({ ...first, title: "Updated Title" })
    })

    await waitFor(() => {
      const updated = result.current.tasks.find((t) => t.id === first.id)
      expect(updated?.title).toBe("Updated Title")
    })
  })

  it("moves a task to a new status", async () => {
    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.tasks.length).toBeGreaterThan(0))
    
    const task = result.current.tasks[0]
    await act(async () => {
      await result.current.moveTask(task.id, "in-progress")
    })

    await waitFor(() => {
      const moved = result.current.tasks.find((t) => t.id === task.id)
      expect(moved?.status).toBe("in-progress")
    })
  })
})