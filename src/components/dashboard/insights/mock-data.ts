import type {
  OrgHealthInsight,
  MembersInsight,
  BudgetInsight,
  EventsInsight,
  RisksInsight,
  ApprovalsInsight,
} from "./types";

// ─── Org Health Insight ───────────────────────────────────
// BACKEND LOGIC: Composite score from 4 pillars, each 0-25.
// members_score  = (active / total) * 25
// events_score   = (on_track_events / total_upcoming) * 25
// budget_score   = remaining_pct > 30% ? 25 : remaining_pct * (25/30)
// tasks_score    = (completed_on_time / total_due) * 25
export const orgHealthInsight: OrgHealthInsight = {
  overallScore: 88,
  previousScore: 83,
  trend: [
    { label: "Oct", value: 72 },
    { label: "Nov", value: 78 },
    { label: "Dec", value: 81 },
    { label: "Jan", value: 83 },
    { label: "Feb", value: 88 },
  ],
  breakdowns: [
    {
      category: "Member Engagement",
      score: 23,
      maxScore: 25,
      status: "good",
      insights: [
        { label: "Active ratio 92%", status: "good", detail: "12 of 13 active members participated this month" },
        { label: "New member onboarding", status: "good", detail: "3 new members fully onboarded in Jan" },
        { label: "1 inactive member flagged", status: "warning", detail: "Lisa Park — no activity in 28 days" },
      ],
    },
    {
      category: "Event Delivery",
      score: 22,
      maxScore: 25,
      status: "good",
      insights: [
        { label: "90% registration fill rate", status: "good", detail: "Tech Talk at 90% capacity (45/50)" },
        { label: "Volunteer coverage strong", status: "good", detail: "All events have adequate volunteer sign-ups" },
        { label: "Workshop under-registered", status: "warning", detail: "Workshop at 40% (12/30) — 5 days out" },
      ],
    },
    {
      category: "Financial Health",
      score: 21,
      maxScore: 25,
      status: "warning",
      insights: [
        { label: "68% budget remaining", status: "good", detail: "$12,400 of $18,000 still available" },
        { label: "Burn rate slightly high", status: "warning", detail: "$2,100/mo vs $1,800/mo target" },
        { label: "Marketing over-spend", status: "critical", detail: "Marketing category exceeded allocation by $200" },
      ],
    },
    {
      category: "Task Completion",
      score: 22,
      maxScore: 25,
      status: "good",
      insights: [
        { label: "78% weekly completion rate", status: "good", detail: "42 of 54 tasks completed this week" },
        { label: "5 tasks overdue", status: "warning", detail: "Budget report (3 days), Venue booking (1 day), +3 others" },
        { label: "Exec response time improving", status: "good", detail: "Avg task turnaround down from 4.2 to 3.1 days" },
      ],
    },
  ],
  topStrengths: [
    "Member engagement at a term-high 92%",
    "Event registration rates consistently above 80%",
    "Task turnaround time improving week-over-week",
  ],
  topConcerns: [
    "Marketing spend exceeded allocation — needs reallocation or freeze",
    "Workshop registration is dangerously low at 40% with 5 days to go",
    "5 overdue tasks — 2 are high-priority (budget report, venue booking)",
  ],
};

// ─── Members Insight ──────────────────────────────────────
// BACKEND LOGIC: Queries memberships JOIN users, aggregates by
// department/year/role/status. Retention = members active both
// this term and last term / last term total.
export const membersInsight: MembersInsight = {
  totalMembers: 14,
  activeMembers: 12,
  newThisTerm: 3,
  retentionRate: 85,
  avgTasksCompleted: 19.9,
  avgEventsAttended: 8.8,
  recentJoiners: [
    { name: "Emily Watson", role: "Executive", department: "Computer Science", joinDate: "2025-01-10" },
    { name: "David Kim", role: "Executive", department: "Engineering", joinDate: "2025-01-10" },
    { name: "Nina Patel", role: "Executive", department: "Business Administration", joinDate: "2025-01-15" },
  ],
  byDepartment: [
    { label: "Computer Science", count: 3, percentage: 21.4 },
    { label: "Business Administration", count: 3, percentage: 21.4 },
    { label: "Engineering", count: 2, percentage: 14.3 },
    { label: "Communications", count: 2, percentage: 14.3 },
    { label: "Arts & Media", count: 1, percentage: 7.1 },
    { label: "Health Sciences", count: 1, percentage: 7.1 },
    { label: "Political Science", count: 1, percentage: 7.1 },
    { label: "Mathematics", count: 1, percentage: 7.1 },
  ],
  byYear: [
    { label: "1st Year", count: 2, percentage: 14.3 },
    { label: "2nd Year", count: 3, percentage: 21.4 },
    { label: "3rd Year", count: 4, percentage: 28.6 },
    { label: "4th Year", count: 4, percentage: 28.6 },
    { label: "Graduate", count: 1, percentage: 7.1 },
  ],
  byRole: [
    { label: "Executive", count: 6, percentage: 42.9 },
    { label: "President", count: 1, percentage: 7.1 },
    { label: "VP Internal", count: 1, percentage: 7.1 },
    { label: "VP Finance", count: 1, percentage: 7.1 },
    { label: "VP Events", count: 2, percentage: 14.3 },
    { label: "VP External", count: 1, percentage: 7.1 },
    { label: "Marketing", count: 1, percentage: 7.1 },
    { label: "Administrator", count: 1, percentage: 7.1 },
  ],
  inactiveWarnings: [
    { name: "Lisa Park", lastActive: "2025-01-30", reason: "No task completions or event attendance in 28 days" },
  ],
};

// ─── Budget Insight ───────────────────────────────────────
// BACKEND LOGIC: Reads budgets + budget_categories + expenses tables.
// burn_rate = spent / months_elapsed_in_term.
// projected_runway = remaining / burn_rate → months.
export const budgetInsight: BudgetInsight = {
  totalBudget: 18000,
  spent: 5600,
  remaining: 12400,
  percentRemaining: 68,
  burnRate: 2100,
  targetBurnRate: 1800,
  projectedRunway: "5.9 months",
  monthlySpend: [
    { label: "Sep", value: 1200 },
    { label: "Oct", value: 1800 },
    { label: "Nov", value: 1500 },
    { label: "Dec", value: 900 },
    { label: "Jan", value: 2100 },
    { label: "Feb", value: 1400 },
  ],
  categories: [
    { name: "Events", allocated: 8000, spent: 2520, status: "good" },
    { name: "Marketing", allocated: 3000, spent: 3200, status: "critical" },
    { name: "Operations", allocated: 4000, spent: 1120, status: "good" },
    { name: "Supplies", allocated: 2000, spent: 560, status: "good" },
    { name: "Other", allocated: 1000, spent: 200, status: "good" },
  ],
  biggestExpenses: [
    { description: "Main Hall booking deposit", amount: 800, date: "2025-01-15", category: "Events" },
    { description: "IG ad campaign — Tech Talk", amount: 650, date: "2025-01-20", category: "Marketing" },
    { description: "Catering — Kickoff Social", amount: 500, date: "2025-01-05", category: "Events" },
    { description: "Flyer & banner printing", amount: 420, date: "2025-02-01", category: "Marketing" },
    { description: "Software subscriptions", amount: 360, date: "2025-01-01", category: "Operations" },
  ],
  alerts: [
    { label: "Marketing over budget", status: "critical", detail: "Spent $3,200 of $3,000 allocation (+$200 over)" },
    { label: "Burn rate above target", status: "warning", detail: "$2,100/mo vs target $1,800/mo — 17% over" },
    { label: "Events budget healthy", status: "good", detail: "$2,520 of $8,000 spent — 69% remaining" },
  ],
};

// ─── Events Insight ───────────────────────────────────────
// BACKEND LOGIC: Queries events + event_registrations + event_volunteers.
// risk flags auto-generated when registration < 50% within 7 days,
// or volunteer slots unfilled within 3 days.
export const eventsInsight: EventsInsight = {
  totalUpcoming: 3,
  avgRegistrationRate: 70,
  volunteerCoverageRate: 88,
  events: [
    {
      title: "Tech Talk: AI in 2026",
      date: "Feb 10 • 6:00 PM",
      registered: 45,
      capacity: 50,
      volunteersFilled: 5,
      volunteersNeeded: 5,
      status: "on_track",
      risks: [],
    },
    {
      title: "Valentine Social",
      date: "Feb 14 • 8:00 PM",
      registered: 80,
      capacity: 100,
      volunteersFilled: 8,
      volunteersNeeded: 8,
      status: "on_track",
      risks: ["Catering order not yet confirmed"],
    },
    {
      title: "Workshop: Resume Design",
      date: "Feb 15 • 2:00 PM",
      registered: 12,
      capacity: 30,
      volunteersFilled: 2,
      volunteersNeeded: 4,
      status: "critical",
      risks: [
        "Only 40% registered with 5 days to go",
        "2 of 4 volunteer slots still open",
        "No social media promo posted yet",
      ],
    },
  ],
  trend: [
    { label: "Oct", value: 75 },
    { label: "Nov", value: 82 },
    { label: "Dec", value: 68 },
    { label: "Jan", value: 85 },
    { label: "Feb", value: 70 },
  ],
  strengths: [
    "Tech Talk nearly sold out — strong community interest in AI topics",
    "Valentine Social has solid volunteer coverage (100%)",
    "Average attendance trending up term-over-term",
  ],
  concerns: [
    "Workshop: Resume Design at critical risk — 40% fill, missing volunteers",
    "No promotional post scheduled for Workshop event",
    "Valentine Social catering not confirmed yet — 3 days until event",
  ],
};

// ─── Risks Insight ────────────────────────────────────────
// BACKEND LOGIC: Aggregated from budget_alerts, task overdue checks,
// event risk flags, and member inactivity scans.
// Runs every 5 min via dashboard_metrics background job.
export const risksInsight: RisksInsight = {
  totalRisks: 5,
  highCount: 2,
  mediumCount: 2,
  lowCount: 1,
  resolvedThisWeek: 3,
  trendingUp: false,
  risks: [
    {
      title: "Workshop under-registered",
      category: "events",
      severity: "high",
      description: "Resume Design Workshop is at 40% capacity with only 5 days to go. Historical data shows events below 50% at this stage have a 70% chance of under-performing.",
      recommendation: "Push an urgent social media blast and send a targeted email to members who attended past workshops.",
      affectedEntity: "Workshop: Resume Design",
      detectedAt: "2025-02-09",
    },
    {
      title: "Marketing budget exceeded",
      category: "budget",
      severity: "high",
      description: "Marketing category has spent $3,200 against a $3,000 allocation. Any further marketing expenses will be unbudgeted.",
      recommendation: "Freeze marketing spend or reallocate $500 from under-utilized Operations budget.",
      affectedEntity: "Budget > Marketing",
      detectedAt: "2025-02-05",
    },
    {
      title: "Low volunteer coverage — Workshop",
      category: "events",
      severity: "medium",
      description: "Resume Design Workshop needs 4 volunteers but only 2 have signed up.",
      recommendation: "Send a volunteer call-out to executives and offer incentive (e.g., volunteer hours credit).",
      affectedEntity: "Workshop: Resume Design",
      detectedAt: "2025-02-08",
    },
    {
      title: "Budget burn rate above target",
      category: "budget",
      severity: "medium",
      description: "Current burn rate of $2,100/mo exceeds the $1,800/mo target by 17%. At this rate, budget will deplete 1.2 months earlier than planned.",
      recommendation: "Review upcoming planned expenses and defer non-critical spending until March.",
      affectedEntity: "Budget > Overall",
      detectedAt: "2025-02-01",
    },
    {
      title: "Inactive member — Lisa Park",
      category: "members",
      severity: "low",
      description: "Lisa Park has had no task completions, event attendance, or system logins in 28 days.",
      recommendation: "Reach out with a personal check-in. Consider assigning a small collaborative task to re-engage.",
      affectedEntity: "Lisa Park (Executive)",
      detectedAt: "2025-02-07",
    },
  ],
};

// ─── Approvals Insight ────────────────────────────────────
// BACKEND LOGIC: Queries events(status='pending_approval'),
// expenses(status='pending'), posts(status='pending_approval').
// daysWaiting = NOW() - submitted_at. Priority auto-set by
// amount thresholds and event proximity.
export const approvalsInsight: ApprovalsInsight = {
  totalPending: 12,
  avgWaitDays: 2.4,
  oldestItem: 5,
  byType: [
    { type: "Event", count: 4 },
    { type: "Finance", count: 5 },
    { type: "Marketing", count: 2 },
    { type: "Budget Change", count: 1 },
  ],
  items: [
    {
      id: "a1",
      type: "event",
      title: "Workshop: Resume Design",
      submittedBy: "Mike Johnson",
      submittedAt: "2025-02-05",
      daysWaiting: 5,
      priority: "high",
      description: "Event needs approval before venue can be finalized. Feb 15 deadline approaching.",
    },
    {
      id: "a2",
      type: "finance",
      title: "Catering Reimbursement #402",
      submittedBy: "Sarah Smith",
      submittedAt: "2025-02-07",
      daysWaiting: 3,
      priority: "high",
      amount: 145,
      description: "Catering for January kickoff social. Receipt attached. Charged to Events budget.",
    },
    {
      id: "a3",
      type: "finance",
      title: "Supplies Purchase — Banners",
      submittedBy: "Jordan Lee",
      submittedAt: "2025-02-08",
      daysWaiting: 2,
      priority: "medium",
      amount: 89,
      description: "Pull-up banners for Tech Talk event booth. Charged to Marketing budget.",
    },
    {
      id: "a4",
      type: "marketing",
      title: "IG Story — Valentine Social Promo",
      submittedBy: "Jordan Lee",
      submittedAt: "2025-02-09",
      daysWaiting: 1,
      priority: "medium",
      description: "Instagram story series promoting Valentine Social. 3 story frames ready for review.",
    },
    {
      id: "a5",
      type: "budget_change",
      title: "Marketing Budget Increase +$500",
      submittedBy: "Marcus Johnson",
      submittedAt: "2025-02-06",
      daysWaiting: 4,
      priority: "high",
      amount: 500,
      description: "Requesting $500 reallocation from Operations to Marketing to cover overrun.",
    },
  ],
  recentlyApproved: [
    { title: "Tech Talk: AI in 2026", approvedAt: "2025-02-03", type: "Event" },
    { title: "Valentine Social", approvedAt: "2025-02-02", type: "Event" },
    { title: "Venue deposit — Main Hall", approvedAt: "2025-01-28", type: "Finance" },
  ],
};
