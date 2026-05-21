import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import { logError } from "@/lib/logger"
import { type Member, SEED_MEMBERS } from "@/components/members/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./auth-context"

interface MembersContextType {
  members: Member[]
  addMember: (member: Member) => void
  updateMember: (member: Member) => void
  deleteMember: (id: string) => void
  getMember: (id: string) => Member | undefined
  loading: boolean
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
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const orgId = user?.id

  useEffect(() => {
    async function load() {
      const query = supabase.from("members").select("*").order("created_at", { ascending: true })
      if (orgId) {
        query.eq("organization_id", orgId)
      }
      const { data, error } = await query
      if (error) {
        logError("Failed to load members", 'MembersContext', error)
        setMembers(SEED_MEMBERS)
        setLoading(false)
        return
      }
      if (data && data.length > 0) {
        setMembers(data.map(toMember))
      } else {
        // Seed the database on first run
        const rows = SEED_MEMBERS.map((m) => ({ ...toRow(m), organization_id: orgId }))
        const { data: seeded, error: seedErr } = await supabase.from("members").insert(rows).select()
        if (seedErr) {
          logError("Failed to seed members", 'MembersContext', seedErr)
          setMembers(SEED_MEMBERS)
        } else if (seeded) {
          setMembers(seeded.map(toMember))
        }
      }
      setLoading(false)
    }
    load()
  }, [orgId])

  const addMember = useCallback(async (member: Member) => {
    const row = { ...toRow(member), organization_id: orgId }
    const { data, error } = await supabase.from("members").insert(row).select().single()
    if (error) {
      logError("Failed to add member", 'MembersContext', error)
      return
    }
    if (data) setMembers((prev) => [...prev, toMember(data)])
  }, [orgId])

  const updateMember = useCallback(async (member: Member) => {
    const row = { ...toRow(member), organization_id: orgId }
    const { error } = await supabase.from("members").update(row).eq("id", member.id)
    if (error) {
      logError("Failed to update member", 'MembersContext', error)
      return
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)))
  }, [orgId])

  const deleteMember = useCallback(async (id: string) => {
    const query = supabase.from("members").delete().eq("id", id)
    if (orgId) {
      query.eq("organization_id", orgId)
    }
    const { error } = await query
    if (error) {
      logError("Failed to delete member", 'MembersContext', error)
      return
    }
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }, [orgId])

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
    stats,
  }), [members, addMember, updateMember, deleteMember, getMember, loading, stats])

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
