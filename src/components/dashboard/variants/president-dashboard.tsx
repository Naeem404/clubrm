import { useState, useEffect, useMemo } from "react";
import { logError } from "@/lib/logger";
import { useAuth } from "@/context/auth-context";
import { StatCard } from "../stat-card";
import { Widget } from "../widget";
import { ProgressBar } from "../progress-bar";
import { DashboardList, DashboardListItem } from "../dashboard-list";
import { Users, Calendar, AlertTriangle, Activity, DollarSign } from "lucide-react";
import { ExpandableTile } from "../insights/expandable-tile";
import { OrgHealthPanel } from "../insights/panels/org-health-panel";
import { MembersPanel } from "../insights/panels/members-panel";
import { BudgetPanel } from "../insights/panels/budget-panel";
import { EventsPanel } from "../insights/panels/events-panel";
import { useEvents } from "@/context/events-context";
import { useFinance } from "@/context/finance-context";
import { useTasks } from "@/context/tasks-context";
import { format } from "date-fns";
import { DashboardLayoutProvider, useDashboardLayout } from "../customization/dashboard-layout-provider";
import { useDashboardInsights } from "@/hooks/use-dashboard-insights";
import { SortableWidget } from "../customization/sortable-widget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { DashboardControls } from "../customization/dashboard-controls";
import { ApprovalQueueWidget } from "../widgets/approval-queue-widget";
import { RiskAlertsWidget } from "../widgets/risk-alerts-widget";
import { PRESIDENT_WIDGET_TITLES, PRESIDENT_DEFAULT_WIDGETS } from "../widget-config";

import type { DashboardInsightsResult } from "@/lib/dashboard-logic";

// Full API response type shape — produced by the same buildDashboardInsights() used client-side.
type DashboardAPIResponse = DashboardInsightsResult;

function isDashboardResponse(v: unknown): v is DashboardAPIResponse {
  const o = v as Partial<DashboardAPIResponse> | null;
  return !!o && typeof o === "object" && !!o.stats && !!o.insights && typeof o.score === "number";
}

export function PresidentDashboard() {
  return (
    <DashboardLayoutProvider role="President" defaultWidgets={PRESIDENT_DEFAULT_WIDGETS}>
      <PresidentDashboardContent />
    </DashboardLayoutProvider>
  );
}

function PresidentDashboardContent() {
  const [apiData, setApiData] = useState<DashboardAPIResponse | null>(null);
  // Live client-side insights — used as fallback when API is unavailable (local dev)
  const liveInsights = useDashboardInsights();
  const { session } = useAuth();
  const { isCustomizing, layout, visibleWidgets } = useDashboardLayout();

  const accessToken = session?.access_token;
  useEffect(() => {
    // The endpoint requires auth; without a token rely on live client insights.
    if (!accessToken) {
      setApiData(null);
      return;
    }
    const controller = new AbortController();
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Stats request failed (${res.status})`);
        const data: unknown = await res.json();
        if (!isDashboardResponse(data)) throw new Error("Unexpected stats response shape");
        setApiData(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setApiData(null);
        logError("Failed to fetch stats", 'PresidentDashboard', err);
      }
    }
    fetchStats();
    return () => controller.abort();
  }, [accessToken]);

  const { expenses, reimbursements, totalPending, updateExpenseStatus, updateReimbursementStatus } = useFinance();
  const { events, updateEvent } = useEvents();
  const { tasks, moveTask } = useTasks();

  // Loading and Error states
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);

  const handleApprove = async (id: string, type: "finance" | "reimbursement", e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActioningId(`approve-${id}`);
    setStateError(null);
    try {
      if (type === "finance") {
        await updateExpenseStatus(id, "approved", "President"); 
      } else {
        await updateReimbursementStatus(id, "approved", "President");
      }
    } catch (err: any) {
      logError("Approval failed", 'PresidentDashboard', err);
      setStateError(err.message || "Failed to approve item. Check permissions.");
    } finally {
      setActioningId(null);
    }
  };

  const handleResolveTask = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActioningId(`task-${id}`);
    setStateError(null);
    try {
      await moveTask(id, "done");
    } catch (err: any) {
      setStateError("Failed to update task status.");
    } finally {
      setActioningId(null);
    }
  };

  const handleRSVP = async (event: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActioningId(`rsvp-${event.id}`);
    setStateError(null);
    try {
      await updateEvent({ ...event, registered: (event.registered || 0) + 1 });
    } catch (err: any) {
      setStateError("Failed to register for event.");
    } finally {
      setActioningId(null);
    }
  };

  // Prefer server data when available; otherwise the identical client-side computation.
  const healthScore = apiData?.score ?? liveInsights.score;
  const previousScore = (apiData?.insights.orgHealth ?? liveInsights.orgHealth).previousScore;
  const budgetInsight = apiData?.insights.budget ?? liveInsights.budget;

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [events]);

  const risks = useMemo(() => {
    if (apiData?.insights?.risks?.risks && apiData.insights.risks.risks.length > 0) {
      return apiData.insights.risks.risks.slice(0, 3).map((r, i) => ({
        // Risks have no DB id; index + title is stable across renders.
        id: `api-${i}-${r.title}`,
        title: r.title,
        sub: r.description,
        severity: r.severity === "high" ? "High" : r.severity === "medium" ? "Medium" : "Low",
        type: "api",
      }));
    }
    const items: { id: string; title: string; sub: string; severity: string; type: string }[] = [];
    const now = new Date();
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done");
    if (overdue.length > 0) {
      const topTask = overdue[0];
      items.push({ id: topTask.id, title: `Overdue Task`, sub: topTask.title, severity: "High", type: "task" });
    }
    if (totalPending > 500) {
      items.push({ id: "pending", title: "High pending expenses", sub: `$${totalPending.toFixed(0)} awaiting approval`, severity: "Medium", type: "finance" });
    }
    return items.slice(0, 3);
  }, [apiData, tasks, totalPending]);

  const pendingApprovals = useMemo(() => {
    const items: { id: string; title: string; sub: string; type: string; rawType: "finance" | "reimbursement" }[] = [];
    
    // Always use live context data for the approval list to ensure immediate reactivity
    expenses.filter((e) => e.status === "pending").forEach((e) =>
      items.push({ id: e.id, title: e.description, sub: `${e.submittedBy} • $${e.amount}`, type: "Finance", rawType: "finance" })
    );
    reimbursements.filter((r) => r.status === "pending").forEach((r) =>
      items.push({ id: r.id, title: r.description, sub: `${r.submittedBy} • $${r.amount}`, type: "Reimbursement", rawType: "reimbursement" })
    );

    // If we have API data for items that aren't in our local context yet (unlikely but possible), merge them
    if (apiData?.insights?.approvals?.items) {
      apiData.insights.approvals.items.forEach((a: any) => {
        if (!items.find(i => i.id === a.id)) {
          items.push({
            id: a.id,
            title: a.title,
            sub: `${a.submittedBy} • $${a.amount ?? ""}`,
            type: a.type === "finance" ? "Finance" : "Reimbursement",
            rawType: a.type
          });
        }
      });
    }

    return items;
  }, [apiData, expenses, reimbursements]);

  const renderWidget = (id: string) => {
    if (!visibleWidgets.has(id)) return null;

    switch (id) {
      case "org-health":
        return (
          <ExpandableTile
            title="Org Health Score — Deep Dive"
            subtitle="Composite score from member engagement, events, budget & tasks"
            insightPanel={<OrgHealthPanel data={apiData?.insights?.orgHealth ?? liveInsights.orgHealth} />}
          >
            <StatCard
              title="Org Health Score"
              value={`${healthScore}/100`}
              trend={previousScore != null ? { value: healthScore - previousScore, label: "vs last month" } : undefined}
              description={previousScore == null ? "No history yet" : undefined}
              icon={<Activity className="h-5 w-5" />}
            />
          </ExpandableTile>
        );
      case "active-members":
        return (
          <ExpandableTile
            title="Active Members — Full Breakdown"
            subtitle="Demographics, recent joiners, retention & engagement stats"
            insightPanel={<MembersPanel data={apiData?.insights?.members ?? liveInsights.members} />}
          >
            <StatCard
              title="Active Members"
              value={String(apiData?.stats.activeMembers ?? liveInsights.members.activeMembers)}
              description={`${Math.round(((apiData?.stats.activeMembers ?? liveInsights.members.activeMembers) / (apiData?.stats.members ?? (liveInsights.members.totalMembers || 1))) * 100)}% of ${apiData?.stats.members ?? liveInsights.members.totalMembers} total`}
              icon={<Users className="h-5 w-5" />}
            />
          </ExpandableTile>
        );
      case "budget":
        return (
          <ExpandableTile
            title="Budget — Financial Detail"
            subtitle="Spending categories, burn rate, top expenses & alerts"
            insightPanel={<BudgetPanel data={apiData?.insights?.budget ?? liveInsights.budget} />}
          >
            <Widget title="Budget Remaining">
              {budgetInsight.budgetSet ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold">${budgetInsight.remaining.toLocaleString()}</span>
                  </div>
                  <ProgressBar
                    value={Math.max(0, budgetInsight.percentRemaining)}
                    label={`Total Spent: $${budgetInsight.spent.toLocaleString()}`}
                    subLabel={`${budgetInsight.percentRemaining}% remaining`}
                    color="pink"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xl font-semibold text-muted-foreground">No budget set</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total Spent: ${budgetInsight.spent.toLocaleString()} • set a term budget in Finance to track what's left.
                  </p>
                </div>
              )}
            </Widget>
          </ExpandableTile>
        );
      case "upcoming-events":
        return (
          <ExpandableTile
            className="lg:col-span-2"
            title="Upcoming Events — Detail & Readiness"
            subtitle="Registration health, volunteer coverage & risk flags per event"
            insightPanel={<EventsPanel data={apiData?.insights?.events ?? liveInsights.events} />}
          >
            <Widget
              title="Upcoming Events"
              className="h-full"
              footer={
                <span className="cursor-pointer hover:text-primary transition-colors italic">
                  Click to expand full event insights →
                </span>
              }
            >
              <DashboardList>
                {upcomingEvents.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>}
                {upcomingEvents.map((e) => {
                  const isFull = e.capacity ? (e.registered || 0) >= e.capacity : false;
                  const isActioning = actioningId === `rsvp-${e.id}`;
                  return (
                    <DashboardListItem
                      key={e.id}
                      title={e.title}
                      subtitle={`${format(new Date(e.startDate), "MMM d • h:mm a")} • ${e.location || "TBD"}`}
                      metadata={e.capacity ? `${e.registered || 0}/${e.capacity} Reg` : "Open"}
                      icon={<Calendar className="h-4 w-4" />}
                      action={
                        <Button 
                          size="xs" 
                          variant="secondary" 
                          className="h-6 text-[10px] px-2"
                          disabled={isFull || isActioning}
                          onClick={(ev) => handleRSVP(e, ev)}
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : (isFull ? "Full" : "RSVP")}
                        </Button>
                      }
                    />
                  );
                })}
              </DashboardList>
            </Widget>
          </ExpandableTile>
        );
      case "risk-alerts":
        return (
          <RiskAlertsWidget
            risks={risks}
            insightData={apiData?.insights?.risks ?? liveInsights.risks}
            actioningId={actioningId}
            onResolveTask={handleResolveTask}
          />
        );
      case "approval-queue":
        return (
          <ApprovalQueueWidget
            pendingApprovals={pendingApprovals}
            insightData={apiData?.insights?.approvals ?? liveInsights.approvals}
            actioningId={actioningId}
            onApprove={handleApprove}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Executive Summary</h2>
          <p className="text-sm text-muted-foreground">High-level insights across all club operations.</p>
        </div>
        {stateError && (
          <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20 animate-in slide-in-from-top-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {stateError}
            <button onClick={() => setStateError(null)} className="ml-2 hover:text-red-300">×</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <DashboardControls
            defaultWidgets={PRESIDENT_DEFAULT_WIDGETS}
            widgetTitles={PRESIDENT_WIDGET_TITLES}
          />
        </div>
      </div>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-500",
        isCustomizing && "scale-[0.98] blur-[0.5px]"
      )}>
        {layout.map((id) => (
          <SortableWidget key={id} id={id} isCustomizing={isCustomizing}>
            {renderWidget(id)}
          </SortableWidget>
        ))}
      </div>
    </div>
  );
}
