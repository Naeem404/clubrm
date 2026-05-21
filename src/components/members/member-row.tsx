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
import { MoreHorizontal, Eye, Pencil, Trash2, Mail, Phone } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"

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

interface MemberRowProps {
  member: Member
  onView: (member: Member) => void
  onEdit: (member: Member) => void
  onDelete: (id: string) => void
}

const statusMeta = (status: string) => MEMBER_STATUSES.find((s) => s.value === status)

export function MemberRow({ member, onView, onEdit, onDelete }: MemberRowProps) {
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold", getEntityColor(member.name))}>
            {getInitials(member.name)}
          </div>
          <div>
            <p className="font-medium text-sm">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", ROLE_COLORS[member.role])}>
          {member.role}
        </span>
      </TableCell>
      <TableCell>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusMeta(member.status)?.color)}>
          {statusMeta(member.status)?.label}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{member.department}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{member.year}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(member)}>
              <Eye className="h-4 w-4 mr-2" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(member)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(member.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
