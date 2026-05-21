import { cn } from "@/lib/utils"
import { UserCheck, Target, Wallet, TrendingUp, TrendingDown, Calendar, CalendarCheck, Clock, Activity } from "lucide-react"
import { fmt } from "./chart-utils"

interface KPICard {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  color: string
  trend: string
}

interface KPICardsProps {
  kpis: KPICard[]
}

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {kpis.map(kpi => (
        <div key={kpi.label} className="bg-card border border-border/50 rounded-2xl p-3 space-y-1 hover:border-primary/30 transition-colors">
          <div className={cn("flex items-center gap-1.5", kpi.color)}>
            {kpi.icon}
            <span className="text-[10px] font-medium uppercase tracking-wide">{kpi.label}</span>
          </div>
          <p className="text-lg font-bold leading-none">{kpi.value}</p>
          <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
          <p className="text-[9px] text-muted-foreground/70 italic">{kpi.trend}</p>
        </div>
      ))}
    </div>
  )
}
