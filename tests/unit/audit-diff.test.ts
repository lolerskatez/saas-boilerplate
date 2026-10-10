import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/tenant", () => ({ withTenant: vi.fn() }));

const { diff } = await import("@/lib/audit");

describe("audit diff", () => {
  it("records only changed fields", () => {
    expect(diff({ name: "A", status: "active" }, { name: "B", status: "active" })).toEqual({
      name: { from: "A", to: "B" },
    });
  });
  it("handles creations and deletions", () => {
    expect(diff(null, { name: "A" })).toEqual({ name: { from: null, to: "A" } });
    expect(diff({ name: "A" }, null)).toEqual({ name: { from: "A", to: null } });
  });
  it("ignores timestamps and normalizes dates", () => {
    const d1 = new Date("2024-01-01");
    expect(diff({ updatedAt: d1, due: d1 }, { updatedAt: new Date(), due: new Date("2024-01-01") })).toEqual({});
  });
});
