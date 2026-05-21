import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type CalendarView } from "./types"
import { ChevronLeft, ChevronRight, Plus, CalendarDays, LayoutGrid, Clock, Search } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface CalendarHeaderProps {
  currentDate: Date
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onNavigate: (direction: "prev" | "next" | "today") => void
  onCreateEvent: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onNavigate,
  onCreateEvent,
  searchQuery = "",
  onSearchChange,
}: CalendarHeaderProps) {
  const getTitle = () => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "week": {
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, "MMM d")} – ${format(weekEnd, "d, yyyy")}`
        }
        return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
      }
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy")
    }
  }

  const views: { value: CalendarView; label: string; icon: React.ReactNode }[] = [
    { value: "month", label: "Month", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { value: "week", label: "Week", icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { value: "day", label: "Day", icon: <Clock className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{getTitle()}</h1>
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onNavigate("prev")}
            className="hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onNavigate("today")}
            className="font-medium"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onNavigate("next")}
            className="hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-48 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
          {views.map((v) => (
            <button
              key={v.value}
              onClick={() => onViewChange(v.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                view === v.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        <Button onClick={onCreateEvent} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>
    </div>
  )
}
