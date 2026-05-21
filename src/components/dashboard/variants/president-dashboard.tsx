import { useMemo, useEffect, useState } from "react";
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

// Full API response type shape
interface DashboardAPIResponse {
  stats: {
    members: number;
    activeMembers: number;
    totalBudget: number;
    spentBudget: number;
    onTrackEvents: number;
    totalEvents: number;
    completedTasks: number;
    totalTasks: number;
  };
  score: number;
  insights: {
    orgHealth: any;
    members: any;
    budget: any;
    events: any;
    risks: any;
    approvals: any;
  };
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

  useEffect(() => {
    async function fetchStats() {
      try {
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        const res = await fetch("/api/dashboard/stats", { headers });
        const data = await res.json();
        setApiData(data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }
    fetchStats();
  }, [session?.access_token]);

  const { expenses, reimbursements, budget, totalSpent, totalPending, updateExpenseStatus, updateReimbursementStatus } = useFinance();
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
      console.error("Approval failed:", err);
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

  const remaining = apiData
    ? apiData.stats.totalBudget - apiData.stats.spentBudget
    : budget.totalBudget - totalSpent;
  const remainingPct = apiData
    ? apiData.stats.totalBudget > 0 ? Math.round((remaining / apiData.stats.totalBudget) * 100) : 0
    : budget.totalBudget > 0 ? Math.round((remaining / budget.totalBudget) * 100) : 0;
  const displaySpent = apiData ? apiData.stats.spentBudget : totalSpent;

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [events]);

  const risks = useMemo(() => {
    if (apiData?.insights?.risks?.risks && apiData.insights.risks.risks.length > 0) {
      return apiData.insights.risks.risks.slice(0, 3).map((r: any) => ({
        id: r.id || `api-${Math.random()}`,
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
              value={`${apiData?.score ?? liveInsights.score}/100`}
              trend={{ value: (apiData?.score ?? liveInsights.score) - (apiData?.insights?.orgHealth?.previousScore ?? liveInsights.orgHealth.previousScore), label: "vs last month" }}
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
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">${(apiData?.stats ? remaining : liveInsights.budget.remaining).toLocaleString()}</span>
                </div>
                <ProgressBar
                  value={apiData?.stats ? remainingPct : liveInsights.budget.percentRemaining}
                  label={`Total Spent: $${(apiData?.stats ? displaySpent : liveInsights.budget.spent).toLocaleString()}`}
                  subLabel={`${apiData?.stats ? remainingPct : liveInsights.budget.percentRemaining}% remaining`}
                  color="pink"
                />
              </div>
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
