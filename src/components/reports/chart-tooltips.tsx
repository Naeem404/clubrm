function fmt(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(n)
}

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
      {label && <p className="text-xs font-bold mb-2 text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] font-medium text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">
              {typeof entry.value === "number" && entry.name?.includes("$")
                ? fmt(entry.value)
                : entry.value?.toLocaleString?.() ?? entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
      {label && <p className="text-xs font-bold mb-2 text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.fill }} />
              <span className="text-[10px] font-medium text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
