import type { UserProfile } from "@/context/auth-context"
import type { Role } from "@/context/role-context"

export const RESERVED_ONBOARDING_ROLES: Role[] = ["President", "Administrator"]

export const SELF_SELECTABLE_ONBOARDING_ROLES: Role[] = [
  "VP Internal",
  "VP Finance",
  "VP Events",
  "VP External",
  "Marketing",
  "Executive",
]

export function canSelfSelectOnboardingRole(role: Role) {
  return SELF_SELECTABLE_ONBOARDING_ROLES.includes(role)
}

/**
 * @deprecated Roles can no longer be self-selected during onboarding (real RBAC).
 * Kept for backwards compatibility with existing tests; use validateOnboardingProfile.
 */
export function validateOnboardingSubmission(input: {
  fullName: string
  role: Role | null
}) {
  const fullName = input.fullName.trim()

  if (!fullName) {
    return "Please enter your name."
  }

  if (!input.role) {
    return "Please choose your role."
  }

  if (!canSelfSelectOnboardingRole(input.role)) {
    return "This role must be assigned by the organization."
  }

  return null
}

export const MAX_FULL_NAME_LENGTH = 100

/**
 * Validates the self-service part of onboarding. Roles are NOT self-assigned:
 * they are granted by a President / Administrator via the `set_member_role` RPC.
 */
export function validateOnboardingProfile(input: { fullName: string }) {
  const fullName = input.fullName.trim()
  if (!fullName) return "Please enter your name."
  if (fullName.length > MAX_FULL_NAME_LENGTH) {
    return `Name must be ${MAX_FULL_NAME_LENGTH} characters or fewer.`
  }
  return null
}

export function isOnboardingComplete(profile: Pick<UserProfile, "onboarding_completed"> | null) {
  return profile?.onboarding_completed ?? false
}
