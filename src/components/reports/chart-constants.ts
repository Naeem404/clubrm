export const PIE_COLORS = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb923c", "#f87171", "#06b6d4", "#e879f9"]

export const STATUS_COLORS: Record<string, string> = {
  backlog: "#64748b",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  done: "#10b981",
}

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
}

export const AXIS_TICK = { fontSize: 11, fill: "#94a3b8" }
export const AXIS_TICK_SM = { fontSize: 10, fill: "#94a3b8" }
export const GRID_PROPS = {
  strokeDasharray: "3 3",
  vertical: false,
  stroke: "hsl(var(--border))",
  opacity: 0.4,
} as const
export const XAXIS_PROPS = { tick: AXIS_TICK, tickLine: false, axisLine: false } as const
export const YAXIS_PROPS = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  tickFormatter: (v: number) => v > 999 ? `${(v / 1000).toFixed(1)}k` : String(v),
} as const
export const CURSOR_PROPS = { fill: "hsl(var(--muted))", opacity: 0.2 }
