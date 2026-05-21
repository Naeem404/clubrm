"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, FileText, DollarSign, Megaphone, Settings } from "lucide-react";
import type { ApprovalsInsight } from "../types";

const typeIcons: Record<string, React.ReactNode> = {
  event: <FileText className="h-4 w-4 text-primary" />,
  finance: <DollarSign className="h-4 w-4 text-emerald-500" />,
  marketing: <Megaphone className="h-4 w-4 text-violet-500" />,
  budget_change: <Settings className="h-4 w-4 text-amber-500" />,
};

const priorityStyles = {
  high: { color: "text-destructive", badge: "destructive" as const },
  medium: { color: "text-amber-500", badge: "secondary" as const },
  low: { color: "text-muted-foreground", badge: "outline" as const },
};

export function ApprovalsPanel({ data }: { data: ApprovalsInsight | null }) {
  if (!data) return <div className="text-sm text-muted-foreground text-center py-8">Loading approvals…</div>;
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: data.totalPending, color: "text-foreground" },
          { label: "Avg Wait", value: `${data.avgWaitDays}d`, color: "text-amber-500" },
          { label: "Oldest Item", value: `${data.oldestItem}d`, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
            <div className={cn("text-xl font-bold", s.color)}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* By type breakdown */}
      <div className="flex gap-2 flex-wrap">
        {data.byType.map((t) => (
          <div key={t.type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
            <span className="text-xs font-medium">{t.type}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.count}</Badge>
          </div>
        ))}
      </div>

      {/* Pending items */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" /> Pending Items
        </h4>
        {data.items.map((item) => {
          const pStyle = priorityStyles[item.priority];
          return (
            <div key={item.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {typeIcons[item.type] || <FileText className="h-4 w-4" />}
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.submittedBy} • {item.submittedAt}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.amount && (
                    <span className="text-xs font-mono font-medium">${item.amount}</span>
                  )}
                  <Badge variant={pStyle.badge} className="text-[10px]">
                    {item.priority}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Waiting {item.daysWaiting} day{item.daysWaiting !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recently approved */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-emerald-500" /> Recently Approved
        </h4>
        {data.recentlyApproved.map((a, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-sm">{a.title}</span>
            </div>
            <div className="text-xs text-muted-foreground">{a.type} • {a.approvedAt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
