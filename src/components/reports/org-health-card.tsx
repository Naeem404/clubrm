import { cn } from "@/lib/utils"
import { ResponsiveContainer, RadialBarChart, RadialBar } from "recharts"

interface OrgHealthCardProps {
  orgHealth: number
  healthColor: string
  healthBg: string
  healthLabel: string
  healthRadial: { name: string; value: number; fill: string }[]
}

export function OrgHealthCard({
  orgHealth,
  healthColor,
  healthBg,
  healthLabel,
  healthRadial,
}: OrgHealthCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center justify-center">
      <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider mb-1">Org Health Score</p>
      <div className="relative">
        <ResponsiveContainer width={140} height={140}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={healthRadial}>
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--muted))" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className={cn("text-3xl font-bold", healthColor)}>{orgHealth}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <div className={cn("h-2 w-2 rounded-full", healthBg)} />
        <span className={cn("text-xs font-medium", healthColor)}>{healthLabel}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">Based on retention, tasks, budget & events</p>
    </div>
  )
}
