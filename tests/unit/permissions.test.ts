import { describe, expect, it } from "vitest";

import { can } from "@/lib/auth/permissions";

describe("can", () => {
  it("lets owners manage billing", () => {
    expect(can("owner", { billing: ["manage"] })).toBe(true);
  });
  it("lets admins read but not manage billing", () => {
    expect(can("admin", { billing: ["read"] })).toBe(true);
    expect(can("admin", { billing: ["manage"] })).toBe(false);
  });
  it("restricts members", () => {
    expect(can("member", { project: ["create"] })).toBe(true);
    expect(can("member", { project: ["delete"] })).toBe(false);
    expect(can("member", { apiKey: ["create"] })).toBe(false);
    expect(can("member", { auditLog: ["read"] })).toBe(false);
  });
  it("supports comma-separated multi-roles and rejects unknown roles", () => {
    expect(can("member,admin", { apiKey: ["create"] })).toBe(true);
    expect(can("guest", { project: ["read"] })).toBe(false);
    expect(can(null, { project: ["read"] })).toBe(false);
  });
});
