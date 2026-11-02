/**
 * Single server-side implementation of the dashboard stats endpoint.
 * Used by api/stats.ts (Vercel) and the Vite dev middleware (vite.config.ts).
 *
 * Data fetching lives here; all computation is delegated to the pure
 * `buildDashboardInsights` in src/lib/dashboard-logic.ts, which is also used
 * by the client-side `useDashboardInsights` hook, so the three can't drift.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDashboardInsights } from "../../src/lib/dashboard-logic.js";
import type { DashboardInsightsResult, DashboardSourceData } from "../../src/lib/dashboard-logic.js";

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ""): string => (v == null ? fallback : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const optNum = (v: unknown): number | null => (v == null ? null : num(v));

/**
 * Fetches all dashboard data visible to the caller and computes the insight payload.
 *
 * @param supabase client authenticated as the caller (RLS applies)
 * @param orgId    organization scope. The client contexts currently scope every
 *                 table by `organization_id = auth user id`; pass the same value
 *                 so the API and the live client view agree.
 */
export async function computeDashboardStats(supabase: SupabaseClient, orgId: string): Promise<DashboardInsightsResult> {
  const scoped = (table: string, columns: string) => supabase.from(table).select(columns).eq("organization_id", orgId);

  const [membersRes, budgetRes, expensesRes, reimbRes, eventsRes, tasksRes] = await Promise.all([
    scoped("members", "id, name, role, status, department, year, join_date, tasks_completed, events_attended"),
    scoped("budgets", "total_budget, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    scoped("expenses", "id, description, amount, category, date, status, submitted_by"),
    scoped("reimbursements", "id, description, amount, date, status, submitted_by"),
    scoped("events", "id, title, start_date, capacity, registered"),
    scoped("tasks", "id, title, status, due_date"),
  ]);

  for (const [name, r] of [
    ["members", membersRes],
    ["budgets", budgetRes],
    ["expenses", expensesRes],
    ["reimbursements", reimbRes],
    ["events", eventsRes],
    ["tasks", tasksRes],
  ] as const) {
    if (r.error) throw new Error(`Failed to load ${name}: ${r.error.message}`);
  }

  const rows = (d: unknown): Row[] => (Array.isArray(d) ? (d as Row[]) : []);
  const budgetRow = (budgetRes.data ?? null) as Row | null;

  const source: DashboardSourceData = {
    members: rows(membersRes.data).map((m) => ({
      name: str(m.name),
      role: str(m.role),
      status: str(m.status),
      department: str(m.department, "Unknown"),
      year: str(m.year, "Unknown"),
      joinDate: str(m.join_date),
      tasksCompleted: num(m.tasks_completed),
      eventsAttended: num(m.events_attended),
    })),
    totalBudget: budgetRow ? num(budgetRow.total_budget) : null,
    expenses: rows(expensesRes.data).map((e) => ({
      id: str(e.id),
      description: str(e.description),
      amount: num(e.amount),
      category: str(e.category, "Uncategorized"),
      date: str(e.date),
      status: str(e.status),
      submittedBy: str(e.submitted_by),
    })),
    reimbursements: rows(reimbRes.data).map((r) => ({
      id: str(r.id),
      description: str(r.description),
      amount: num(r.amount),
      date: str(r.date),
      status: str(r.status),
      submittedBy: str(r.submitted_by),
    })),
    events: rows(eventsRes.data).map((e) => ({
      title: str(e.title),
      startDate: str(e.start_date),
      capacity: optNum(e.capacity),
      registered: optNum(e.registered),
    })),
    tasks: rows(tasksRes.data).map((t) => ({
      title: str(t.title),
      status: str(t.status),
      dueDate: t.due_date == null ? null : str(t.due_date),
    })),
  };

  return buildDashboardInsights(source);
}
