import { useMemo } from "react"
import { useEvents } from "@/context/events-context"
import { type CalendarEvent } from "./types"
import { EventCard } from "./event-card"
import { cn } from "@/lib/utils"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from "date-fns"

interface MonthViewProps {
  currentDate: Date
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  searchQuery?: string
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthView({ currentDate, onDayClick, onEventClick, searchQuery = "" }: MonthViewProps) {
  const { getEventsForDate } = useEvents()

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <div className="flex flex-col flex-1 rounded-xl border border-border/50 overflow-hidden bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
            {week.map((day) => {
              const dayEvents = getEventsForDate(day).filter(e => {
                if (!searchQuery) return true
                const q = searchQuery.toLowerCase()
                return e.title.toLowerCase().includes(q) || (e.description?.toLowerCase().includes(q) ?? false)
              })
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isCurrentDay = isToday(day)
              const maxVisible = weeks.length > 5 ? 2 : 3

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "relative min-h-[100px] p-1.5 border-r border-border/30 last:border-r-0 text-left transition-colors duration-150",
                    "hover:bg-muted/30 focus:outline-none focus:bg-muted/40",
                    !isCurrentMonth && "opacity-40"
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-medium transition-colors",
                        isCurrentDay
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > maxVisible && (
                      <span className="text-[10px] text-muted-foreground font-medium px-1">
                        {dayEvents.length} events
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, maxVisible).map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        compact
                        onClick={onEventClick}
                      />
                    ))}
                    {dayEvents.length > maxVisible && (
                      <div className="text-[10px] text-muted-foreground font-medium pl-2 py-0.5 hover:text-primary transition-colors">
                        +{dayEvents.length - maxVisible} more
                      </div>
                    )}
                  </div>

                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
