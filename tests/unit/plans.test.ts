import { describe, expect, it } from "vitest";

import { formatLimit, isWithinLimit, PLANS, resolvePlanId, UNLIMITED } from "@/lib/billing/plans";

describe("resolvePlanId", () => {
  it("defaults to free without a subscription", () => {
    expect(resolvePlanId(null)).toBe("free");
  });
  it("uses the plan for active-like statuses", () => {
    expect(resolvePlanId({ plan: "pro", status: "active" })).toBe("pro");
    expect(resolvePlanId({ plan: "business", status: "trialing" })).toBe("business");
    expect(resolvePlanId({ plan: "pro", status: "past_due" })).toBe("pro");
  });
  it("falls back to free for canceled or unknown plans", () => {
    expect(resolvePlanId({ plan: "pro", status: "canceled" })).toBe("free");
    expect(resolvePlanId({ plan: "enterprise", status: "active" })).toBe("free");
  });
});

describe("limits", () => {
  it("checks limits inclusively", () => {
    expect(isWithinLimit(3, 2)).toBe(true);
    expect(isWithinLimit(3, 3)).toBe(false);
    expect(isWithinLimit(UNLIMITED, 1_000_000)).toBe(true);
  });
  it("formats unlimited", () => {
    expect(formatLimit(UNLIMITED)).toBe("Unlimited");
    expect(formatLimit(PLANS.free.limits.members)).toBe("3");
  });
});
