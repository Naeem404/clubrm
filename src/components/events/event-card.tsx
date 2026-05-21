import { type CalendarEvent, getEventColor, getTag } from "./types"
import { cn } from "@/lib/utils"
import { Clock, MapPin, Users } from "lucide-react"
import { format } from "date-fns"

interface EventCardProps {
  event: CalendarEvent
  compact?: boolean
  onClick?: (event: CalendarEvent) => void
}

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
  const color = getEventColor(event.colorId)

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(event)
        }}
        className={cn(
          "w-full text-left rounded-md px-2 py-1 text-[11px] font-medium truncate border transition-all duration-150",
          "hover:scale-[1.02] hover:shadow-md hover:z-10 relative",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          color.bg,
          color.text,
          color.border
        )}
      >
        <div className="flex items-center gap-1.5">
          {!event.allDay && (
            <span className="opacity-70 shrink-0">
              {format(new Date(event.startDate), "h:mm")}
            </span>
          )}
          <span className="truncate">{event.title}</span>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(event)
      }}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-all duration-200 group",
        "hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        color.bg,
        color.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("h-2 w-2 rounded-full shrink-0", color.dot)} />
            <span className={cn("font-semibold text-sm truncate", color.text)}>
              {event.title}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
            {!event.allDay && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(event.startDate), "h:mm a")} – {format(new Date(event.endDate), "h:mm a")}
              </span>
            )}
            {event.allDay && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                All day
              </span>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {event.tags.slice(0, 2).map((tagId) => {
                const tag = getTag(tagId)
                if (!tag) return null
                return (
                  <span
                    key={tagId}
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border",
                      tag.color
                    )}
                  >
                    {tag.name}
                  </span>
                )
              })}
              {event.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{event.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {event.capacity && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3 w-3" />
            <span>
              {event.registered}/{event.capacity}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
