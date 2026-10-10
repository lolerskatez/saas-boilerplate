/** API key verification against a real database (skipped without DATABASE_URL). */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("verifyApiKey", async () => {
  const { db, pool, systemPool } = await import("@/lib/db");
  const { apiKey, member, organization, user } = await import("@/lib/db/schema");
  const { withTenant } = await import("@/lib/db/tenant");
  const { generateApiKey, hashApiKey, verifyApiKey } = await import("@/lib/api-keys");
  const suffix = randomUUID();
  const orgId = `org-${suffix}`;
  const userId = `user-${suffix}`;
  const { key } = generateApiKey();

  beforeAll(async () => {
    await db.insert(organization).values({ id: orgId, name: "Keys", slug: orgId, createdAt: new Date() });
    await db.insert(user).values({ id: userId, name: "Key owner", email: `${suffix}@example.com` });
    await db.insert(member).values({ id: `m-${suffix}`, organizationId: orgId, userId, createdAt: new Date() });
    await withTenant(orgId, (tx) =>
      tx.insert(apiKey).values({
        organizationId: orgId,
        name: "test",
        prefix: key.slice(0, 12),
        hashedKey: hashApiKey(key),
        createdById: userId,
      }),
    );
  });

  afterAll(async () => {
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(eq(user.id, userId));
    await Promise.all([pool.end(), systemPool.end()]);
  });

  it("accepts a key whose creator is a member", async () => {
    expect((await verifyApiKey(key))?.organizationId).toBe(orgId);
  });

  it("rejects the key once its creator leaves the organization", async () => {
    await db.delete(member).where(eq(member.userId, userId));
    expect(await verifyApiKey(key)).toBeNull();
  });
});
