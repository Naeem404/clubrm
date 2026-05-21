import { useMemo } from "react"
import { useEvents } from "@/context/events-context"
import { type CalendarEvent, getEventColor } from "./types"
import { cn } from "@/lib/utils"
import { isToday, format, getHours, getMinutes, differenceInMinutes } from "date-fns"
import { EventCard } from "./event-card"

interface DayViewProps {
  currentDate: Date
  onEventClick: (event: CalendarEvent) => void
  onTimeSlotClick: (date: Date) => void
  searchQuery?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function DayView({ currentDate, onEventClick, onTimeSlotClick, searchQuery = "" }: DayViewProps) {
  const { getEventsForDate } = useEvents()

  const dayEvents = useMemo(() => {
    return getEventsForDate(currentDate).filter(e => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return e.title.toLowerCase().includes(q) || (e.description?.toLowerCase().includes(q) ?? false)
    })
  }, [currentDate, getEventsForDate, searchQuery])

  const timedEvents = dayEvents.filter((e) => !e.allDay)
  const allDayEvents = dayEvents.filter((e) => e.allDay)

  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    const startMinutes = getHours(start) * 60 + getMinutes(start)
    const durationMinutes = Math.max(differenceInMinutes(end, start), 30)
    const top = (startMinutes / (24 * 60)) * 100
    const height = (durationMinutes / (24 * 60)) * 100
    return { top: `${top}%`, height: `${height}%` }
  }

  return (
    <div className="flex gap-4 flex-1">
      {/* Main time grid */}
      <div className="flex-1 rounded-xl border border-border/50 overflow-hidden bg-card flex flex-col">
        {/* Day header */}
        <div className="border-b border-border/50 p-4 flex items-center gap-4">
          <div
            className={cn(
              "flex items-center justify-center h-14 w-14 rounded-2xl text-2xl font-bold",
              isToday(currentDate)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            )}
          >
            {format(currentDate, "d")}
          </div>
          <div>
            <div className="text-lg font-semibold">{format(currentDate, "EEEE")}</div>
            <div className="text-sm text-muted-foreground">{format(currentDate, "MMMM yyyy")}</div>
          </div>
          {dayEvents.length > 0 && (
            <div className="ml-auto text-sm text-muted-foreground">
              {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="border-b border-border/50 p-3 space-y-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              All Day
            </div>
            {allDayEvents.map((event) => (
              <EventCard key={event.id} event={event} compact onClick={onEventClick} />
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[70px_1fr] relative" style={{ height: `${24 * 60}px` }}>
            {/* Time labels */}
            <div className="border-r border-border/30 relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-3 text-xs text-muted-foreground -translate-y-1/2 tabular-nums"
                  style={{ top: `${(hour / 24) * 100}%` }}
                >
                  {hour === 0 ? "" : format(new Date(2026, 0, 1, hour), "h a")}
                </div>
              ))}
            </div>

            {/* Event area */}
            <div className="relative">
              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  onClick={() => {
                    const slotDate = new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      currentDate.getDate(),
                      hour
                    )
                    onTimeSlotClick(slotDate)
                  }}
                  className="absolute w-full border-t border-border/20 hover:bg-muted/30 transition-colors"
                  style={{ top: `${(hour / 24) * 100}%`, height: `${(1 / 24) * 100}%` }}
                />
              ))}

              {/* Events */}
              {timedEvents.map((event) => {
                const pos = getEventPosition(event)
                const color = getEventColor(event.colorId)
                return (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    className={cn(
                      "absolute left-2 right-2 rounded-lg border px-3 py-2 text-left overflow-hidden transition-all",
                      "hover:shadow-lg hover:z-20 hover:scale-[1.01]",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50",
                      color.bg, color.border
                    )}
                    style={{ top: pos.top, height: pos.height, minHeight: "32px" }}
                  >
                    <div className={cn("text-sm font-semibold truncate", color.text)}>
                      {event.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.startDate), "h:mm a")} – {format(new Date(event.endDate), "h:mm a")}
                    </div>
                    {event.location && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        📍 {event.location}
                      </div>
                    )}
                  </button>
                )
              })}

              {/* Current time indicator */}
              {isToday(currentDate) && (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none"
                  style={{
                    top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / (24 * 60)) * 100}%`,
                  }}
                >
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-destructive -ml-1.5 shadow-sm" />
                    <div className="flex-1 h-[2px] bg-destructive shadow-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side panel: events list */}
      <div className="w-72 shrink-0 rounded-xl border border-border/50 bg-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-sm">Today's Schedule</h3>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {dayEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
              <span className="text-2xl mb-2">📭</span>
              No events scheduled
            </div>
          )}
          {dayEvents
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .map((event) => (
              <EventCard key={event.id} event={event} onClick={onEventClick} />
            ))}
        </div>
      </div>
    </div>
  )
}
