import { describe, expect, it } from "vitest";

import { safeRedirect } from "@/lib/auth/providers";
import { formatBytes, slugify } from "@/lib/utils";

describe("utils", () => {
  it("slugifies", () => {
    expect(slugify("  Acme Café, Inc.  ")).toBe("acme-cafe-inc");
  });
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(20 * 1024 * 1024)).toBe("20 MB");
  });
  it("prevents open redirects", () => {
    expect(safeRedirect("/dashboard/acme")).toBe("/dashboard/acme");
    expect(safeRedirect("https://evil.com")).toBe("/dashboard");
    expect(safeRedirect("//evil.com")).toBe("/dashboard");
    expect(safeRedirect(undefined, "/onboarding")).toBe("/onboarding");
  });
});
