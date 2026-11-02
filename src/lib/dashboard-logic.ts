/**
 * Dashboard Logic Utility Functions
 *
 * These functions represent the "Substance" of the application logic.
 * By isolating them here, we can perform thorough unit testing as required by ITR1.
 *
 * `buildDashboardInsights` is the SINGLE source of truth for the dashboard
 * insight panels. It is used by:
 *   - api/_lib/compute-stats.ts  (Vercel function + Vite dev middleware)
 *   - src/hooks/use-dashboard-insights.ts (client-side live fallback)
 *
 * NOTE: this file is imported by server code (api/**) that runs as native
 * Node ESM, so it must not have runtime imports that rely on the "@/" alias.
 * Type-only imports are erased and are fine.
 */
import type {
  OrgHealthInsight,
  MembersInsight,
  BudgetInsight,
  EventsInsight,
  RisksInsight,
  ApprovalsInsight,
  CategorySpend,
  TrendPoint,
  HealthBreakdown,
} from "../components/dashboard/insights/types";

export interface OrgStats {
  members: number;
  activeMembers: number;
  totalBudget: number;
  spentBudget: number;
  onTrackEvents: number;
  totalEvents: number;
  completedTasks: number;
  totalTasks: number;
}

const HEALTH_WEIGHTS = { members: 0.3, budget: 0.3, events: 0.2, tasks: 0.2 } as const;

/** Per-pillar health scores (each 0-100) used by calculateHealthScore. */
export function calculateHealthComponents(stats: OrgStats) {
  const members = stats.members > 0 ? (stats.activeMembers / stats.members) * 100 : 100;
  // Budget is healthy if spent is less than or equal to total.
  // If spent exceeds total, score drops.
  const budgetRatio = stats.totalBudget > 0 ? stats.spentBudget / stats.totalBudget : 0;
  const budget = budgetRatio <= 1 ? (1 - budgetRatio) * 100 : Math.max(0, 100 - (budgetRatio - 1) * 200);
  const events = stats.totalEvents > 0 ? (stats.onTrackEvents / stats.totalEvents) * 100 : 100;
  const tasks = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 100;
  return { members, budget, events, tasks };
}

/**
 * Calculates the overall Health Score of the organization (0-100).
 * Based on member activity, budget status, event success, and task completion.
 */
export function calculateHealthScore(stats: OrgStats): number {
  if (stats.totalEvents === 0 && stats.totalTasks === 0 && stats.members === 0) return 100;

  const c = calculateHealthComponents(stats);
  const totalScore =
    c.members * HEALTH_WEIGHTS.members +
    c.budget * HEALTH_WEIGHTS.budget +
    c.events * HEALTH_WEIGHTS.events +
    c.tasks * HEALTH_WEIGHTS.tasks;

  return Math.round(totalScore);
}

/**
 * Calculates budget remaining as a rounded percentage.
 */
export function calculateBudgetPercentage(total: number, spent: number): number {
  if (total <= 0) return 0;
  const remaining = total - spent;
  return Math.round((remaining / total) * 100);
}

/**
 * Determines the severity level for a risk alert based on threshold.
 */
export function getMetricSeverity(value: number, thresholdLow: number, thresholdHigh: number): 'low' | 'medium' | 'high' {
  if (value >= thresholdHigh) return 'low';
  if (value >= thresholdLow) return 'medium';
  return 'high';
}

// ─────────────────────────────────────────────────────────────
//  Shared dashboard insight computation
// ─────────────────────────────────────────────────────────────

type DateLike = string | Date;

/** Normalized (camelCase) source rows. Both DB rows and context objects map onto this. */
export interface DashboardSourceData {
  members: {
    name: string;
    role: string;
    status: string;
    department: string;
    year: string;
    joinDate: DateLike;
    tasksCompleted?: number | null;
    eventsAttended?: number | null;
  }[];
  /** `null` when no budget has been configured. */
  totalBudget: number | null;
  expenses: {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: DateLike;
    status: string;
    submittedBy: string;
  }[];
  reimbursements: {
    id: string;
    description: string;
    amount: number;
    date: DateLike;
    status: string;
    submittedBy: string;
  }[];
  events: {
    title: string;
    startDate: DateLike;
    capacity?: number | null;
    registered?: number | null;
  }[];
  tasks: {
    title: string;
    status: string;
    dueDate?: DateLike | null;
  }[];
}

export interface DashboardInsightsResult {
  stats: OrgStats;
  score: number;
  insights: {
    orgHealth: OrgHealthInsight;
    members: MembersInsight;
    budget: BudgetInsight;
    events: EventsInsight;
    risks: RisksInsight;
    approvals: ApprovalsInsight;
  };
}

type Status = "good" | "warning" | "critical";

function groupCount<T>(items: T[], key: keyof T) {
  const map: Record<string, number> = {};
  for (const item of items) {
    const v = String(item[key] ?? "Unknown");
    map[v] = (map[v] || 0) + 1;
  }
  const total = items.length || 1;
  return Object.entries(map).map(([label, count]) => ({
    label,
    count,
    percentage: Math.round((count / total) * 1000) / 10,
  }));
}

function toTime(d: DateLike | null | undefined): number {
  if (d == null) return NaN;
  return new Date(d).getTime();
}

function toDateStr(d: DateLike): string {
  const t = toTime(d);
  return Number.isNaN(t) ? String(d) : new Date(t).toISOString().split("T")[0];
}

function sameMonth(d: DateLike, ref: Date): boolean {
  const dt = new Date(d);
  return dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth();
}

function lastNMonths(now: Date, n: number): { label: string; ref: Date }[] {
  const out: { label: string; ref: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ label: ref.toLocaleString("en-US", { month: "short" }), ref });
  }
  return out;
}

/**
 * Category spend from approved expenses. The schema has no per-category
 * allocation, so `allocated` is null and status is neutral ("good").
 */
function buildCategorySpend(approved: { amount: number; category: string }[]): CategorySpend[] {
  const spent: Record<string, number> = {};
  for (const e of approved) {
    const cat = e.category || "Uncategorized";
    spent[cat] = (spent[cat] || 0) + e.amount;
  }
  const total = Object.values(spent).reduce((a, b) => a + b, 0);
  return Object.entries(spent)
    .sort((a, b) => b[1] - a[1])
    .map(([name, catSpent]) => ({
      name,
      allocated: null,
      spent: catSpent,
      shareOfSpend: total > 0 ? Math.round((catSpent / total) * 1000) / 10 : 0,
      status: "good" as const,
    }));
}

function pillarStatus(ratio: number): Status {
  return ratio >= 0.8 ? "good" : ratio >= 0.5 ? "warning" : "critical";
}

/** Pure computation of all dashboard insight panels from normalized data. */
export function buildDashboardInsights(src: DashboardSourceData, now: Date = new Date()): DashboardInsightsResult {
  const today = now.toISOString().split("T")[0];
  const months = lastNMonths(now, 6);

  // ── MEMBERS ──────────────────────────────────────────────
  const allMembers = src.members;
  const termStart = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  const totalMembers = allMembers.length;
  const activeMembers = allMembers.filter((m) => m.status === "active").length;
  const newThisTerm = allMembers.filter((m) => toTime(m.joinDate) >= termStart.getTime()).length;
  const avg = (sel: (m: (typeof allMembers)[number]) => number) =>
    totalMembers > 0 ? Math.round((allMembers.reduce((s, m) => s + sel(m), 0) / totalMembers) * 10) / 10 : 0;

  const membersInsight: MembersInsight = {
    totalMembers,
    activeMembers,
    newThisTerm,
    retentionRate: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0,
    avgTasksCompleted: avg((m) => m.tasksCompleted || 0),
    avgEventsAttended: avg((m) => m.eventsAttended || 0),
    recentJoiners: [...allMembers]
      .sort((a, b) => toTime(b.joinDate) - toTime(a.joinDate))
      .slice(0, 3)
      .map((m) => ({ name: m.name, role: m.role, department: m.department, joinDate: toDateStr(m.joinDate) })),
    byDepartment: groupCount(allMembers, "department"),
    byYear: groupCount(allMembers, "year"),
    byRole: groupCount(allMembers, "role"),
    inactiveWarnings: allMembers
      .filter((m) => m.status !== "active")
      .slice(0, 3)
      .map((m) => ({ name: m.name, lastActive: toDateStr(m.joinDate), reason: `Status: ${m.status}` })),
  };

  // ── BUDGET ───────────────────────────────────────────────
  const budgetSet = src.totalBudget != null && src.totalBudget > 0;
  const totalBudget = budgetSet ? Number(src.totalBudget) : 0;
  const expenses = src.expenses;
  const reimbursements = src.reimbursements;
  const approvedExpenses = expenses.filter((e) => e.status === "approved");
  const spentBudget = approvedExpenses.reduce((s, e) => s + e.amount, 0);
  const remainingBudget = totalBudget - spentBudget;
  const percentRemaining = budgetSet ? Math.round((remainingBudget / totalBudget) * 100) : 0;

  const monthlySpend: TrendPoint[] = months.map(({ label, ref }) => ({
    label,
    value: approvedExpenses.filter((e) => sameMonth(e.date, ref)).reduce((s, e) => s + e.amount, 0),
  }));
  const monthValues = monthlySpend.map((m) => m.value).filter((v) => v > 0);
  const burnRate = monthValues.length > 0 ? Math.round(monthValues.reduce((a, b) => a + b, 0) / monthValues.length) : 0;
  // Target assumes the term budget is spread over ~10 months.
  const targetBurnRate = budgetSet ? Math.round(totalBudget / 10) : 0;

  const budgetAlerts: { label: string; status: Status; detail: string }[] = [];
  if (!budgetSet) {
    budgetAlerts.push({ label: "No budget set", status: "warning", detail: "Set a term budget in Finance to track remaining funds" });
  } else {
    if (percentRemaining < 20) budgetAlerts.push({ label: "Budget critically low", status: "critical", detail: `Only ${percentRemaining}% remaining ($${remainingBudget.toLocaleString()})` });
    else if (percentRemaining < 40) budgetAlerts.push({ label: "Budget below 40%", status: "warning", detail: `${percentRemaining}% remaining — monitor closely` });
    else budgetAlerts.push({ label: "Budget healthy", status: "good", detail: `${percentRemaining}% remaining ($${remainingBudget.toLocaleString()})` });
    if (burnRate > targetBurnRate * 1.2) budgetAlerts.push({ label: "Burn rate above target", status: "warning", detail: `$${burnRate}/mo vs $${targetBurnRate}/mo target` });
  }

  const budgetInsight: BudgetInsight = {
    budgetSet,
    totalBudget,
    spent: spentBudget,
    remaining: remainingBudget,
    percentRemaining,
    burnRate,
    targetBurnRate,
    projectedRunway: budgetSet && burnRate > 0 ? `${(remainingBudget / burnRate).toFixed(1)} months` : "N/A",
    monthlySpend,
    categories: buildCategorySpend(approvedExpenses),
    biggestExpenses: [...approvedExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((e) => ({ description: e.description, amount: e.amount, date: toDateStr(e.date), category: e.category })),
    alerts: budgetAlerts,
  };

  // ── EVENTS ───────────────────────────────────────────────
  const allEvents = src.events;
  const upcomingEvents = allEvents
    .filter((e) => toTime(e.startDate) >= now.getTime())
    .sort((a, b) => toTime(a.startDate) - toTime(b.startDate));
  const eventDetails = upcomingEvents.map((e) => {
    const reg = e.registered || 0;
    const cap = e.capacity || 0;
    const regPct = cap > 0 ? reg / cap : 1;
    const risks: string[] = [];
    if (cap > 0 && regPct < 0.5) risks.push(`Only ${Math.round(regPct * 100)}% registered`);
    const status: "on_track" | "at_risk" | "critical" = regPct >= 0.7 ? "on_track" : regPct >= 0.4 ? "at_risk" : "critical";
    return {
      title: e.title,
      date: new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      registered: reg,
      capacity: cap,
      // Volunteer tracking does not exist in the schema yet.
      volunteersFilled: 0,
      volunteersNeeded: 0,
      status,
      risks,
    };
  });

  const withCapacity = eventDetails.filter((e) => e.capacity > 0);
  const avgRegistrationRate =
    withCapacity.length > 0
      ? Math.round(withCapacity.reduce((s, e) => s + (e.registered / e.capacity) * 100, 0) / withCapacity.length)
      : null;

  // Real monthly registration rate: Σ registered / Σ capacity for events held that month.
  const eventsTrend: TrendPoint[] = [];
  for (const { label, ref } of months) {
    const inMonth = allEvents.filter((e) => (e.capacity || 0) > 0 && sameMonth(e.startDate, ref));
    if (inMonth.length === 0) continue;
    const reg = inMonth.reduce((s, e) => s + (e.registered || 0), 0);
    const cap = inMonth.reduce((s, e) => s + (e.capacity || 0), 0);
    eventsTrend.push({ label, value: Math.round((reg / cap) * 100) });
  }

  const onTrackEvents = allEvents.filter((e) => {
    const cap = e.capacity || 0;
    return cap === 0 || (e.registered || 0) / cap >= 0.5;
  }).length;

  const eventsInsight: EventsInsight = {
    totalUpcoming: upcomingEvents.length,
    avgRegistrationRate,
    volunteerCoverageRate: null,
    events: eventDetails,
    trend: eventsTrend,
    strengths: upcomingEvents.length > 0 ? [`${upcomingEvents.length} upcoming event(s) scheduled`] : [],
    concerns: [
      ...(upcomingEvents.length === 0 ? ["No upcoming events scheduled"] : []),
      ...eventDetails.filter((e) => e.status !== "on_track").map((e) => `${e.title}: ${e.risks.join(", ") || "low registration"}`),
    ],
  };

  // ── TASKS ────────────────────────────────────────────────
  const tasks = src.tasks;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter((t) => t.dueDate && toTime(t.dueDate) < now.getTime() && t.status !== "done");

  // ── RISKS ────────────────────────────────────────────────
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const pendingReimbs = reimbursements.filter((r) => r.status === "pending");
  const pendingAmount =
    pendingExpenses.reduce((s, e) => s + e.amount, 0) + pendingReimbs.reduce((s, r) => s + r.amount, 0);

  const risksList: RisksInsight["risks"] = [];
  if (overdueTasks.length > 0) {
    risksList.push({
      title: `${overdueTasks.length} overdue task(s)`,
      category: "tasks",
      severity: overdueTasks.length >= 3 ? "high" : "medium",
      description: `Tasks past due: ${overdueTasks.map((t) => t.title).slice(0, 3).join(", ")}`,
      recommendation: "Review and reassign or reschedule overdue tasks immediately.",
      affectedEntity: `${overdueTasks.length} task(s)`,
      detectedAt: today,
    });
  }
  if (pendingAmount > 500) {
    risksList.push({
      title: "High pending approvals",
      category: "budget",
      severity: pendingAmount > 2000 ? "high" : "medium",
      description: `$${pendingAmount.toFixed(0)} in pending expense/reimbursement approvals awaiting action.`,
      recommendation: "Review the approvals queue to unblock pending submissions.",
      affectedEntity: "Finance",
      detectedAt: today,
    });
  }
  for (const e of eventDetails.filter((ev) => ev.status === "critical")) {
    risksList.push({
      title: `${e.title} under-registered`,
      category: "events",
      severity: "high",
      description: `${e.registered}/${e.capacity} registered — below 40% fill rate.`,
      recommendation: "Send a targeted email blast or social media post.",
      affectedEntity: e.title,
      detectedAt: today,
    });
  }
  if (budgetSet && percentRemaining < 20) {
    risksList.push({
      title: "Budget critically low",
      category: "budget",
      severity: "high",
      description: `Only ${percentRemaining}% of the budget remains ($${remainingBudget.toLocaleString()}).`,
      recommendation: "Freeze discretionary spending and review upcoming commitments.",
      affectedEntity: "Overall Budget",
      detectedAt: today,
    });
  }

  const risksInsight: RisksInsight = {
    totalRisks: risksList.length,
    highCount: risksList.filter((r) => r.severity === "high").length,
    mediumCount: risksList.filter((r) => r.severity === "medium").length,
    lowCount: risksList.filter((r) => r.severity === "low").length,
    // Risk resolution history is not tracked.
    resolvedThisWeek: 0,
    trendingUp: false,
    risks: risksList,
  };

  // ── APPROVALS ────────────────────────────────────────────
  const daysSince = (d: DateLike) => Math.max(0, Math.floor((now.getTime() - toTime(d)) / 86400000));
  const approvalItems: ApprovalsInsight["items"] = [
    ...pendingExpenses.slice(0, 5).map((e) => ({
      id: e.id,
      type: "finance" as const,
      title: e.description,
      submittedBy: e.submittedBy,
      submittedAt: toDateStr(e.date),
      daysWaiting: daysSince(e.date),
      priority: e.amount > 500 ? ("high" as const) : ("medium" as const),
      amount: e.amount,
      description: `${e.category} expense — $${e.amount}`,
    })),
    ...pendingReimbs.slice(0, 3).map((r) => ({
      id: r.id,
      type: "finance" as const,
      title: r.description,
      submittedBy: r.submittedBy,
      submittedAt: toDateStr(r.date),
      daysWaiting: daysSince(r.date),
      priority: r.amount > 200 ? ("high" as const) : ("medium" as const),
      amount: r.amount,
      description: `Reimbursement request — $${r.amount}`,
    })),
  ];

  const approvalsInsight: ApprovalsInsight = {
    totalPending: pendingExpenses.length + pendingReimbs.length,
    avgWaitDays:
      approvalItems.length > 0 ? Math.round(approvalItems.reduce((s, a) => s + a.daysWaiting, 0) / approvalItems.length) : 0,
    oldestItem: approvalItems.length > 0 ? Math.max(...approvalItems.map((a) => a.daysWaiting)) : 0,
    byType: [
      { type: "Finance", count: pendingExpenses.length },
      { type: "Reimbursement", count: pendingReimbs.length },
    ],
    items: approvalItems,
    recentlyApproved: [...approvedExpenses]
      .sort((a, b) => toTime(b.date) - toTime(a.date))
      .slice(0, 3)
      .map((e) => ({ title: e.description, approvedAt: toDateStr(e.date), type: "Finance" })),
  };

  // ── ORG HEALTH ───────────────────────────────────────────
  const stats: OrgStats = {
    members: totalMembers,
    activeMembers,
    totalBudget,
    spentBudget,
    onTrackEvents,
    totalEvents: allEvents.length,
    completedTasks,
    totalTasks,
  };
  const score = calculateHealthScore(stats);
  const comp = calculateHealthComponents(stats);

  // Breakdown max scores mirror the weights used by calculateHealthScore so the
  // pillars add up to (approximately, due to rounding) the overall score.
  const pillar = (category: string, value: number, weight: number, insights: HealthBreakdown["insights"]): HealthBreakdown => {
    const maxScore = Math.round(weight * 100);
    return { category, score: Math.round((value / 100) * maxScore), maxScore, status: pillarStatus(value / 100), insights };
  };
  const activePct = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const orgHealthInsight: OrgHealthInsight = {
    overallScore: score,
    // No historical score snapshots are stored, so there is no honest previous value or trend.
    previousScore: null,
    trend: [],
    breakdowns: [
      pillar("Member Engagement", comp.members, HEALTH_WEIGHTS.members, [
        totalMembers > 0
          ? { label: `${activeMembers} of ${totalMembers} members active`, status: activePct >= 80 ? "good" : "warning", detail: `Active ratio: ${activePct}%` }
          : { label: "No members yet", status: "warning", detail: "Add members to measure engagement" },
        { label: `${newThisTerm} new member(s) this term`, status: "good", detail: "Based on join date in past 4 months" },
      ]),
      pillar("Financial Health", comp.budget, HEALTH_WEIGHTS.budget, budgetSet
        ? [
            { label: `${percentRemaining}% budget remaining`, status: percentRemaining >= 40 ? "good" : "warning", detail: `$${spentBudget.toLocaleString()} of $${totalBudget.toLocaleString()} spent` },
            { label: `Burn rate $${burnRate}/mo`, status: burnRate <= targetBurnRate ? "good" : "warning", detail: `Target: $${targetBurnRate}/mo` },
          ]
        : [{ label: "No budget set", status: "warning", detail: `$${spentBudget.toLocaleString()} approved spend with no budget to compare against` }]),
      pillar("Event Delivery", comp.events, HEALTH_WEIGHTS.events, [
        { label: `${onTrackEvents} of ${allEvents.length} events on track`, status: comp.events >= 80 ? "good" : "warning", detail: "Based on registration vs. capacity" },
        { label: `${upcomingEvents.length} upcoming event(s)`, status: upcomingEvents.length > 0 ? "good" : "warning", detail: "Scheduled in calendar" },
      ]),
      pillar("Task Completion", comp.tasks, HEALTH_WEIGHTS.tasks, [
        { label: `${completedTasks} of ${totalTasks} tasks completed`, status: comp.tasks >= 80 ? "good" : "warning", detail: `${taskPct}% completion rate` },
        {
          label: `${overdueTasks.length} overdue task(s)`,
          status: overdueTasks.length === 0 ? "good" : "warning",
          detail: overdueTasks.length > 0 ? overdueTasks.map((t) => t.title).slice(0, 2).join(", ") : "None — all tasks on time",
        },
      ]),
    ],
    topStrengths: [
      totalMembers > 0 && activeMembers > totalMembers * 0.8 ? "Strong member engagement" : null,
      budgetSet && percentRemaining > 50 ? "Budget well under control" : null,
      totalTasks > 0 && overdueTasks.length === 0 ? "No overdue tasks" : null,
      upcomingEvents.length > 0 ? `${upcomingEvents.length} upcoming event(s) actively planned` : null,
    ].filter((s): s is string => Boolean(s)),
    topConcerns: [
      overdueTasks.length > 0 ? `${overdueTasks.length} overdue task(s) need attention` : null,
      !budgetSet ? "No budget set" : percentRemaining < 30 ? "Budget running low" : null,
      eventDetails.some((e) => e.status === "critical") ? "Some events are under-registered" : null,
      pendingAmount > 1000 ? `$${pendingAmount.toFixed(0)} in pending approvals` : null,
    ].filter((s): s is string => Boolean(s)),
  };

  return {
    stats,
    score,
    insights: {
      orgHealth: orgHealthInsight,
      members: membersInsight,
      budget: budgetInsight,
      events: eventsInsight,
      risks: risksInsight,
      approvals: approvalsInsight,
    },
  };
}
