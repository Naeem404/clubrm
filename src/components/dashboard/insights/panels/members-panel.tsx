"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, AlertTriangle, BarChart3, GraduationCap, Briefcase } from "lucide-react";
import type { MembersInsight, DemographicSlice } from "../types";

function DemographicBar({ slices, title, icon }: { slices: DemographicSlice[]; title: string; icon: React.ReactNode }) {
  const colors = [
    "bg-primary", "bg-emerald-500", "bg-amber-500", "bg-violet-500",
    "bg-pink-500", "bg-sky-500", "bg-orange-500", "bg-teal-500",
  ];
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        {icon} {title}
      </h4>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-xs w-28 truncate text-muted-foreground">{s.label}</span>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", colors[i % colors.length])}
                style={{ width: `${s.percentage}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-14 text-right">
              {s.count} ({s.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MembersPanel({ data }: { data: MembersInsight | null }) {
  if (!data) return <div className="text-sm text-muted-foreground text-center py-8">Loading member insights…</div>;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Members", value: data.totalMembers, icon: <Users className="h-4 w-4" /> },
          { label: "Active", value: data.activeMembers, icon: <Users className="h-4 w-4 text-emerald-500" /> },
          { label: "New This Term", value: data.newThisTerm, icon: <UserPlus className="h-4 w-4 text-primary" /> },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
          <div className="text-lg font-bold">{data.retentionRate}%</div>
          <div className="text-[10px] text-muted-foreground">Retention Rate</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
          <div className="text-lg font-bold">{data.avgEventsAttended}</div>
          <div className="text-[10px] text-muted-foreground">Avg Events / Member</div>
        </div>
      </div>

      {/* Recent Joiners — who exactly */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <UserPlus className="h-4 w-4 text-primary" /> Who Joined Recently
        </h4>
        <div className="space-y-1.5">
          {data.recentJoiners.map((j) => (
            <div
              key={j.name}
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {j.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{j.name}</div>
                  <div className="text-xs text-muted-foreground">{j.department} • {j.role}</div>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Joined {new Date(j.joinDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Demographics */}
      <DemographicBar slices={data.byDepartment} title="By Department" icon={<Briefcase className="h-4 w-4 text-muted-foreground" />} />
      <DemographicBar slices={data.byYear} title="By Year" icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />} />
      <DemographicBar slices={data.byRole} title="By Role" icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} />

      {/* Inactive warnings */}
      {data.inactiveWarnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Inactive Member Warnings
          </h4>
          {data.inactiveWarnings.map((w) => (
            <div key={w.name} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="text-sm font-medium">{w.name}</div>
              <div className="text-xs text-muted-foreground">
                Last active: {new Date(w.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {w.reason}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
