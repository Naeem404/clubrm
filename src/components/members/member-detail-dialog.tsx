import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type Member } from "./types"
import { cn, getEntityColor, getInitials } from "@/lib/utils"
import { Mail, Phone, CheckSquare, Calendar, User } from "lucide-react"

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

interface MemberDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
}

const statusMeta = (status: string) => MEMBER_STATUSES.find((s) => s.value === status)

export function MemberDetailDialog({ open, onOpenChange, member }: MemberDetailDialogProps) {
  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4">
            <div className={cn("h-16 w-16 rounded-full flex items-center justify-center text-xl font-semibold", getEntityColor(member.name))}>
              {getInitials(member.name)}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Contact</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{member.phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Role</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", ROLE_COLORS[member.role])}>
                  {member.role}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusMeta(member.status)?.color)}>
                  {statusMeta(member.status)?.label}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Department</p>
                <p>{member.department}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Year</p>
                <p>{member.year}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Activity</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span>{member.tasksCompleted} tasks completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{member.eventsAttended} events attended</span>
              </div>
            </div>
          </div>

          {member.bio && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bio</h4>
              <p className="text-sm">{member.bio}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
