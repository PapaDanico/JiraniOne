import { describe, it, expect } from "vitest";
import {
  PLANS,
  GRACE_DAYS,
  computeBillingState,
  periodKey,
  periodLabel,
  tierForUnits,
} from "./billing";

describe("tierForUnits", () => {
  it("maps unit counts onto tiers at the documented thresholds", () => {
    expect(tierForUnits(null)).toBe("starter");
    expect(tierForUnits(0)).toBe("starter");
    expect(tierForUnits(40)).toBe("starter");   // boundary: last Starter
    expect(tierForUnits(41)).toBe("growth");    // boundary: first Growth
    expect(tierForUnits(150)).toBe("growth");   // boundary: last Growth
    expect(tierForUnits(151)).toBe("enterprise");
    expect(tierForUnits(5000)).toBe("enterprise");
  });

  it("every tier has a positive KES price", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.monthlyKes).toBeGreaterThan(0);
    }
  });
});

describe("periodKey / periodLabel", () => {
  it("formats YYYY-MM and a readable label", () => {
    const d = new Date(Date.UTC(2026, 6, 23)); // July 2026
    expect(periodKey(d)).toBe("2026-07");
    expect(periodLabel("2026-07")).toBe("July 2026");
  });
});

describe("computeBillingState", () => {
  const now = new Date("2026-07-23T12:00:00Z");
  const day = 24 * 60 * 60 * 1000;

  it("exempt wins over everything", () => {
    expect(
      computeBillingState({
        billingExempt: true,
        trialEndsAt: null,
        oldestUnpaidDueAt: new Date(now.getTime() - 100 * day),
        now,
      }),
    ).toBe("exempt");
  });

  it("trialing while inside the trial window", () => {
    expect(
      computeBillingState({
        billingExempt: false,
        trialEndsAt: new Date(now.getTime() + 5 * day),
        oldestUnpaidDueAt: null,
        now,
      }),
    ).toBe("trialing");
  });

  it("active when trial lapsed and nothing unpaid", () => {
    expect(
      computeBillingState({
        billingExempt: false,
        trialEndsAt: new Date(now.getTime() - 5 * day),
        oldestUnpaidDueAt: null,
        now,
      }),
    ).toBe("active");
  });

  it("active while an unpaid invoice is not yet due", () => {
    expect(
      computeBillingState({
        billingExempt: false,
        trialEndsAt: new Date(now.getTime() - 5 * day),
        oldestUnpaidDueAt: new Date(now.getTime() + 3 * day),
        now,
      }),
    ).toBe("active");
  });

  it("past_due inside the grace window, suspended after it", () => {
    const overdueBy2 = new Date(now.getTime() - 2 * day);
    expect(
      computeBillingState({
        billingExempt: false,
        trialEndsAt: new Date(now.getTime() - 40 * day),
        oldestUnpaidDueAt: overdueBy2,
        now,
      }),
    ).toBe("past_due");

    const beyondGrace = new Date(now.getTime() - (GRACE_DAYS + 1) * day);
    expect(
      computeBillingState({
        billingExempt: false,
        trialEndsAt: new Date(now.getTime() - 60 * day),
        oldestUnpaidDueAt: beyondGrace,
        now,
      }),
    ).toBe("suspended");
  });

  it("accepts ISO strings for dates (API/JSON boundary)", () => {
    expect(
      computeBillingState({
        billingExempt: false,
        trialEndsAt: "2026-08-01T00:00:00Z",
        oldestUnpaidDueAt: null,
        now,
      }),
    ).toBe("trialing");
  });
});
