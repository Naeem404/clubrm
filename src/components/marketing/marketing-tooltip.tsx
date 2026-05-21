import { formatNumber } from "./types"

type TooltipEntry = { color: string; name: string; value: number }
type TooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string }

export function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-xs font-bold mb-2 text-foreground">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] font-medium text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="text-[10px] font-bold text-foreground">{formatNumber(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}
