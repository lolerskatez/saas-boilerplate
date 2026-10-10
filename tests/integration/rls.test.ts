/**
 * Verifies Postgres Row-Level Security isolates tenants. Requires a migrated database
 * (DATABASE_URL); skipped otherwise. Run with `npm run test` after `npm run db:migrate`.
 */
import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("row-level security", async () => {
  const { db, pool } = await import("@/lib/db");
  const { organization, project } = await import("@/lib/db/schema");
  const { withSystem, withTenant } = await import("@/lib/db/tenant");
  const orgA = `test-${randomUUID()}`;
  const orgB = `test-${randomUUID()}`;

  beforeAll(async () => {
    await db.insert(organization).values([
      { id: orgA, name: "A", slug: orgA, createdAt: new Date() },
      { id: orgB, name: "B", slug: orgB, createdAt: new Date() },
    ]);
    await withTenant(orgA, (tx) => tx.insert(project).values({ organizationId: orgA, name: "a-project" }));
    await withTenant(orgB, (tx) => tx.insert(project).values({ organizationId: orgB, name: "b-project" }));
  });

  afterAll(async () => {
    await db.delete(organization).where(sql`${organization.id} in (${orgA}, ${orgB})`);
    await pool.end();
  });

  it("only returns the current tenant's rows", async () => {
    const rows = await withTenant(orgA, (tx) => tx.select().from(project));
    expect(rows.map((r) => r.name)).toEqual(["a-project"]);
  });

  it("returns nothing without a tenant context", async () => {
    const rows = await db.select().from(project).where(eq(project.organizationId, orgA));
    expect(rows).toHaveLength(0);
  });

  it("rejects writes into another tenant", async () => {
    await expect(
      withTenant(orgA, (tx) => tx.insert(project).values({ organizationId: orgB, name: "evil" })),
    ).rejects.toThrow();
  });

  it("cannot update another tenant's rows", async () => {
    const updated = await withTenant(orgA, (tx) =>
      tx.update(project).set({ name: "hacked" }).where(eq(project.organizationId, orgB)).returning(),
    );
    expect(updated).toHaveLength(0);
  });

  it("allows trusted system access across tenants", async () => {
    const rows = await withSystem((tx) =>
      tx
        .select()
        .from(project)
        .where(sql`${project.organizationId} in (${orgA}, ${orgB})`),
    );
    expect(rows).toHaveLength(2);
  });
});
