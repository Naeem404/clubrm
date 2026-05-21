import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  type CalendarEvent,
  type EventColor,
  type EventTag,
  EVENT_COLORS,
  DEFAULT_TAGS,
  MOCK_MEMBERS,
  getEventColor,
  getTag,
  getCollaborator,
} from "./types"
import { cn } from "@/lib/utils"
import { useMembers } from "@/context/members-context"
import type { Collaborator } from "./types"
import {
  MapPin,
  Clock,
  Users,
  Tag,
  Palette,
  Globe,
  Lock,
  Trash2,
  Calendar,
  AlignLeft,
  X,
} from "lucide-react"
import { format } from "date-fns"

interface EventModalProps {
  open: boolean
  onClose: () => void
  event?: CalendarEvent | null
  defaultDate?: Date | null
  onSave: (event: CalendarEvent) => void
  onDelete?: (id: string) => void
}

export function EventModal({
  open,
  onClose,
  event,
  defaultDate,
  onSave,
  onDelete,
}: EventModalProps) {
  const isEditing = !!event
  const { members } = useMembers()

  // Build collaborator list from dynamic members
  const dynamicCollaborators: Collaborator[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    initials: m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
    role: m.role,
  }))
  const collaboratorList = dynamicCollaborators.length > 0 ? dynamicCollaborators : MOCK_MEMBERS

  const getDefaultStart = () => {
    if (defaultDate) return defaultDate
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 1)
    return now
  }

  const getDefaultEnd = () => {
    const start = getDefaultStart()
    const end = new Date(start)
    end.setHours(end.getHours() + 1)
    return end
  }

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState("")
  const [colorId, setColorId] = useState("blue")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(true)
  const [capacity, setCapacity] = useState("")
  const [status, setStatus] = useState<"draft" | "confirmed" | "cancelled">("confirmed")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false)
  const [collaboratorSearch, setCollaboratorSearch] = useState("")

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description)
      setStartDate(format(new Date(event.startDate), "yyyy-MM-dd"))
      setStartTime(format(new Date(event.startDate), "HH:mm"))
      setEndDate(format(new Date(event.endDate), "yyyy-MM-dd"))
      setEndTime(format(new Date(event.endDate), "HH:mm"))
      setAllDay(event.allDay)
      setLocation(event.location)
      setColorId(event.colorId)
      setSelectedTags(event.tags)
      setSelectedCollaborators(event.collaborators)
      setIsPublic(event.isPublic)
      setCapacity(event.capacity?.toString() || "")
      setStatus(event.status)
    } else {
      const defaultStart = getDefaultStart()
      const defaultEnd = getDefaultEnd()
      setTitle("")
      setDescription("")
      setStartDate(format(defaultStart, "yyyy-MM-dd"))
      setStartTime(format(defaultStart, "HH:mm"))
      setEndDate(format(defaultEnd, "yyyy-MM-dd"))
      setEndTime(format(defaultEnd, "HH:mm"))
      setAllDay(false)
      setLocation("")
      setColorId("blue")
      setSelectedTags([])
      setSelectedCollaborators(["1"])
      setIsPublic(true)
      setCapacity("")
      setStatus("confirmed")
    }
    setShowColorPicker(false)
    setShowTagPicker(false)
    setShowCollaboratorPicker(false)
    setCollaboratorSearch("")
  }, [event, defaultDate, open])

  const handleSave = () => {
    if (!title.trim()) return

    const start = allDay
      ? new Date(`${startDate}T00:00:00`)
      : new Date(`${startDate}T${startTime}:00`)
    const end = allDay
      ? new Date(`${endDate}T23:59:59`)
      : new Date(`${endDate}T${endTime}:00`)

    const newEvent: CalendarEvent = {
      id: event?.id || `evt-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      startDate: start,
      endDate: end,
      allDay,
      location: location.trim(),
      colorId,
      tags: selectedTags,
      collaborators: selectedCollaborators,
      createdBy: event?.createdBy || "1",
      capacity: capacity ? parseInt(capacity) : undefined,
      registered: event?.registered,
      isPublic,
      status,
    }

    onSave(newEvent)
    onClose()
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  const toggleCollaborator = (id: string) => {
    setSelectedCollaborators((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const filteredMembers = collaboratorList.filter(
    (m) =>
      m.name.toLowerCase().includes(collaboratorSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(collaboratorSearch.toLowerCase())
  )

  const currentColor = getEventColor(colorId)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Color accent bar */}
        <div className={cn("h-1.5 w-full rounded-t-lg", currentColor.dot)} />

        <DialogHeader className="px-6 pt-4 pb-0">
          <DialogTitle className="text-lg">
            {isEditing ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update the event details below."
              : "Fill in the details to create a new event."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 overflow-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          <div className="space-y-5 py-4">
            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="title" className="text-sm font-medium">
                  Event Title
                </Label>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tech Talk: AI in 2026"
                className="h-10"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
              </div>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Date & Time</Label>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={allDay}
                    onCheckedChange={(checked) => setAllDay(checked === true)}
                  />
                  <span className="text-sm text-muted-foreground">All day</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 h-9 text-xs"
                    />
                    {!allDay && (
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-28 h-9 text-xs"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 h-9 text-xs"
                    />
                    {!allDay && (
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-28 h-9 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="location" className="text-sm font-medium">
                  Location
                </Label>
              </div>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Room 101, Engineering Building"
                className="h-9"
              />
            </div>

            <Separator className="my-1" />

            {/* Color Picker */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 w-full group"
              >
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium cursor-pointer">Color</Label>
                <div className="ml-auto flex items-center gap-2">
                  <div className={cn("h-4 w-4 rounded-full", currentColor.dot)} />
                  <span className="text-xs text-muted-foreground">{currentColor.name}</span>
                </div>
              </button>

              {showColorPicker && (
                <div className="flex gap-2 flex-wrap pl-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  {EVENT_COLORS.map((color: EventColor) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setColorId(color.id)
                        setShowColorPicker(false)
                      }}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all duration-200 hover:scale-110",
                        color.dot,
                        colorId === color.id
                          ? "border-white scale-110 shadow-lg"
                          : "border-transparent opacity-70 hover:opacity-100"
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="flex items-center gap-2 w-full"
              >
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium cursor-pointer">Tags</Label>
                {selectedTags.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {selectedTags.length} selected
                  </span>
                )}
              </button>

              {selectedTags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pl-6">
                  {selectedTags.map((tagId) => {
                    const tag = getTag(tagId)
                    if (!tag) return null
                    return (
                      <Badge
                        key={tagId}
                        variant="outline"
                        className={cn("text-[11px] gap-1 cursor-pointer hover:opacity-80", tag.color)}
                        onClick={() => toggleTag(tagId)}
                      >
                        {tag.name}
                        <X className="h-3 w-3" />
                      </Badge>
                    )
                  })}
                </div>
              )}

              {showTagPicker && (
                <div className="flex gap-2 flex-wrap pl-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  {DEFAULT_TAGS.map((tag: EventTag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all duration-150",
                        selectedTags.includes(tag.id)
                          ? cn(tag.color, "ring-2 ring-primary/30")
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Collaborators */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCollaboratorPicker(!showCollaboratorPicker)}
                className="flex items-center gap-2 w-full"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium cursor-pointer">Collaborators</Label>
                {selectedCollaborators.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {selectedCollaborators.length} people
                  </span>
                )}
              </button>

              {selectedCollaborators.length > 0 && (
                <div className="flex -space-x-2 pl-6">
                  {selectedCollaborators.slice(0, 8).map((id) => {
                    const member = getCollaborator(id)
                    if (!member) return null
                    return (
                      <Avatar
                        key={id}
                        className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 hover:scale-110 transition-transform"
                        onClick={() => toggleCollaborator(id)}
                        title={`${member.name} (click to remove)`}
                      >
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    )
                  })}
                  {selectedCollaborators.length > 8 && (
                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                      +{selectedCollaborators.length - 8}
                    </div>
                  )}
                </div>
              )}

              {showCollaboratorPicker && (
                <div className="pl-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Input
                    placeholder="Search members..."
                    value={collaboratorSearch}
                    onChange={(e) => setCollaboratorSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="max-h-40 overflow-auto space-y-0.5 rounded-md border border-border/50 p-1">
                    {filteredMembers.map((member) => {
                      const isSelected = selectedCollaborators.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleCollaborator(member.id)}
                          className={cn(
                            "flex items-center gap-3 w-full rounded-md px-2 py-1.5 text-left transition-colors",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{member.name}</div>
                            <div className="text-[10px] text-muted-foreground">{member.role}</div>
                          </div>
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-1" />

            {/* Capacity */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="capacity" className="text-sm font-medium">
                  Capacity
                </Label>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 50"
                className="h-9 w-32"
                min={1}
              />
            </div>

            {/* Visibility & Status */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                />
                <div className="flex items-center gap-1.5">
                  {isPublic ? (
                    <Globe className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span className="text-sm">{isPublic ? "Public" : "Private"}</span>
                </div>
              </label>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Status:</Label>
                <div className="flex gap-1">
                  {(["draft", "confirmed", "cancelled"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all capitalize",
                        status === s
                          ? s === "confirmed"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : s === "draft"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between w-full">
            <div>
              {isEditing && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                  onClick={() => {
                    onDelete(event!.id)
                    onClose()
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
                {isEditing ? "Save Changes" : "Create Event"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
