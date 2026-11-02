import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react"
import { logError } from "@/lib/logger"
import { type CalendarEvent } from "@/components/events/types"
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

function toEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    startDate: new Date(row.start_date as string),
    endDate: new Date(row.end_date as string),
    allDay: row.all_day as boolean,
    location: row.location as string,
    colorId: row.color_id as string,
    tags: (row.tags as string[]) || [],
    collaborators: (row.collaborators as string[]) || [],
    createdBy: row.created_by as string,
    capacity: row.capacity as number | undefined,
    registered: row.registered as number | undefined,
    isPublic: row.is_public as boolean,
    status: row.status as CalendarEvent["status"],
  }
}

function toRow(e: CalendarEvent) {
  const start = e.startDate ? new Date(e.startDate) : new Date()
  const end = e.endDate ? new Date(e.endDate) : new Date()
  
  return {
    title: e.title,
    description: e.description || "",
    start_date: isNaN(start.getTime()) ? new Date().toISOString() : start.toISOString(),
    end_date: isNaN(end.getTime()) ? new Date().toISOString() : end.toISOString(),
    all_day: e.allDay || false,
    location: e.location || "",
    color_id: e.colorId || "blue",
    tags: e.tags || [],
    collaborators: e.collaborators || [],
    created_by: e.createdBy || "",
    capacity: e.capacity ?? null,
    registered: e.registered ?? null,
    is_public: e.isPublic ?? true,
    status: e.status || "confirmed",
  }
}

interface EventsContextType {
  events: CalendarEvent[]
  loading: boolean
  /** Message of the last failed load, or null. */
  error: string | null
  refresh: () => Promise<void>
  /** All mutations update optimistically, roll back + toast on failure, then rethrow. */
  addEvent: (event: CalendarEvent) => Promise<void>
  updateEvent: (event: CalendarEvent) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  getEventsForDate: (date: Date) => CalendarEvent[]
  getEventsForRange: (start: Date, end: Date) => CalendarEvent[]
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const notifyError = useErrorToast()

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventsRef = useRef<CalendarEvent[]>(events)
  eventsRef.current = events
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    if (!userId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const { data, error: loadErr } = await supabase.from("events").select("*").order("start_date", { ascending: true })
      if (requestId !== requestRef.current) return
      if (loadErr) throw loadErr
      setEvents(((data ?? []) as Record<string, unknown>[]).map(toEvent))
    } catch (err) {
      if (requestId !== requestRef.current) return
      const msg = errorMessage(err)
      logError("Failed to load events", "EventsContext", err)
      setError(msg)
      notifyError("Couldn't load events", msg)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [userId, notifyError])

  useEffect(() => {
    // Clear on sign-out / user switch; never query while signed out.
    setEvents([])
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
    logError(`Failed to ${action}`, "EventsContext", err)
    notifyError(`Couldn't ${action}`, errorMessage(err))
    throw err
  }, [notifyError])

  const addEvent = useCallback(async (event: CalendarEvent) => {
    const tempId = `temp-${crypto.randomUUID()}`
    setEvents((prev) => [...prev, { ...event, id: tempId }])
    try {
      const { data, error: err } = await supabase.from("events").insert(toRow(event)).select().single()
      if (err) throw err
      if (!data) throw new Error("Event was not created")
      const created = toEvent(data as Record<string, unknown>)
      setEvents((prev) => prev.map((e) => (e.id === tempId ? created : e)))
    } catch (err) {
      setEvents((prev) => prev.filter((e) => e.id !== tempId))
      fail("add event", err)
    }
  }, [fail])

  const updateEvent = useCallback(async (event: CalendarEvent) => {
    const previous = eventsRef.current.find((e) => e.id === event.id)
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
    try {
      const { error: err } = await supabase.from("events").update(toRow(event)).eq("id", event.id)
      if (err) throw err
    } catch (err) {
      if (previous) setEvents((prev) => prev.map((e) => (e.id === previous.id ? previous : e)))
      fail("update event", err)
    }
  }, [fail])

  const deleteEvent = useCallback(async (id: string) => {
    const index = eventsRef.current.findIndex((e) => e.id === id)
    const previous = index >= 0 ? eventsRef.current[index] : undefined
    setEvents((prev) => prev.filter((e) => e.id !== id))
    try {
      const { error: err } = await supabase.from("events").delete().eq("id", id)
      if (err) throw err
    } catch (err) {
      if (previous) {
        setEvents((prev) => {
          if (prev.some((e) => e.id === id)) return prev
          const next = [...prev]
          next.splice(Math.min(index, next.length), 0, previous)
          return next
        })
      }
      fail("delete event", err)
    }
  }, [fail])

  const getEventsForDate = useCallback(
    (date: Date) => {
      return events.filter((event) => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        return eventStart <= dayEnd && eventEnd >= dayStart
      })
    },
    [events]
  )

  const getEventsForRange = useCallback(
    (start: Date, end: Date) => {
      return events.filter((event) => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        return eventStart <= end && eventEnd >= start
      })
    },
    [events]
  )

  const value = useMemo(
    () => ({ events, loading, error, refresh: load, addEvent, updateEvent, deleteEvent, getEventsForDate, getEventsForRange }),
    [events, loading, error, load, addEvent, updateEvent, deleteEvent, getEventsForDate, getEventsForRange]
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents() {
  const context = useContext(EventsContext)
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider")
  }
  return context
}
