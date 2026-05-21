export interface EventColor {
  id: string
  name: string
  bg: string
  text: string
  border: string
  dot: string
  light: string
}

export const EVENT_COLORS: EventColor[] = [
  { id: "rose", name: "Rose", bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-500", light: "bg-rose-500/10" },
  { id: "orange", name: "Orange", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500", light: "bg-orange-500/10" },
  { id: "amber", name: "Amber", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500", light: "bg-amber-500/10" },
  { id: "emerald", name: "Emerald", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500", light: "bg-emerald-500/10" },
  { id: "cyan", name: "Cyan", bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-500", light: "bg-cyan-500/10" },
  { id: "blue", name: "Blue", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500", light: "bg-blue-500/10" },
  { id: "violet", name: "Violet", bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-500", light: "bg-violet-500/10" },
  { id: "pink", name: "Pink", bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30", dot: "bg-pink-500", light: "bg-pink-500/10" },
  { id: "slate", name: "Slate", bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30", dot: "bg-slate-500", light: "bg-slate-500/10" },
]

export interface EventTag {
  id: string
  name: string
  color: string
}

export const DEFAULT_TAGS: EventTag[] = [
  { id: "workshop", name: "Workshop", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "social", name: "Social", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { id: "meeting", name: "Meeting", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { id: "networking", name: "Networking", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "fundraiser", name: "Fundraiser", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { id: "competition", name: "Competition", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "guest-speaker", name: "Guest Speaker", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { id: "study-session", name: "Study Session", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
]

export interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  initials: string
  role: string
}

export const MOCK_MEMBERS: Collaborator[] = [
  { id: "1", name: "John Doe", email: "john@uni.edu", initials: "JD", role: "President" },
  { id: "2", name: "Sarah Smith", email: "sarah@uni.edu", initials: "SS", role: "VP Events" },
  { id: "3", name: "Mike Johnson", email: "mike@uni.edu", initials: "MJ", role: "VP Internal" },
  { id: "4", name: "Emily Chen", email: "emily@uni.edu", initials: "EC", role: "VP Finance" },
  { id: "5", name: "Alex Brown", email: "alex@uni.edu", initials: "AB", role: "VP External" },
  { id: "6", name: "Lisa Wang", email: "lisa@uni.edu", initials: "LW", role: "Marketing" },
  { id: "7", name: "Tom Davis", email: "tom@uni.edu", initials: "TD", role: "Executive" },
  { id: "8", name: "Rachel Kim", email: "rachel@uni.edu", initials: "RK", role: "Executive" },
  { id: "9", name: "David Park", email: "david@uni.edu", initials: "DP", role: "Executive" },
  { id: "10", name: "Nina Patel", email: "nina@uni.edu", initials: "NP", role: "Executive" },
]

export type CalendarView = "month" | "week" | "day"

export interface CalendarEvent {
  id: string
  title: string
  description: string
  startDate: Date
  endDate: Date
  allDay: boolean
  location: string
  colorId: string
  tags: string[]
  collaborators: string[]
  createdBy: string
  capacity?: number
  registered?: number
  isPublic: boolean
  status: "draft" | "confirmed" | "cancelled"
}

export function getEventColor(colorId: string): EventColor {
  return EVENT_COLORS.find((c) => c.id === colorId) || EVENT_COLORS[5]
}

export function getTag(tagId: string): EventTag | undefined {
  return DEFAULT_TAGS.find((t) => t.id === tagId)
}

export function getCollaborator(id: string, dynamicMembers?: Collaborator[]): Collaborator | undefined {
  if (dynamicMembers && dynamicMembers.length > 0) {
    return dynamicMembers.find((m) => m.id === id)
  }
  return MOCK_MEMBERS.find((m) => m.id === id)
}
