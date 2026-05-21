import { describe, expect, it } from "vitest"
import {
  isOnboardingComplete,
  validateOnboardingSubmission,
} from "../../src/lib/onboarding-logic"

describe("Onboarding logic", () => {
  describe("validateOnboardingSubmission", () => {
    it("requires a name", () => {
      expect(
        validateOnboardingSubmission({
          fullName: "   ",
          role: "Executive",
        })
      ).toBe("Please enter your name.")
    })

    it("requires a role", () => {
      expect(
        validateOnboardingSubmission({
          fullName: "Ash Deep",
          role: null,
        })
      ).toBe("Please choose your role.")
    })

    it("rejects reserved roles", () => {
      expect(
        validateOnboardingSubmission({
          fullName: "Ash Deep",
          role: "President",
        })
      ).toBe("This role must be assigned by the organization.")
    })

    it("accepts valid onboarding submissions", () => {
      expect(
        validateOnboardingSubmission({
          fullName: "Ash Deep",
          role: "VP Finance",
        })
      ).toBeNull()
    })
  })

  describe("isOnboardingComplete", () => {
    it("returns false for missing profiles", () => {
      expect(isOnboardingComplete(null)).toBe(false)
    })

    it("returns false for incomplete profiles", () => {
      expect(isOnboardingComplete({ onboarding_completed: false })).toBe(false)
    })

    it("returns true for completed profiles", () => {
      expect(isOnboardingComplete({ onboarding_completed: true })).toBe(true)
    })
  })
})
