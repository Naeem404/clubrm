/**
 * useDashboardInsights
 *
 * Client-side computation of all 6 insight panel data objects from live
 * context providers (members, finance, events, tasks). It uses exactly the
 * same pure function (`buildDashboardInsights`) as the /api/dashboard/stats
 * endpoint, so the live fallback and the API can never drift apart.
 *
 * Usage:
 *   const { orgHealth, members, budget, events, risks, approvals, score } = useDashboardInsights()
 */

import { useMemo } from "react"
import { useMembers } from "@/context/members-context"
import { useFinance } from "@/context/finance-context"
import { useEvents } from "@/context/events-context"
import { useTasks } from "@/context/tasks-context"
import { buildDashboardInsights } from "@/lib/dashboard-logic"
import type {
  OrgHealthInsight,
  MembersInsight,
  BudgetInsight,
  EventsInsight,
  RisksInsight,
  ApprovalsInsight,
} from "@/components/dashboard/insights/types"

export interface DashboardInsights {
  orgHealth: OrgHealthInsight
  members: MembersInsight
  budget: BudgetInsight
  events: EventsInsight
  risks: RisksInsight
  approvals: ApprovalsInsight
  /** Composite org health score 0-100 */
  score: number
}

/**
 * Computes all 6 dashboard insight objects from live context data.
 * Memoized to avoid re-computation on unrelated renders.
 */
export function useDashboardInsights(): DashboardInsights {
  const { members } = useMembers()
  const { expenses, reimbursements, budget } = useFinance()
  const { events } = useEvents()
  const { tasks } = useTasks()

  return useMemo(() => {
    const { insights, score } = buildDashboardInsights({
      members,
      // A non-positive budget means "not configured" → honest "No budget set" state.
      totalBudget: budget.totalBudget > 0 ? budget.totalBudget : null,
      expenses,
      reimbursements,
      events,
      tasks,
    })
    return { ...insights, score }
  }, [members, expenses, reimbursements, budget.totalBudget, events, tasks])
}
