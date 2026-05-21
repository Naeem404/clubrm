/**
 * Central widget configuration registry.
 *
 * Every dashboard variant imports its widget titles from here instead of
 * maintaining a local copy.  Adding or renaming a widget now requires a
 * single edit in this file rather than touching all 8 dashboard files
 * (eliminates Shotgun Surgery).
 */

// ── President ────────────────────────────────────────────────────────
export const PRESIDENT_WIDGET_TITLES: Record<string, string> = {
  "org-health": "Org Health Score",
  "active-members": "Active Members",
  "budget": "Budget Remaining",
  "upcoming-events": "Upcoming Events",
  "risk-alerts": "Risk Alerts",
  "approval-queue": "Approval Queue",
};

export const PRESIDENT_DEFAULT_WIDGETS = [
  "org-health",
  "active-members",
  "budget",
  "upcoming-events",
  "risk-alerts",
  "approval-queue",
];

// ── Executive ────────────────────────────────────────────────────────
export const EXECUTIVE_WIDGET_TITLES: Record<string, string> = {
  "my-tasks": "My Tasks",
  "events-attending": "Events Attending",
  "hours-this-month": "Hours This Month",
  "task-progress": "My Task Progress",
  "upcoming-events": "Upcoming Events",
};

export const EXECUTIVE_DEFAULT_WIDGETS = [
  "my-tasks",
  "events-attending",
  "hours-this-month",
  "task-progress",
  "upcoming-events",
];

// ── Administrator ────────────────────────────────────────────────────
export const ADMIN_WIDGET_TITLES: Record<string, string> = {
  "system-health": "System Health",
  "total-users": "Total Users",
  "active-roles": "Active Roles",
  "role-distribution": "Role Distribution",
  "system-activity": "System Activity",
  "system-alerts": "System Alerts",
};

export const ADMIN_DEFAULT_WIDGETS = [
  "system-health",
  "total-users",
  "active-roles",
  "role-distribution",
  "system-activity",
  "system-alerts",
];

// ── Marketing ────────────────────────────────────────────────────────
export const MARKETING_WIDGET_TITLES: Record<string, string> = {
  "total-reach": "Total Reach",
  "engagement-rate": "Engagement Rate",
  "active-campaigns": "Active Campaigns",
  "campaign-performance": "Campaign Performance",
  "top-posts": "Top Posts",
  "scheduled-posts": "Scheduled Posts",
};

export const MARKETING_DEFAULT_WIDGETS = [
  "total-reach",
  "engagement-rate",
  "active-campaigns",
  "campaign-performance",
  "top-posts",
  "scheduled-posts",
];

// ── VP Events ────────────────────────────────────────────────────────
export const VP_EVENTS_WIDGET_TITLES: Record<string, string> = {
  "upcoming-events-count": "Upcoming Events",
  "total-registrations": "Total Registrations",
  "volunteer-coverage": "Volunteer Coverage",
  "event-readiness": "Event Readiness",
  "volunteer-gaps": "Volunteer Gaps",
  "venue-bookings": "Venue Bookings",
};

export const VP_EVENTS_DEFAULT_WIDGETS = [
  "upcoming-events-count",
  "total-registrations",
  "volunteer-coverage",
  "event-readiness",
  "volunteer-gaps",
  "venue-bookings",
];

// ── VP External ──────────────────────────────────────────────────────
export const VP_EXTERNAL_WIDGET_TITLES: Record<string, string> = {
  "active-sponsors": "Active Sponsors",
  "sponsorship-revenue": "Sponsorship Revenue",
  "pipeline-value": "Pipeline Value",
  "sponsor-tiers": "Sponsor Tiers",
  "recent-outreach": "Recent Outreach",
  "upcoming-renewals": "Upcoming Renewals",
};

export const VP_EXTERNAL_DEFAULT_WIDGETS = [
  "active-sponsors",
  "sponsorship-revenue",
  "pipeline-value",
  "sponsor-tiers",
  "recent-outreach",
  "upcoming-renewals",
];

// ── VP Finance ───────────────────────────────────────────────────────
export const VP_FINANCE_WIDGET_TITLES: Record<string, string> = {
  "budget-remaining": "Budget Remaining",
  "pending-approvals": "Pending Approvals",
  "total-income": "Total Income",
  "budget-category": "Budget by Category",
  "pending-reimbursements": "Pending Reimbursements",
  "recent-transactions": "Recent Transactions",
};

export const VP_FINANCE_DEFAULT_WIDGETS = [
  "budget-remaining",
  "pending-approvals",
  "total-income",
  "budget-category",
  "pending-reimbursements",
  "recent-transactions",
];

// ── VP Internal ──────────────────────────────────────────────────────
export const VP_INTERNAL_WIDGET_TITLES: Record<string, string> = {
  "tasks-completed": "Tasks Completed",
  "overdue-tasks": "Overdue Tasks",
  "team-productivity": "Team Productivity",
  "task-breakdown": "Task Breakdown",
  "blocked-tasks": "Blocked Tasks",
  "team-activity": "Team Activity",
};

export const VP_INTERNAL_DEFAULT_WIDGETS = [
  "tasks-completed",
  "overdue-tasks",
  "team-productivity",
  "task-breakdown",
  "blocked-tasks",
  "team-activity",
];
