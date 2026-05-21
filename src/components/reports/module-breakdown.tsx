import { BarChart3 } from "lucide-react"
import { fmt } from "./chart-utils"

interface ModuleBreakdownItem {
  label: string
  val: number
  max: number
  color: string
  detail: string
}

interface ModuleBreakdownProps {
  items: ModuleBreakdownItem[]
}

export function ModuleBreakdown({ items }: ModuleBreakdownProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight">
        <BarChart3 className="h-4 w-4 text-primary" /> Module Breakdown
      </h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground text-xs">{item.val} / {item.max} ({item.max > 0 ? ((item.val / item.max) * 100).toFixed(0) : 0}%)</span>
            </div>
            <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.max > 0 ? (item.val / item.max) * 100 : 0}%`, backgroundColor: item.color }} />
            </div>
            <p className="text-[10px] text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
