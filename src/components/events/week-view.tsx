import { useMemo } from "react"
import { useEvents } from "@/context/events-context"
import { type CalendarEvent, getEventColor } from "./types"
import { cn } from "@/lib/utils"
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  format,
  isSameDay,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns"

interface WeekViewProps {
  currentDate: Date
  onEventClick: (event: CalendarEvent) => void
  onTimeSlotClick: (date: Date) => void
  searchQuery?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function WeekView({ currentDate, onEventClick, onTimeSlotClick, searchQuery = "" }: WeekViewProps) {
  const { getEventsForRange } = useEvents()

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    const end = endOfWeek(currentDate)
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const weekEvents = useMemo(() => {
    const start = startOfWeek(currentDate)
    const end = endOfWeek(currentDate)
    return getEventsForRange(start, end).filter(e => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return e.title.toLowerCase().includes(q) || (e.description?.toLowerCase().includes(q) ?? false)
    })
  }, [currentDate, getEventsForRange, searchQuery])

  const getEventsForDay = (day: Date) => {
    return weekEvents.filter((event) => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
      return eventStart <= dayEnd && eventEnd >= dayStart && !event.allDay
    })
  }

  const allDayEvents = weekEvents.filter((e) => e.allDay)

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
    <div className="flex flex-col flex-1 rounded-xl border border-border/50 overflow-hidden bg-card">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
        <div className="border-r border-border/30" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "py-3 text-center border-r border-border/30 last:border-r-0",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-xl font-bold mt-0.5 inline-flex items-center justify-center h-9 w-9 rounded-full",
                isToday(day)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
          <div className="border-r border-border/30 px-2 py-1 text-[10px] text-muted-foreground flex items-center justify-end">
            ALL DAY
          </div>
          {weekDays.map((day) => {
            const dayAllDay = allDayEvents.filter((e) => isSameDay(new Date(e.startDate), day))
            return (
              <div key={day.toISOString()} className="border-r border-border/30 last:border-r-0 p-1 space-y-0.5">
                {dayAllDay.map((event) => {
                  const color = getEventColor(event.colorId)
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "w-full text-left rounded px-2 py-0.5 text-[11px] font-medium truncate border transition-all hover:scale-[1.02]",
                        color.bg, color.text, color.border
                      )}
                    >
                      {event.title}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${24 * 60}px` }}>
          {/* Time labels */}
          <div className="border-r border-border/30 relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 text-[10px] text-muted-foreground -translate-y-1/2"
                style={{ top: `${(hour / 24) * 100}%` }}
              >
                {hour === 0 ? "" : format(new Date(2026, 0, 1, hour), "h a")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day)
            return (
              <div key={day.toISOString()} className={cn("relative border-r border-border/30 last:border-r-0", isToday(day) && "bg-primary/2")}>
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => {
                      const slotDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour)
                      onTimeSlotClick(slotDate)
                    }}
                    className="absolute w-full border-t border-border/20 hover:bg-muted/30 transition-colors"
                    style={{ top: `${(hour / 24) * 100}%`, height: `${(1 / 24) * 100}%` }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
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
                        "absolute left-1 right-1 rounded-md border px-2 py-1 text-left overflow-hidden transition-all",
                        "hover:shadow-lg hover:z-20 hover:scale-[1.02]",
                        "focus:outline-none focus:ring-2 focus:ring-primary/50",
                        color.bg, color.border
                      )}
                      style={{ top: pos.top, height: pos.height, minHeight: "24px" }}
                    >
                      <div className={cn("text-[11px] font-semibold truncate", color.text)}>
                        {event.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {format(new Date(event.startDate), "h:mm a")}
                      </div>
                    </button>
                  )
                })}

                {/* Current time indicator */}
                {isToday(day) && (
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
