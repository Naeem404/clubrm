import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react"
import { logError } from "@/lib/logger"
import { type Member } from "@/components/members/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./auth-context"
import { useToast } from "./toast-context"

/*
 * Single-club data layer: every authenticated user reads the shared club rows;
 * access is enforced by RLS (see supabase/migration-security-hardening.sql).
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

interface MembersContextType {
  members: Member[]
  /** All mutations update optimistically, roll back + toast on failure, then rethrow. */
  addMember: (member: Member) => Promise<void>
  updateMember: (member: Member) => Promise<void>
  deleteMember: (id: string) => Promise<void>
  getMember: (id: string) => Member | undefined
  loading: boolean
  /** Message of the last failed load, or null. */
  error: string | null
  refresh: () => Promise<void>
  stats: {
    total: number
    active: number
    inactive: number
    alumni: number
  }
}

const MembersContext = createContext<MembersContextType | undefined>(undefined)

function toMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    role: row.role as Member["role"],
    status: row.status as Member["status"],
    joinDate: row.join_date as string,
    avatar: (row.avatar as string) || undefined,
    department: row.department as string,
    year: row.year as string,
    tasksCompleted: row.tasks_completed as number,
    eventsAttended: row.events_attended as number,
    bio: (row.bio as string) || undefined,
  }
}

function toRow(m: Member) {
  return {
    name: m.name,
    email: m.email,
    phone: m.phone,
    role: m.role,
    status: m.status,
    join_date: m.joinDate,
    avatar: m.avatar || null,
    department: m.department,
    year: m.year,
    tasks_completed: m.tasksCompleted,
    events_attended: m.eventsAttended,
    bio: m.bio || null,
  }
}

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const notifyError = useErrorToast()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState<string | null>(null)

  const membersRef = useRef<Member[]>(members)
  membersRef.current = members
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    if (!userId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const { data, error: loadErr } = await supabase.from("members").select("*").order("created_at", { ascending: true })
      if (requestId !== requestRef.current) return
      if (loadErr) throw loadErr
      setMembers(((data ?? []) as Record<string, unknown>[]).map(toMember))
    } catch (err) {
      if (requestId !== requestRef.current) return
      const msg = errorMessage(err)
      logError("Failed to load members", "MembersContext", err)
      setError(msg)
      notifyError("Couldn't load members", msg)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [userId, notifyError])

  useEffect(() => {
    // Clear on sign-out / user switch; never query while signed out.
    setMembers([])
    setError(null)
    if (!userId) {
      requestRef.current++
      setLoading(false)
      return
    }
    void load()
    return () => {
      requestRef.current++
    }
  }, [userId, load])

  const fail = useCallback((action: string, err: unknown): never => {
    logError(`Failed to ${action}`, "MembersContext", err)
    notifyError(`Couldn't ${action}`, errorMessage(err))
    throw err
  }, [notifyError])

  const addMember = useCallback(async (member: Member) => {
    const tempId = `temp-${crypto.randomUUID()}`
    setMembers((prev) => [...prev, { ...member, id: tempId }])
    try {
      const { data, error: err } = await supabase.from("members").insert(toRow(member)).select().single()
      if (err) throw err
      if (!data) throw new Error("Member was not created")
      const created = toMember(data as Record<string, unknown>)
      setMembers((prev) => prev.map((m) => (m.id === tempId ? created : m)))
    } catch (err) {
      setMembers((prev) => prev.filter((m) => m.id !== tempId))
      fail("add member", err)
    }
  }, [fail])

  const updateMember = useCallback(async (member: Member) => {
    const previous = membersRef.current.find((m) => m.id === member.id)
    setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)))
    try {
      const { error: err } = await supabase.from("members").update(toRow(member)).eq("id", member.id)
      if (err) throw err
    } catch (err) {
      if (previous) setMembers((prev) => prev.map((m) => (m.id === previous.id ? previous : m)))
      fail("update member", err)
    }
  }, [fail])

  const deleteMember = useCallback(async (id: string) => {
    const index = membersRef.current.findIndex((m) => m.id === id)
    const previous = index >= 0 ? membersRef.current[index] : undefined
    setMembers((prev) => prev.filter((m) => m.id !== id))
    try {
      const { error: err } = await supabase.from("members").delete().eq("id", id)
      if (err) throw err
    } catch (err) {
      if (previous) {
        setMembers((prev) => {
          if (prev.some((m) => m.id === id)) return prev
          const next = [...prev]
          next.splice(Math.min(index, next.length), 0, previous)
          return next
        })
      }
      fail("delete member", err)
    }
  }, [fail])

  const getMember = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members]
  )

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    inactive: members.filter((m) => m.status === "inactive").length,
    alumni: members.filter((m) => m.status === "alumni").length,
  }), [members])

  const contextValue = useMemo(() => ({
    members,
    addMember,
    updateMember,
    deleteMember,
    getMember,
    loading,
    error,
    refresh: load,
    stats,
  }), [members, addMember, updateMember, deleteMember, getMember, loading, error, load, stats])

  return (
    <MembersContext.Provider value={contextValue}>
      {children}
    </MembersContext.Provider>
  )
}

export function useMembers() {
  const context = useContext(MembersContext)
  if (!context) throw new Error("useMembers must be used within a MembersProvider")
  return context
}
