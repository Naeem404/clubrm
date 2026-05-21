import { describe, it, expect } from "vitest"
import {
  EXPENSE_CATEGORIES,
  STATUS_CONFIG,
  REIMBURSEMENT_STATUS_CONFIG,
  INCOME_TYPE_CONFIG,
  getCategory,
  formatCurrency,
  formatCurrencyDetailed,
} from "../../../src/components/finance/types"

describe("Finance Types & Utilities", () => {
  describe("EXPENSE_CATEGORIES", () => {
    it("has 6 categories", () => {
      expect(EXPENSE_CATEGORIES.length).toBe(6)
    })

    it("each category has required fields", () => {
      EXPENSE_CATEGORIES.forEach((cat) => {
        expect(cat.id).toBeDefined()
        expect(cat.name).toBeDefined()
        expect(cat.color).toBeDefined()
        expect(cat.allocated).toBeGreaterThan(0)
      })
    })

    it("total allocation sums to 18000", () => {
      const total = EXPENSE_CATEGORIES.reduce((s, c) => s + c.allocated, 0)
      expect(total).toBe(18000)
    })
  })

  describe("getCategory", () => {
    it("returns the correct category by id", () => {
      const events = getCategory("events")
      expect(events?.name).toBe("Events")
    })

    it("returns undefined for unknown id", () => {
      expect(getCategory("nonexistent")).toBeUndefined()
    })
  })

  describe("formatCurrency", () => {
    it("formats whole numbers without decimals", () => {
      expect(formatCurrency(1000)).toBe("$1,000")
    })

    it("formats zero", () => {
      expect(formatCurrency(0)).toBe("$0")
    })
  })

  describe("formatCurrencyDetailed", () => {
    it("formats with two decimal places", () => {
      expect(formatCurrencyDetailed(1000)).toBe("$1,000.00")
      expect(formatCurrencyDetailed(49.5)).toBe("$49.50")
    })
  })

  describe("STATUS_CONFIG", () => {
    it("has configs for pending, approved, denied", () => {
      expect(STATUS_CONFIG.pending.label).toBe("Pending")
      expect(STATUS_CONFIG.approved.label).toBe("Approved")
      expect(STATUS_CONFIG.denied.label).toBe("Denied")
    })
  })

  describe("REIMBURSEMENT_STATUS_CONFIG", () => {
    it("has configs for pending, approved, denied, paid", () => {
      expect(REIMBURSEMENT_STATUS_CONFIG.pending.label).toBe("Pending")
      expect(REIMBURSEMENT_STATUS_CONFIG.paid.label).toBe("Paid")
    })
  })

  describe("INCOME_TYPE_CONFIG", () => {
    it("has configs for all income types", () => {
      expect(INCOME_TYPE_CONFIG.dues.label).toBe("Member Dues")
      expect(INCOME_TYPE_CONFIG.sponsorship.label).toBe("Sponsorship")
      expect(INCOME_TYPE_CONFIG.fundraising.label).toBe("Fundraising")
      expect(INCOME_TYPE_CONFIG.donation.label).toBe("Donation")
      expect(INCOME_TYPE_CONFIG.other.label).toBe("Other")
    })
  })
})
