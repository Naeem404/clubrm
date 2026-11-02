/**
 * Single source of truth for role-based access control (RBAC) in the UI.
 *
 * Based on docs/02_ROLES_AND_PERMISSIONS.txt (permission matrix, section 3).
 *
 * IMPORTANT: this only drives what the UI shows / which routes it lets you open.
 * The real enforcement lives in the database (RLS policies + the
 * `set_member_role` RPC). Never rely on this file alone for security.
 */
import type { Role } from "@/context/role-context"

export const ALL_ROLES: readonly Role[] = [
  "President",
  "VP Internal",
  "VP Finance",
  "VP Events",
  "VP External",
  "Marketing",
  "Executive",
  "Administrator",
] as const

/** Least-privileged role. Used for unknown / missing / legacy ("member") roles. */
export const DEFAULT_ROLE: Role = "Executive"

/** Roles allowed to assign roles to other users (via the `set_member_role` RPC). */
export const ROLE_MANAGER_ROLES: readonly Role[] = ["President", "Administrator"]

export type Permission =
  | "dashboard.view"
  | "account.manage" // own profile + personal preferences (all roles)
  | "documents.read"
  | "tasks.read"
  | "tasks.write"
  | "tasks.assign"
  | "tasks.delete"
  | "events.read"
  | "events.write"
  | "events.approve"
  | "events.delete"
  | "members.read"
  | "members.write"
  | "members.invite"
  | "members.remove"
  | "budget.read"
  | "budget.write"
  | "budget.approve"
  | "reimbursements.read"
  | "reimbursements.write"
  | "reimbursements.approve"
  | "sponsors.read"
  | "sponsors.write"
  | "sponsors.delete"
  | "marketing.read"
  | "marketing.write"
  | "marketing.approve"
  | "reports.read"
  | "reports.export"
  | "settings.manage"
  | "roles.assign"
  | "audit.view"

const BASE: Permission[] = [
  "dashboard.view",
  "account.manage",
  "documents.read",
  "tasks.read",
  "events.read",
  "members.read",
]

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  President: [
    ...BASE,
    "tasks.write", "tasks.assign", "tasks.delete",
    "events.write", "events.approve", "events.delete",
    "members.write", "members.invite", "members.remove",
    "budget.read", "reimbursements.read",
    "sponsors.read",
    "marketing.read", "marketing.approve",
    "reports.read", "reports.export",
    "roles.assign",
    "audit.view",
  ],
  "VP Internal": [
    ...BASE,
    "tasks.write", "tasks.assign", "tasks.delete",
    "events.write", "events.approve", "events.delete",
    "members.write", "members.invite", "members.remove",
    "reports.read",
  ],
  "VP Finance": [
    ...BASE,
    "budget.read", "budget.write", "budget.approve",
    "reimbursements.read", "reimbursements.write", "reimbursements.approve",
    "sponsors.read",
    "reports.read", "reports.export",
  ],
  "VP Events": [
    ...BASE,
    "tasks.write", "tasks.assign",
    "events.write",
    "budget.read",
    "reports.read",
  ],
  "VP External": [
    ...BASE,
    "tasks.write", "tasks.assign",
    "budget.read",
    "sponsors.read", "sponsors.write", "sponsors.delete",
    "reports.read",
  ],
  Marketing: [
    ...BASE,
    "tasks.write",
    "marketing.read", "marketing.write", "marketing.approve",
    "reports.read",
  ],
  Executive: [
    ...BASE,
    "tasks.write",
  ],
  Administrator: [
    ...BASE,
    "tasks.write", "tasks.assign", "tasks.delete",
    "events.write", "events.approve", "events.delete",
    "members.write", "members.invite", "members.remove",
    "budget.read", "budget.write", "budget.approve",
    "reimbursements.read", "reimbursements.write", "reimbursements.approve",
    "sponsors.read", "sponsors.write", "sponsors.delete",
    "marketing.read", "marketing.write", "marketing.approve",
    "reports.read", "reports.export",
    "settings.manage",
    "roles.assign",
    "audit.view",
  ],
}

/**
 * Route -> permissions required (ANY of them grants access).
 * Keys are the first path segment ("/finance/anything" -> "/finance").
 */
export const ROUTE_PERMISSIONS: Record<string, readonly Permission[]> = {
  "/": ["dashboard.view"],
  "/dashboard": ["dashboard.view"],
  "/tasks": ["tasks.read"],
  "/events": ["events.read"],
  "/members": ["members.read"],
  // Finance page exposes expenses + reimbursements, so require reimbursements.read
  // (President, VP Finance, Administrator) rather than the broader budget.read.
  "/finance": ["reimbursements.read"],
  "/external": ["sponsors.read"],
  "/contacts": ["sponsors.read"],
  "/marketing": ["marketing.read"],
  "/reports": ["reports.read"],
  "/documents": ["documents.read"],
  // Settings contains personal preferences for everyone; privileged tabs are gated inside the page.
  "/settings": ["account.manage"],
  "/profile": ["account.manage"],
}

/** Map any value coming from the DB (profiles.role) to a known Role, least-privilege by default. */
export function normalizeRole(value: string | null | undefined): Role {
  if (!value) return DEFAULT_ROLE
  const match = ALL_ROLES.find((r) => r.toLowerCase() === value.trim().toLowerCase())
  return match ?? DEFAULT_ROLE
}

export function isKnownRole(value: string | null | undefined): value is Role {
  return !!value && (ALL_ROLES as readonly string[]).includes(value)
}

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

function routeKey(route: string): string {
  const path = route.split(/[?#]/)[0] || "/"
  const first = path.split("/").filter(Boolean)[0]
  return first ? `/${first}` : "/"
}

/** Can `role` open `route`? Unknown routes are denied. */
export function canAccess(role: Role | null | undefined, route: string): boolean {
  if (!role) return false
  const required = ROUTE_PERMISSIONS[routeKey(route)]
  if (!required) return false
  return required.some((p) => hasPermission(role, p))
}

export function canManageRoles(role: Role | null | undefined): boolean {
  return hasPermission(role, "roles.assign")
}
