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

export function isOnboardingComplete(profile: Pick<UserProfile, "onboarding_completed"> | null) {
  return profile?.onboarding_completed ?? false
}
