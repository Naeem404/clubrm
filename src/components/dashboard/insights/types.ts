// ─── Shared ───────────────────────────────────────────────
export interface TrendPoint {
  label: string;
  value: number;
}

export interface InsightItem {
  label: string;
  status: "good" | "warning" | "critical";
  detail: string;
}

// ─── Org Health ───────────────────────────────────────────
export interface HealthBreakdown {
  category: string;
  score: number;
  maxScore: number;
  status: "good" | "warning" | "critical";
  insights: InsightItem[];
}

export interface OrgHealthInsight {
  overallScore: number;
  previousScore: number;
  trend: TrendPoint[];
  breakdowns: HealthBreakdown[];
  topStrengths: string[];
  topConcerns: string[];
}

// ─── Members ──────────────────────────────────────────────
export interface RecentJoiner {
  name: string;
  role: string;
  department: string;
  joinDate: string;
  avatar?: string;
}

export interface DemographicSlice {
  label: string;
  count: number;
  percentage: number;
}

export interface MembersInsight {
  totalMembers: number;
  activeMembers: number;
  newThisTerm: number;
  retentionRate: number;
  avgTasksCompleted: number;
  avgEventsAttended: number;
  recentJoiners: RecentJoiner[];
  byDepartment: DemographicSlice[];
  byYear: DemographicSlice[];
  byRole: DemographicSlice[];
  inactiveWarnings: { name: string; lastActive: string; reason: string }[];
}

// ─── Budget ───────────────────────────────────────────────
export interface CategorySpend {
  name: string;
  allocated: number;
  spent: number;
  status: "good" | "warning" | "critical";
}

export interface BudgetInsight {
  totalBudget: number;
  spent: number;
  remaining: number;
  percentRemaining: number;
  burnRate: number;
  targetBurnRate: number;
  projectedRunway: string;
  monthlySpend: TrendPoint[];
  categories: CategorySpend[];
  biggestExpenses: { description: string; amount: number; date: string; category: string }[];
  alerts: InsightItem[];
}

// ─── Events ───────────────────────────────────────────────
export interface EventDetail {
  title: string;
  date: string;
  registered: number;
  capacity: number;
  volunteersFilled: number;
  volunteersNeeded: number;
  status: "on_track" | "at_risk" | "critical";
  risks: string[];
}

export interface EventsInsight {
  totalUpcoming: number;
  avgRegistrationRate: number;
  volunteerCoverageRate: number;
  events: EventDetail[];
  trend: TrendPoint[];
  strengths: string[];
  concerns: string[];
}

// ─── Risk Alerts ──────────────────────────────────────────
export interface RiskDetail {
  title: string;
  category: "budget" | "events" | "members" | "tasks" | "operations";
  severity: "high" | "medium" | "low";
  description: string;
  recommendation: string;
  affectedEntity: string;
  detectedAt: string;
}

export interface RisksInsight {
  totalRisks: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  risks: RiskDetail[];
  resolvedThisWeek: number;
  trendingUp: boolean;
}

// ─── Approval Queue ───────────────────────────────────────
export interface ApprovalItem {
  id: string;
  type: "event" | "finance" | "marketing" | "budget_change";
  title: string;
  submittedBy: string;
  submittedAt: string;
  daysWaiting: number;
  priority: "high" | "medium" | "low";
  amount?: number;
  description: string;
}

export interface ApprovalsInsight {
  totalPending: number;
  avgWaitDays: number;
  oldestItem: number;
  byType: { type: string; count: number }[];
  items: ApprovalItem[];
  recentlyApproved: { title: string; approvedAt: string; type: string }[];
}
