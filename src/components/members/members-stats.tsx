import { Users, UserCheck, UserX, GraduationCap } from "lucide-react"

interface MembersStatsProps {
  total: number
  active: number
  inactive: number
  alumni: number
}

export function MembersStats({ total, active, inactive, alumni }: MembersStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Total</span>
        </div>
        <p className="text-2xl font-bold">{total}</p>
      </div>
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
        <div className="flex items-center gap-2 text-emerald-400">
          <UserCheck className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Active</span>
        </div>
        <p className="text-2xl font-bold">{active}</p>
      </div>
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
        <div className="flex items-center gap-2 text-slate-400">
          <UserX className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Inactive</span>
        </div>
        <p className="text-2xl font-bold">{inactive}</p>
      </div>
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
        <div className="flex items-center gap-2 text-violet-400">
          <GraduationCap className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Alumni</span>
        </div>
        <p className="text-2xl font-bold">{alumni}</p>
      </div>
    </div>
  )
}
