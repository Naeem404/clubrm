import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { type CalendarEvent } from "@/components/events/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"

const today = new Date()
const year = today.getFullYear()
const month = today.getMonth()

function d(day: number, hour: number, min = 0) {
  return new Date(year, month, day, hour, min)
}

export const SEED_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Tech Talk: AI in 2026",
    description: "Join us for a deep dive into the latest AI trends and how they impact student careers. Industry speakers from leading companies will share their insights.",
    startDate: d(10, 18, 0),
    endDate: d(10, 20, 0),
    allDay: false,
    location: "Room 101, Engineering Building",
    colorId: "blue",
    tags: ["workshop", "guest-speaker"],
    collaborators: ["1", "2", "3"],
    createdBy: "1",
    capacity: 50,
    registered: 45,
    isPublic: true,
    status: "confirmed",
  },
  {
    id: "evt-2",
    title: "Valentine Social",
    description: "Annual club social event with music, food, and fun activities. Open to all members and their plus-ones!",
    startDate: d(14, 20, 0),
    endDate: d(14, 23, 0),
    allDay: false,
    location: "Main Hall, Student Center",
    colorId: "rose",
    tags: ["social"],
    collaborators: ["1", "2", "6", "7", "8"],
    createdBy: "2",
    capacity: 100,
    registered: 80,
    isPublic: true,
    status: "confirmed",
  },
  {
    id: "evt-3",
    title: "Resume Workshop",
    description: "Hands-on workshop to polish your resume. Bring your laptop and current resume for personalized feedback.",
    startDate: d(20, 14, 0),
    endDate: d(20, 16, 0),
    allDay: false,
    location: "Lab 201, CS Building",
    colorId: "emerald",
    tags: ["workshop"],
    collaborators: ["3", "5"],
    createdBy: "3",
    capacity: 30,
    registered: 12,
    isPublic: true,
    status: "draft",
  },
  {
    id: "evt-4",
    title: "Executive Board Meeting",
    description: "Monthly executive board meeting. All VPs must attend. Agenda will be shared via email.",
    startDate: d(5, 17, 0),
    endDate: d(5, 18, 30),
    allDay: false,
    location: "Conference Room B",
    colorId: "amber",
    tags: ["meeting"],
    collaborators: ["1", "2", "3", "4", "5", "6"],
    createdBy: "1",
    isPublic: false,
    status: "confirmed",
  },
  {
    id: "evt-5",
    title: "Sponsor Networking Mixer",
    description: "Meet potential sponsors in a casual setting. Dress business casual. Appetizers and drinks provided.",
    startDate: d(22, 18, 0),
    endDate: d(22, 21, 0),
    allDay: false,
    location: "Rooftop Lounge, Business Building",
    colorId: "violet",
    tags: ["networking", "fundraiser"],
    collaborators: ["1", "5", "4"],
    createdBy: "5",
    capacity: 40,
    registered: 28,
    isPublic: false,
    status: "confirmed",
  },
  {
    id: "evt-6",
    title: "Hackathon Planning",
    description: "Planning session for the upcoming spring hackathon. Discuss logistics, sponsors, and prizes.",
    startDate: d(8, 12, 0),
    endDate: d(8, 13, 0),
    allDay: false,
    location: "Room 305",
    colorId: "cyan",
    tags: ["meeting"],
    collaborators: ["1", "2", "3"],
    createdBy: "2",
    isPublic: false,
    status: "confirmed",
  },
  {
    id: "evt-7",
    title: "Club Photo Day",
    description: "Annual club photos for the yearbook and social media. Wear club t-shirts!",
    startDate: d(17, 0, 0),
    endDate: d(17, 23, 59),
    allDay: true,
    location: "Campus Quad",
    colorId: "pink",
    tags: ["social"],
    collaborators: ["6", "2"],
    createdBy: "6",
    isPublic: true,
    status: "confirmed",
  },
  {
    id: "evt-8",
    title: "Study Session: Algorithms",
    description: "Group study for midterm prep. Covering dynamic programming, graph algorithms, and greedy methods.",
    startDate: d(12, 10, 0),
    endDate: d(12, 12, 30),
    allDay: false,
    location: "Library Room 4B",
    colorId: "slate",
    tags: ["study-session"],
    collaborators: ["7", "8", "9", "10"],
    createdBy: "7",
    isPublic: true,
    status: "confirmed",
  },
  {
    id: "evt-9",
    title: "Budget Review Q1",
    description: "Quarterly budget review with the finance committee. All expense reports must be submitted beforehand.",
    startDate: d(25, 15, 0),
    endDate: d(25, 16, 30),
    allDay: false,
    location: "Finance Office",
    colorId: "orange",
    tags: ["meeting"],
    collaborators: ["1", "4"],
    createdBy: "4",
    isPublic: false,
    status: "confirmed",
  },
  {
    id: "evt-10",
    title: "Coding Competition",
    description: "Inter-club coding competition. Teams of 3. Prizes for top 3 teams!",
    startDate: d(28, 9, 0),
    endDate: d(28, 17, 0),
    allDay: false,
    location: "CS Lab 100",
    colorId: "blue",
    tags: ["competition"],
    collaborators: ["1", "2", "3", "7", "8"],
    createdBy: "2",
    capacity: 60,
    registered: 42,
    isPublic: true,
    status: "confirmed",
  },
  {
    id: "evt-11",
    title: "Weekly Standup",
    description: "Quick sync on task progress and blockers.",
    startDate: d(3, 9, 0),
    endDate: d(3, 9, 30),
    allDay: false,
    location: "Zoom",
    colorId: "amber",
    tags: ["meeting"],
    collaborators: ["1", "2", "3", "4", "5", "6"],
    createdBy: "1",
    isPublic: false,
    status: "confirmed",
  },
  {
    id: "evt-12",
    title: "Marketing Strategy Session",
    description: "Planning social media content for the rest of the semester.",
    startDate: d(15, 13, 0),
    endDate: d(15, 14, 30),
    allDay: false,
    location: "Room 202",
    colorId: "pink",
    tags: ["meeting"],
    collaborators: ["1", "6"],
    createdBy: "6",
    isPublic: false,
    status: "confirmed",
  },
]

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
    tags: row.tags as string[],
    collaborators: row.collaborators as string[],
    createdBy: row.created_by as string,
    capacity: row.capacity as number | undefined,
    registered: row.registered as number | undefined,
    isPublic: row.is_public as boolean,
    status: row.status as CalendarEvent["status"],
  }
}

function toRow(e: CalendarEvent, orgId: string | null = null) {
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
    organization_id: orgId,
  }
}

interface EventsContextType {
  events: CalendarEvent[]
  addEvent: (event: CalendarEvent) => void
  updateEvent: (event: CalendarEvent) => void
  deleteEvent: (id: string) => void
  getEventsForDate: (date: Date) => CalendarEvent[]
  getEventsForRange: (start: Date, end: Date) => CalendarEvent[]
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

export function EventsProvider({ children, initialEvents = [] }: { children: React.ReactNode, initialEvents?: CalendarEvent[] }) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const orgId = user?.id ?? null

  useEffect(() => {
    if (initialEvents.length > 0) return
    if (!orgId) return
    let cancelled = false
    async function load() {
      // Filter to this organization only. The .or() handles legacy rows
      // that pre-date the organization_id column.
      const { data, error } = await supabase
        .from("events")
        .select("*")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .or(`organization_id.eq.${orgId},and(organization_id.is.null,created_by.eq.${orgId})` as any)
        .order("start_date", { ascending: true })

      if (cancelled) return

      if (error) {
        console.error("[events] load failed:", error)
        setEvents([])
        return
      }
      // Production-empty start: no auto-seed. New clubs see an empty calendar
      // and create their first event from the UI.
      setEvents((data ?? []).map(toEvent))
    }
    void load()
    return () => { cancelled = true }
  }, [orgId, initialEvents.length])

  const addEvent = useCallback(async (event: CalendarEvent) => {
    if (!orgId) return
    const row = toRow({ ...event, createdBy: event.createdBy || orgId }, orgId)
    const { data, error } = await supabase.from("events").insert(row).select().single()
    if (error) {
      console.error("Failed to add event:", error)
      return
    }
    if (data) setEvents((prev) => [...prev, toEvent(data)])
  }, [orgId])

  const updateEvent = useCallback(async (event: CalendarEvent) => {
    const row = toRow(event, orgId)
    const { error } = await supabase.from("events").update(row).eq("id", event.id)
    if (error) {
      console.error("Failed to update event:", error)
      return
    }
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
  }, [orgId])

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id)
    if (error) {
      console.error("Failed to delete event:", error)
      return
    }
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

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

  return (
    <EventsContext.Provider
      value={{ events, addEvent, updateEvent, deleteEvent, getEventsForDate, getEventsForRange }}
    >
      {children}
    </EventsContext.Provider>
  )
}

export function useEvents() {
  const context = useContext(EventsContext)
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider")
  }
  return context
}
