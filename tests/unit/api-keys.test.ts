import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/tenant", () => ({ withSystem: vi.fn() }));

const { generateApiKey, hashApiKey, safeEqualHex } = await import("@/lib/api-keys");

describe("api keys", () => {
  it("generates prefixed, unique keys with a matching hash", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).toMatch(/^sk_live_[0-9A-Za-z]{32}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.prefix).toBe(a.key.slice(0, 12));
    expect(a.hashedKey).toBe(hashApiKey(a.key));
    expect(a.hashedKey).not.toContain(a.key);
  });
  it("compares hashes in constant time", () => {
    const h = hashApiKey("x");
    expect(safeEqualHex(h, hashApiKey("x"))).toBe(true);
    expect(safeEqualHex(h, hashApiKey("y"))).toBe(false);
  });
});
