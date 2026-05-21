import { describe, expect, it } from "vitest"
import {
  RESERVED_ONBOARDING_ROLES,
  SELF_SELECTABLE_ONBOARDING_ROLES,
  canSelfSelectOnboardingRole,
} from "../../src/lib/onboarding-logic"

describe("Onboarding domain rules", () => {
  it("keeps reserved roles out of self-selection", () => {
    for (const role of RESERVED_ONBOARDING_ROLES) {
      expect(canSelfSelectOnboardingRole(role)).toBe(false)
    }
  })

  it("allows only the intended onboarding roles", () => {
    for (const role of SELF_SELECTABLE_ONBOARDING_ROLES) {
      expect(canSelfSelectOnboardingRole(role)).toBe(true)
    }
  })

  it("does not overlap reserved and self-selectable role sets", () => {
    const overlap = RESERVED_ONBOARDING_ROLES.filter((role) =>
      SELF_SELECTABLE_ONBOARDING_ROLES.includes(role)
    )

    expect(overlap).toEqual([])
  })
})
