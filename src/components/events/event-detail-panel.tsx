import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  type CalendarEvent,
  type Collaborator,
  getEventColor,
  getTag,
  getCollaborator,
} from "./types"
import { cn } from "@/lib/utils"
import { useMembers } from "@/context/members-context"
import {
  MapPin,
  Clock,
  Users,
  Globe,
  Lock,
  Edit2,
  Trash2,
  Calendar,
  Tag,
  User,
} from "lucide-react"
import { format } from "date-fns"
import { AddToGoogleCalendar } from "@/components/events/add-to-google-calendar"

interface EventDetailPanelProps {
  open: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: (event: CalendarEvent) => void
  onDelete: (id: string) => void
}

export function EventDetailPanel({
  open,
  onClose,
  event,
  onEdit,
  onDelete,
}: EventDetailPanelProps) {
  const { members } = useMembers()

  // Build collaborator list from dynamic members
  const dynamicCollaborators: Collaborator[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    initials: m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
    role: m.role,
  }))

  if (!event) return null

  const color = getEventColor(event.colorId)
  const creator = getCollaborator(event.createdBy, dynamicCollaborators)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        {/* Color accent bar */}
        <div className={cn("h-2 w-full", color.dot)} />

        <div className="px-6 pt-3 pb-5 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("h-3 w-3 rounded-full shrink-0", color.dot)} />
                <DialogTitle className="text-lg truncate">{event.title}</DialogTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    onClose()
                    setTimeout(() => onEdit(event), 150)
                  }}
                  className="hover:bg-muted"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    onDelete(event.id)
                    onClose()
                  }}
                  className="hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Status badge */}
            <DialogDescription className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border capitalize",
                    event.status === "confirmed"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : event.status === "draft"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                  )}
                >
                  {event.status}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {event.isPublic ? (
                    <>
                      <Globe className="h-3 w-3 text-emerald-400" /> Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 text-amber-400" /> Private
                    </>
                  )}
                </span>
            </DialogDescription>
          </DialogHeader>

          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">
                {format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {event.allDay
                  ? "All day"
                  : `${format(new Date(event.startDate), "h:mm a")} – ${format(new Date(event.endDate), "h:mm a")}`}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">{event.location}</div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </>
          )}

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex gap-1.5 flex-wrap">
                {event.tags.map((tagId) => {
                  const tag = getTag(tagId)
                  if (!tag) return null
                  return (
                    <Badge
                      key={tagId}
                      variant="outline"
                      className={cn("text-[11px]", tag.color)}
                    >
                      {tag.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Capacity */}
          {event.capacity && (
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>
                    {event.registered || 0} / {event.capacity} registered
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(((event.registered || 0) / event.capacity) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", color.dot)}
                    style={{
                      width: `${Math.min(((event.registered || 0) / event.capacity) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Collaborators */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Collaborators ({event.collaborators.length})
            </div>
            <div className="space-y-1.5">
              {event.collaborators.map((id) => {
                const member = getCollaborator(id, dynamicCollaborators)
                if (!member) return null
                const isCreator = id === event.createdBy
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        {member.name}
                        {isCreator && (
                          <span className="text-[9px] bg-primary/20 text-primary px-1 py-px rounded font-bold">
                            CREATOR
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{member.role}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Created by */}
          {creator && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
              <User className="h-3 w-3" />
              Created by {creator.name}
            </div>
          )}

          <Separator />

          {/* Google Calendar sync */}
          <AddToGoogleCalendar event={event} />
        </div>
      </DialogContent>
    </Dialog>
  )
}