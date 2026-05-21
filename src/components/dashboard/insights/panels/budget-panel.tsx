"use client";

import { cn } from "@/lib/utils";
import { ProgressBar } from "../../progress-bar";
import { DollarSign, TrendingDown, AlertTriangle, CheckCircle, XCircle, Receipt } from "lucide-react";
import type { BudgetInsight } from "../types";

const statusColor = {
  good: "text-emerald-500",
  warning: "text-amber-500",
  critical: "text-destructive",
};

const statusIcon = {
  good: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  critical: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

export function BudgetPanel({ data }: { data: BudgetInsight | null }) {
  if (!data) return <div className="text-sm text-muted-foreground text-center py-8">Loading budget insights…</div>;
  const maxMonthly = Math.max(...data.monthlySpend.map((m) => m.value));

  return (
    <div className="space-y-6">
      {/* Top-level numbers */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Budget", value: `$${data.totalBudget.toLocaleString()}`, sub: "this term" },
          { label: "Spent", value: `$${data.spent.toLocaleString()}`, sub: `${100 - data.percentRemaining}% used` },
          { label: "Remaining", value: `$${data.remaining.toLocaleString()}`, sub: `${data.percentRemaining}% left` },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className="text-[9px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Burn rate */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-muted-foreground" /> Burn Rate
          </h4>
          <span className={cn("text-sm font-bold", data.burnRate > data.targetBurnRate ? "text-amber-500" : "text-emerald-500")}>
            ${data.burnRate.toLocaleString()}/mo
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Target: ${data.targetBurnRate.toLocaleString()}/mo • Projected runway: {data.projectedRunway}
        </div>
        <ProgressBar
          value={data.burnRate}
          max={data.targetBurnRate * 1.5}
          color={data.burnRate > data.targetBurnRate ? "amber" : "emerald"}
          label={`Current: $${data.burnRate.toLocaleString()}`}
          subLabel={`Target: $${data.targetBurnRate.toLocaleString()}`}
        />
      </div>

      {/* Monthly spend chart */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-muted-foreground" /> Monthly Spending
        </h4>
        <div className="flex items-end gap-2 h-24">
          {data.monthlySpend.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground">${(m.value / 1000).toFixed(1)}k</span>
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all",
                  m.value > data.targetBurnRate ? "bg-amber-500/70" : "bg-primary/70"
                )}
                style={{ height: `${(m.value / maxMonthly) * 64}px` }}
              />
              <span className="text-[9px] text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Spending by Category</h4>
        {data.categories.map((c) => {
          const pct = c.allocated > 0 ? Math.round((c.spent / c.allocated) * 100) : 0;
          return (
            <div key={c.name} className="space-y-1 p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {statusIcon[c.status]}
                  <span className="text-sm font-medium">{c.name}</span>
                </div>
                <span className={cn("text-xs font-mono", statusColor[c.status])}>
                  ${c.spent.toLocaleString()} / ${c.allocated.toLocaleString()} ({pct}%)
                </span>
              </div>
              <ProgressBar
                value={c.spent}
                max={c.allocated}
                color={c.status === "good" ? "emerald" : c.status === "warning" ? "amber" : "destructive"}
              />
            </div>
          );
        })}
      </div>

      {/* Biggest expenses */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Receipt className="h-4 w-4 text-muted-foreground" /> Top Expenses
        </h4>
        {data.biggestExpenses.map((e, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <div className="text-sm font-medium">{e.description}</div>
              <div className="text-xs text-muted-foreground">{e.category} • {e.date}</div>
            </div>
            <span className="text-sm font-bold">${e.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Alerts</h4>
        {data.alerts.map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/30 border border-border/50">
            {statusIcon[a.status]}
            <div>
              <span className="font-medium">{a.label}</span>
              <span className="text-muted-foreground ml-1">— {a.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
