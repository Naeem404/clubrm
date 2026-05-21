import { cn } from "@/lib/utils"
import { ArrowUpRight, AlertTriangle, Flame, Activity, Zap } from "lucide-react"

interface Insight {
  type: "success" | "warning" | "danger" | "info"
  title: string
  detail: string
}

interface SmartInsightsProps {
  insights: Insight[]
}

const insightColors = {
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  danger: "bg-red-500/10 border-red-500/20 text-red-400",
  info: "bg-blue-500/10 border-blue-500/20 text-blue-400"
}

const insightIcons = {
  success: <ArrowUpRight className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  danger: <Flame className="h-4 w-4" />,
  info: <Activity className="h-4 w-4" />
}

export function SmartInsights({ insights }: SmartInsightsProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight">
        <Zap className="h-4 w-4 text-primary" /> Smart Insights ({insights.length})
      </h3>
      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
        {insights.map((insight, i) => (
          <div key={i} className={cn("border rounded-xl p-3", insightColors[insight.type])}>
            <div className="flex items-center gap-2">
              {insightIcons[insight.type]}
              <p className="text-sm font-medium">{insight.title}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
