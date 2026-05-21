"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingDown, TrendingUp, Lightbulb } from "lucide-react";
import type { RisksInsight } from "../types";

const severityStyles = {
  high: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", badge: "destructive" as const },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", badge: "secondary" as const },
  low: { color: "text-muted-foreground", bg: "bg-muted/30 border-border/50", badge: "outline" as const },
};

const categoryIcons: Record<string, string> = {
  budget: "💰",
  events: "📅",
  members: "👥",
  tasks: "📋",
  operations: "⚙️",
};

export function RisksPanel({ data }: { data: RisksInsight | null }) {
  if (!data) return <div className="text-sm text-muted-foreground text-center py-8">Loading risk insights…</div>;
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Risks", value: data.totalRisks, color: "text-foreground" },
          { label: "High", value: data.highCount, color: "text-destructive" },
          { label: "Medium", value: data.mediumCount, color: "text-amber-500" },
          { label: "Resolved This Week", value: data.resolvedThisWeek, color: "text-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
            <div className={cn("text-xl font-bold", s.color)}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
        {data.trendingUp ? (
          <>
            <TrendingUp className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Risk count trending up — more issues detected this week</span>
          </>
        ) : (
          <>
            <TrendingDown className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-emerald-500 font-medium">Risk count trending down — improvements detected</span>
          </>
        )}
      </div>

      {/* Risk details */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-muted-foreground" /> Active Risks
        </h4>
        {data.risks.map((risk, i) => {
          const style = severityStyles[risk.severity];
          return (
            <div key={i} className={cn("p-3 rounded-lg border space-y-2", style.bg)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">{categoryIcons[risk.category] || "⚠️"}</span>
                  <div>
                    <div className="text-sm font-medium">{risk.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{risk.affectedEntity} • Detected {risk.detectedAt}</div>
                  </div>
                </div>
                <Badge variant={style.badge} className="text-[10px] shrink-0">
                  {risk.severity.toUpperCase()}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">{risk.description}</p>

              <div className="flex items-start gap-1.5 p-2 rounded-md bg-background/50 border border-border/30">
                <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-medium text-primary">Recommendation:</span>{" "}
                  <span className="text-muted-foreground">{risk.recommendation}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
