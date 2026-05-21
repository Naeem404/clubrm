"use client";

import { cn } from "@/lib/utils";
import { ProgressBar } from "../../progress-bar";
import { Calendar, Users, CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import type { EventsInsight } from "../types";

const statusStyles = {
  on_track: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "On Track" },
  at_risk: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: "At Risk" },
  critical: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Critical" },
};

export function EventsPanel({ data }: { data: EventsInsight | null }) {
  if (!data) return <div className="text-sm text-muted-foreground text-center py-8">Loading events insights…</div>;
  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Upcoming Events", value: data.totalUpcoming, icon: <Calendar className="h-4 w-4" /> },
          { label: "Avg Registration", value: `${data.avgRegistrationRate}%`, icon: <Users className="h-4 w-4 text-primary" /> },
          { label: "Volunteer Coverage", value: `${data.volunteerCoverageRate}%`, icon: <Users className="h-4 w-4 text-emerald-500" /> },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Registration trend mini-chart */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> Registration Rate Trend
        </h4>
        <div className="flex items-end gap-2 h-16">
          {data.trend.map((pt) => (
            <div key={pt.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground">{pt.value}%</span>
              <div
                className={cn(
                  "w-full rounded-t-sm",
                  pt.value < 60 ? "bg-destructive/70" : pt.value < 75 ? "bg-amber-500/70" : "bg-emerald-500/70"
                )}
                style={{ height: `${Math.max(4, pt.value * 0.5)}px` }}
              />
              <span className="text-[9px] text-muted-foreground">{pt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-event detail cards */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Event Breakdown</h4>
        {data.events.map((ev) => {
          const style = statusStyles[ev.status];
          const regPct = ev.capacity > 0 ? Math.round((ev.registered / ev.capacity) * 100) : 0;
          const volPct = ev.volunteersNeeded > 0 ? Math.round((ev.volunteersFilled / ev.volunteersNeeded) * 100) : 100;
          return (
            <div key={ev.title} className={cn("p-3 rounded-lg border space-y-3", style.bg)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">{ev.date}</div>
                </div>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", style.color, style.bg)}>
                  {style.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Registration</div>
                  <ProgressBar
                    value={ev.registered}
                    max={ev.capacity}
                    label={`${ev.registered}/${ev.capacity}`}
                    subLabel={`${regPct}%`}
                    color={regPct >= 70 ? "emerald" : regPct >= 50 ? "amber" : "destructive"}
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Volunteers</div>
                  <ProgressBar
                    value={ev.volunteersFilled}
                    max={ev.volunteersNeeded}
                    label={`${ev.volunteersFilled}/${ev.volunteersNeeded}`}
                    subLabel={`${volPct}%`}
                    color={volPct >= 100 ? "emerald" : volPct >= 50 ? "amber" : "destructive"}
                  />
                </div>
              </div>

              {ev.risks.length > 0 && (
                <div className="space-y-1">
                  {ev.risks.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Strengths & Concerns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-emerald-500 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Strengths
          </h4>
          {data.strengths.map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-5">• {s}</p>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Concerns
          </h4>
          {data.concerns.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-5">• {c}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
