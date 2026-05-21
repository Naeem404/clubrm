"use client";

import { cn } from "@/lib/utils";
import { ProgressBar } from "../../progress-bar";
import { ArrowUpRight, ArrowDownRight, CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import type { OrgHealthInsight } from "../types";

const statusIcon = {
  good: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  critical: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

const statusColor = {
  good: "text-emerald-500",
  warning: "text-amber-500",
  critical: "text-destructive",
};

export function OrgHealthPanel({ data }: { data: OrgHealthInsight | null }) {
  if (!data) return <div className="text-sm text-muted-foreground text-center py-8">Loading health insights…</div>;
  const delta = data.overallScore - data.previousScore;

  const isUp = delta > 0;

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 border-primary/30 bg-primary/5">
          <span className="text-2xl font-bold">{data.overallScore}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
        <div className="flex-1 space-y-1">
          <div className={cn("flex items-center gap-1 text-sm font-medium", isUp ? "text-emerald-500" : "text-destructive")}>
            {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(delta)} points vs last month
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {data.trend.map((pt) => (
              <div key={pt.label} className="flex flex-col items-center">
                <div
                  className="w-8 bg-primary/20 rounded-sm relative overflow-hidden"
                  style={{ height: `${Math.max(8, pt.value * 0.4)}px` }}
                >
                  <div
                    className="absolute bottom-0 w-full bg-primary rounded-sm"
                    style={{ height: `${pt.value}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5">{pt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category breakdowns */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Score Breakdown
        </h4>
        {data.breakdowns.map((b) => (
          <div key={b.category} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{b.category}</span>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-bold", statusColor[b.status])}>
                  {b.score}/{b.maxScore}
                </span>
                {statusIcon[b.status]}
              </div>
            </div>
            <ProgressBar
              value={b.score}
              max={b.maxScore}
              color={b.status === "good" ? "emerald" : b.status === "warning" ? "amber" : "destructive"}
            />
            <div className="space-y-1 mt-2">
              {b.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0">{statusIcon[ins.status]}</span>
                  <div>
                    <span className="font-medium">{ins.label}</span>
                    <span className="text-muted-foreground ml-1">— {ins.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Strengths & Concerns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-emerald-500 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> What's Going Well
          </h4>
          {data.topStrengths.map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-5">• {s}</p>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Needs Attention
          </h4>
          {data.topConcerns.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-5">• {c}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
