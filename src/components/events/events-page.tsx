import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { useEvents } from "@/context/events-context"
import { type CalendarEvent, type CalendarView } from "./types"
import { CalendarHeader } from "./calendar-header"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
import { DayView } from "./day-view"
import { EventModal } from "./event-modal"
import { EventDetailPanel } from "./event-detail-panel"
import { addMonths, addWeeks, addDays } from "date-fns"

/**
 * FIX for Activity 3: Extracted logic to a pure utility function.
 * This resolves the "Logic Bloat" smell by decoupling search 
 * processing from the React component lifecycle.
 */
const findMatchingEventDate = (query: string, events: CalendarEvent[]): Date | null => {
  if (!query || events.length === 0) return null;
  
  const q = query.toLowerCase();
  const match = events.find(e => 
    e.title.toLowerCase().includes(q) || 
    (e.description && e.description.toLowerCase().includes(q))
  );
  
  return match ? new Date(match.startDate) : null;
};

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get("search") || ""

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>("month")
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()
  const prevSearchRef = useRef<string>("")

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | null>(null)

  // Detail panel state
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Auto-navigate to first match when search query changes
  useEffect(() => {
    if (searchQuery && searchQuery !== prevSearchRef.current) {
      // Using the refactored utility function instead of inline logic
      const matchDate = findMatchingEventDate(searchQuery, events);
      
      if (matchDate) {
        setCurrentDate(matchDate);
      }
      
      prevSearchRef.current = searchQuery;
    } else if (!searchQuery) {
      prevSearchRef.current = ""
    }
  }, [searchQuery, events])

  const handleSearchChange = useCallback((query: string) => {
    setSearchParams(prev => {
      if (query) {
        prev.set("search", query)
      } else {
        prev.delete("search")
      }
      return prev
    }, { replace: true })
  }, [setSearchParams])

  const handleNavigate = useCallback(
    (direction: "prev" | "next" | "today") => {
      if (direction === "today") {
        setCurrentDate(new Date())
        return
      }

      const delta = direction === "next" ? 1 : -1
      switch (view) {
        case "month":
          setCurrentDate((d) => addMonths(d, delta))
          break
        case "week":
          setCurrentDate((d) => addWeeks(d, delta))
          break
        case "day":
          setCurrentDate((d) => addDays(d, delta))
          break
      }
    },
    [view]
  )

  const handleDayClick = useCallback(
    (date: Date) => {
      if (view === "month") {
        setCurrentDate(date)
        setView("day")
      }
    },
    [view]
  )

  const handleTimeSlotClick = useCallback((date: Date) => {
    setDefaultDate(date)
    setEditingEvent(null)
    setModalOpen(true)
  }, [])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }, [])

  const handleCreateEvent = useCallback(() => {
    setEditingEvent(null)
    setDefaultDate(null)
    setModalOpen(true)
  }, [])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setDefaultDate(null)
    setModalOpen(true)
  }, [])

  const handleSaveEvent = useCallback(
    (event: CalendarEvent) => {
      if (editingEvent) {
        updateEvent(event)
      } else {
        addEvent(event)
      }
      setModalOpen(false)
    },
    [editingEvent, updateEvent, addEvent]
  )

  const handleDeleteEvent = useCallback(
    (id: string) => {
      deleteEvent(id)
      setDetailOpen(false)
      setModalOpen(false)
    },
    [deleteEvent]
  )

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={handleNavigate}
        onCreateEvent={handleCreateEvent}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <div className="flex-1 min-h-0">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            searchQuery={searchQuery}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            searchQuery={searchQuery}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            searchQuery={searchQuery}
          />
        )}
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={editingEvent}
        defaultDate={defaultDate}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      <EventDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  )
}