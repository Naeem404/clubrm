import { type Member } from "./types"
import { cn, getEntityColor, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Trash2, CheckSquare, Calendar } from "lucide-react"

const ROLE_COLORS: Record<string, string> = {
  President: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "VP Internal": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "VP Finance": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "VP Events": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "VP External": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Marketing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Executive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  Administrator: "bg-red-500/20 text-red-400 border-red-500/30",
}

const MEMBER_STATUSES = [
  { value: "active", label: "Active", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "inactive", label: "Inactive", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  { value: "alumni", label: "Alumni", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
]

interface MemberCardProps {
  member: Member
  onView: (member: Member) => void
  onEdit: (member: Member) => void
  onDelete: (id: string) => void
}

const statusMeta = (status: string) => MEMBER_STATUSES.find((s) => s.value === status)

export function MemberCard({ member, onView, onEdit, onDelete }: MemberCardProps) {
  return (
    <div
      className="group bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
      onClick={() => onView(member)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold", getEntityColor(member.name))}>
          {getInitials(member.name)}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(member) }}>
              <Eye className="h-4 w-4 mr-2" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(member) }}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(member.id) }}>
              <Trash2 className="h-4 w-4 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h3 className="font-semibold text-sm">{member.name}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
      <div className="flex items-center gap-2 mt-3">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", ROLE_COLORS[member.role])}>
          {member.role}
        </span>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusMeta(member.status)?.color)}>
          {statusMeta(member.status)?.label}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {member.tasksCompleted} tasks</span>
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {member.eventsAttended} events</span>
      </div>
    </div>
  )
}
