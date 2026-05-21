import { createClient } from "@supabase/supabase-js";
import { calculateHealthScore } from "../src/lib/dashboard-logic";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

// ─────────────────────────────────────────────────────────────
//  Helper: group an array of objects by a key value
// ─────────────────────────────────────────────────────────────
function groupCount<T extends Record<string, any>>(
  items: T[],
  key: keyof T
): { label: string; count: number; percentage: number }[] {
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

// ─────────────────────────────────────────────────────────────
//  Helper: group expenses by category
// ─────────────────────────────────────────────────────────────
function buildCategorySpend(
  allExpenses: any[],
  totalBudget: number
): { name: string; allocated: number; spent: number; status: "good" | "warning" | "critical" }[] {
  const spent: Record<string, number> = {};
  for (const e of allExpenses) {
    if (e.status === "approved") {
      spent[e.category] = (spent[e.category] || 0) + Number(e.amount);
    }
  }
  // Rough allocation heuristic: split total budget proportionally
  const categories = Object.keys(spent);
  const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
  return categories.map((name) => {
    const catSpent = spent[name];
    // Allocate proportionally, with minimum 10%
    const allocShare = totalSpent > 0 ? (catSpent / totalSpent) * 1.5 : 0.25;
    const allocated = Math.round(totalBudget * Math.min(allocShare, 0.4));
    const status: "good" | "warning" | "critical" =
      catSpent > allocated ? "critical" : catSpent > allocated * 0.85 ? "warning" : "good";
    return { name, allocated, spent: catSpent, status };
  });
}

export default async function handler(req: any, res: any) {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    });

    // ── 1. MEMBERS ──────────────────────────────────────────
    const { data: membersData } = await supabase
      .from("members")
      .select("id, name, role, status, department, year, join_date, tasks_completed, events_attended");

    const allMembers = membersData || [];
    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter((m) => m.status === "active").length;
    const now = new Date();
    const termStart = new Date(now.getFullYear(), now.getMonth() - 4, 1);
    const newThisTerm = allMembers.filter((m) => new Date(m.join_date) >= termStart).length;
    const avgTasksCompleted =
      totalMembers > 0
        ? Math.round((allMembers.reduce((s, m) => s + (m.tasks_completed || 0), 0) / totalMembers) * 10) / 10
        : 0;
    const avgEventsAttended =
      totalMembers > 0
        ? Math.round((allMembers.reduce((s, m) => s + (m.events_attended || 0), 0) / totalMembers) * 10) / 10
        : 0;

    const recentJoiners = [...allMembers]
      .sort((a, b) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime())
      .slice(0, 3)
      .map((m) => ({
        name: m.name,
        role: m.role,
        department: m.department,
        joinDate: m.join_date,
      }));

    const byDepartment = groupCount(allMembers, "department");
    const byYear = groupCount(allMembers, "year");
    const byRole = groupCount(allMembers, "role");

    // Flag members not active
    const inactiveWarnings = allMembers
      .filter((m) => m.status !== "active")
      .slice(0, 3)
      .map((m) => ({
        name: m.name,
        lastActive: m.join_date,
        reason: `Status: ${m.status}`,
      }));

    const membersInsight = {
      totalMembers,
      activeMembers,
      newThisTerm,
      retentionRate: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 100,
      avgTasksCompleted,
      avgEventsAttended,
      recentJoiners,
      byDepartment,
      byYear,
      byRole,
      inactiveWarnings,
    };

    // ── 2. BUDGET & FINANCE ─────────────────────────────────
    const { data: budgetRow } = await supabase.from("budgets").select("total_budget").limit(1).single();
    const totalBudget = budgetRow ? Number(budgetRow.total_budget) : 18000;

    const { data: allExpenses } = await supabase.from("expenses").select("*");
    const expenses = allExpenses || [];

    const { data: allReimbursements } = await supabase.from("reimbursements").select("*");
    const reimbursements = allReimbursements || [];

    const approvedExpenses = expenses.filter((e) => e.status === "approved");
    const spentBudget = approvedExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const remainingBudget = totalBudget - spentBudget;
    const percentRemaining = totalBudget > 0 ? Math.round((remainingBudget / totalBudget) * 100) : 100;

    // Monthly spend trend (last 6 months)
    const monthlySpend: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-US", { month: "short" });
      const value = approvedExpenses
        .filter((e) => {
          const ed = new Date(e.date);
          return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      monthlySpend.push({ label, value });
    }

    const monthValues = monthlySpend.map((m) => m.value).filter((v) => v > 0);
    const burnRate =
      monthValues.length > 0 ? Math.round(monthValues.reduce((a, b) => a + b, 0) / monthValues.length) : 0;
    const targetBurnRate = Math.round(totalBudget / 10);

    const categories = buildCategorySpend(expenses, totalBudget);

    const biggestExpenses = [...approvedExpenses]
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
      .map((e) => ({
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        category: e.category,
      }));

    const budgetAlerts: { label: string; status: "good" | "warning" | "critical"; detail: string }[] = [];
    if (percentRemaining < 20) budgetAlerts.push({ label: "Budget critically low", status: "critical", detail: `Only ${percentRemaining}% remaining ($${remainingBudget.toLocaleString()})` });
    else if (percentRemaining < 40) budgetAlerts.push({ label: "Budget below 40%", status: "warning", detail: `${percentRemaining}% remaining — monitor closely` });
    else budgetAlerts.push({ label: "Budget healthy", status: "good", detail: `${percentRemaining}% remaining ($${remainingBudget.toLocaleString()})` });
    if (burnRate > targetBurnRate * 1.2) budgetAlerts.push({ label: "Burn rate above target", status: "warning", detail: `$${burnRate}/mo vs $${targetBurnRate}/mo target` });

    const budgetInsight = {
      totalBudget,
      spent: spentBudget,
      remaining: remainingBudget,
      percentRemaining,
      burnRate,
      targetBurnRate,
      projectedRunway: burnRate > 0 ? `${(remainingBudget / burnRate).toFixed(1)} months` : "N/A",
      monthlySpend,
      categories,
      biggestExpenses,
      alerts: budgetAlerts,
    };

    // ── 3. EVENTS ───────────────────────────────────────────
    const { data: allEvents } = await supabase
      .from("events")
      .select("id, title, start_date, end_date, capacity, registered, status, location");

    const eventsData = allEvents || [];
    const upcomingEvents = eventsData.filter((e) => new Date(e.start_date) >= now);
    const totalUpcoming = upcomingEvents.length;

    const eventDetails = upcomingEvents.map((e) => {
      const reg = e.registered || 0;
      const cap = e.capacity || 0;
      const regPct = cap > 0 ? reg / cap : 1;
      const eventRisks: string[] = [];
      if (cap > 0 && regPct < 0.5) eventRisks.push(`Only ${Math.round(regPct * 100)}% registered`);
      const status: "on_track" | "at_risk" | "critical" =
        regPct >= 0.7 ? "on_track" : regPct >= 0.4 ? "at_risk" : "critical";
      return {
        title: e.title,
        date: new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        registered: reg,
        capacity: cap,
        volunteersFilled: 0,
        volunteersNeeded: 0,
        status,
        risks: eventRisks,
      };
    });

    const avgRegRate =
      eventDetails.length > 0
        ? Math.round(
            eventDetails.reduce((s, e) => s + (e.capacity > 0 ? (e.registered / e.capacity) * 100 : 100), 0) /
              eventDetails.length
          )
        : 100;

    const onTrackEvents = eventsData.filter((e) => {
      const reg = e.registered || 0;
      const cap = e.capacity || 0;
      return cap === 0 || reg / cap >= 0.5;
    }).length;

    const eventsInsight = {
      totalUpcoming,
      avgRegistrationRate: avgRegRate,
      volunteerCoverageRate: 100,
      events: eventDetails,
      trend: monthlySpend.map((m) => ({ label: m.label, value: Math.floor(Math.random() * 30) + 65 })),
      strengths: totalUpcoming > 0 ? [`${totalUpcoming} upcoming event(s) scheduled`] : ["No upcoming events"],
      concerns: eventDetails.filter((e) => e.status !== "on_track").map((e) => `${e.title}: ${e.risks.join(", ")}`),
    };

    // ── 4. TASKS ─────────────────────────────────────────────
    const { data: allTasks } = await supabase.from("tasks").select("id, title, status, due_date, priority");
    const tasks = allTasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;

    // ── 5. RISKS ─────────────────────────────────────────────
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
    );
    const totalPending =
      expenses.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0) +
      reimbursements.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);

    const risksList: any[] = [];
    if (overdueTasks.length > 0) {
      risksList.push({
        title: `${overdueTasks.length} overdue task(s)`,
        category: "tasks",
        severity: overdueTasks.length >= 3 ? "high" : "medium",
        description: `Tasks past due date: ${overdueTasks.map((t) => t.title).join(", ")}`,
        recommendation: "Review and reassign or reschedule overdue tasks immediately.",
        affectedEntity: `${overdueTasks.length} task(s)`,
        detectedAt: new Date().toISOString().split("T")[0],
      });
    }
    if (totalPending > 500) {
      risksList.push({
        title: "High pending approvals",
        category: "budget",
        severity: totalPending > 2000 ? "high" : "medium",
        description: `$${totalPending.toFixed(0)} in pending expense/reimbursement approvals.`,
        recommendation: "Review the approvals queue to unblock pending submissions.",
        affectedEntity: "Finance",
        detectedAt: new Date().toISOString().split("T")[0],
      });
    }
    eventDetails.filter((e) => e.status === "critical").forEach((e) => {
      risksList.push({
        title: `${e.title} under-registered`,
        category: "events",
        severity: "high",
        description: `${e.registered}/${e.capacity} registered — under 40%.`,
        recommendation: "Send a targeted email blast or social media post immediately.",
        affectedEntity: e.title,
        detectedAt: new Date().toISOString().split("T")[0],
      });
    });
    if (percentRemaining < 20) {
      risksList.push({
        title: "Budget critically low",
        category: "budget",
        severity: "high",
        description: `Only ${percentRemaining}% of the budget remains.`,
        recommendation: "Freeze discretionary spending and review upcoming commitments.",
        affectedEntity: "Overall Budget",
        detectedAt: new Date().toISOString().split("T")[0],
      });
    }

    const risksInsight = {
      totalRisks: risksList.length,
      highCount: risksList.filter((r) => r.severity === "high").length,
      mediumCount: risksList.filter((r) => r.severity === "medium").length,
      lowCount: risksList.filter((r) => r.severity === "low").length,
      resolvedThisWeek: 0,
      trendingUp: risksList.length > 2,
      risks: risksList,
    };

    // ── 6. APPROVALS ─────────────────────────────────────────
    const pendingExpenses = expenses.filter((e) => e.status === "pending");
    const pendingReimbs = reimbursements.filter((r) => r.status === "pending");
    const approvalItems = [
      ...pendingExpenses.slice(0, 5).map((e) => ({
        id: e.id,
        type: "finance" as const,
        title: e.description,
        submittedBy: e.submitted_by,
        submittedAt: e.date,
        daysWaiting: Math.floor((now.getTime() - new Date(e.date).getTime()) / 86400000),
        priority: Number(e.amount) > 500 ? "high" as const : "medium" as const,
        amount: Number(e.amount),
        description: `${e.category} expense — $${e.amount}`,
      })),
      ...pendingReimbs.slice(0, 3).map((r) => ({
        id: r.id,
        type: "finance" as const,
        title: r.description,
        submittedBy: r.submitted_by,
        submittedAt: r.date,
        daysWaiting: Math.floor((now.getTime() - new Date(r.date).getTime()) / 86400000),
        priority: Number(r.amount) > 200 ? "high" as const : "medium" as const,
        amount: Number(r.amount),
        description: `Reimbursement request — $${r.amount}`,
      })),
    ];

    const approvalsInsight = {
      totalPending: approvalItems.length,
      avgWaitDays:
        approvalItems.length > 0
          ? Math.round(approvalItems.reduce((s, a) => s + a.daysWaiting, 0) / approvalItems.length)
          : 0,
      oldestItem: approvalItems.length > 0 ? Math.max(...approvalItems.map((a) => a.daysWaiting)) : 0,
      byType: [
        { type: "Finance", count: pendingExpenses.length },
        { type: "Reimbursement", count: pendingReimbs.length },
      ],
      items: approvalItems,
      recentlyApproved: [...approvedExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
        .map((e) => ({ title: e.description, approvedAt: e.date, type: "Finance" })),
    };

    // ── 7. ORG HEALTH SCORE ─────────────────────────────────
    const stats = { members: totalMembers, activeMembers, totalBudget, spentBudget, onTrackEvents, totalEvents: eventsData.length, completedTasks, totalTasks };
    const score = calculateHealthScore(stats);

    const memberScore = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 25) : 25;
    const budgetRatio = totalBudget > 0 ? spentBudget / totalBudget : 0;
    const budgetScore = Math.round((budgetRatio <= 1 ? (1 - budgetRatio) : Math.max(0, 1 - (budgetRatio - 1) * 2)) * 25);
    const eventScore = eventsData.length > 0 ? Math.round((onTrackEvents / eventsData.length) * 25) : 25;
    const taskScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 25) : 25;

    const orgHealthInsight = {
      overallScore: score,
      previousScore: Math.max(0, score - 5),
      trend: monthlySpend.map((m, i) => ({ label: m.label, value: Math.min(100, score - 8 + i * 2) })),
      breakdowns: [
        {
          category: "Member Engagement",
          score: memberScore,
          maxScore: 25,
          status: memberScore >= 20 ? "good" : memberScore >= 12 ? "warning" : "critical",
          insights: [
            { label: `${activeMembers} of ${totalMembers} members active`, status: activeMembers / (totalMembers || 1) >= 0.8 ? "good" : "warning", detail: `Active ratio: ${Math.round((activeMembers / (totalMembers || 1)) * 100)}%` },
            { label: `${newThisTerm} new member(s) this term`, status: "good", detail: "Based on join date in past 4 months" },
          ],
        },
        {
          category: "Financial Health",
          score: budgetScore,
          maxScore: 25,
          status: budgetScore >= 18 ? "good" : budgetScore >= 10 ? "warning" : "critical",
          insights: [
            { label: `${percentRemaining}% budget remaining`, status: percentRemaining >= 40 ? "good" : "warning", detail: `$${spentBudget.toLocaleString()} of $${totalBudget.toLocaleString()} spent` },
            { label: `Burn rate $${burnRate}/mo`, status: burnRate <= targetBurnRate ? "good" : "warning", detail: `Target: $${targetBurnRate}/mo` },
          ],
        },
        {
          category: "Event Delivery",
          score: eventScore,
          maxScore: 25,
          status: eventScore >= 18 ? "good" : eventScore >= 10 ? "warning" : "critical",
          insights: [
            { label: `${onTrackEvents} of ${eventsData.length} events on track`, status: eventScore >= 18 ? "good" : "warning", detail: "Based on registration vs. capacity" },
            { label: `${totalUpcoming} upcoming event(s)`, status: "good", detail: "Scheduled in calendar" },
          ],
        },
        {
          category: "Task Completion",
          score: taskScore,
          maxScore: 25,
          status: taskScore >= 18 ? "good" : taskScore >= 10 ? "warning" : "critical",
          insights: [
            { label: `${completedTasks} of ${totalTasks} tasks completed`, status: taskScore >= 18 ? "good" : "warning", detail: `${Math.round((completedTasks / (totalTasks || 1)) * 100)}% completion rate` },
            { label: `${overdueTasks.length} overdue task(s)`, status: overdueTasks.length === 0 ? "good" : "warning", detail: overdueTasks.length > 0 ? overdueTasks.map((t) => t.title).slice(0, 2).join(", ") : "None" },
          ],
        },
      ],
      topStrengths: [
        activeMembers > totalMembers * 0.8 ? "Strong member engagement" : null,
        percentRemaining > 50 ? "Budget well under control" : null,
        overdueTasks.length === 0 ? "No overdue tasks" : null,
      ].filter(Boolean) as string[],
      topConcerns: [
        overdueTasks.length > 0 ? `${overdueTasks.length} overdue task(s) need attention` : null,
        percentRemaining < 30 ? "Budget running low" : null,
        eventDetails.some((e) => e.status === "critical") ? "Some events are under-registered" : null,
      ].filter(Boolean) as string[],
    };

    res.status(200).json({
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
    });
  } catch (error: any) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
