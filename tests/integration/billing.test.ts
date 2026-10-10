/** Webhook processing against a real database (skipped without DATABASE_URL). */
import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { SubscriptionSnapshot } from "@/lib/billing/processor";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("handleWebhookEvent", async () => {
  const { db, pool, systemPool } = await import("@/lib/db");
  const { auditLog, organization, subscription } = await import("@/lib/db/schema");
  const { withTenant } = await import("@/lib/db/tenant");
  const { handleWebhookEvent } = await import("@/lib/billing");
  const orgId = `test-${randomUUID()}`;
  const snap = (plan: SubscriptionSnapshot["plan"], status = "active"): SubscriptionSnapshot => ({
    organizationId: orgId,
    customerId: "cus_test",
    subscriptionId: `sub_${orgId}`,
    priceId: null,
    plan,
    status,
    interval: "monthly",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
  const event = (plan: SubscriptionSnapshot["plan"], at: string) => ({
    id: `evt_${randomUUID()}`,
    type: "customer.subscription.updated",
    createdAt: new Date(at),
    subscription: snap(plan),
  });

  beforeAll(async () => {
    await db.insert(organization).values({ id: orgId, name: "Billing", slug: orgId, createdAt: new Date() });
  });

  afterAll(async () => {
    await db.delete(organization).where(inArray(organization.id, [orgId]));
    await Promise.all([pool.end(), systemPool.end()]);
  });

  const currentPlan = async () =>
    (await db.select().from(subscription).where(eq(subscription.organizationId, orgId)))[0]?.plan;

  it("applies an event once and reports duplicates", async () => {
    const e = event("pro", "2026-01-01T12:00:00Z");
    expect(await handleWebhookEvent("stripe", e)).toBe("processed");
    expect(await handleWebhookEvent("stripe", e)).toBe("duplicate");
    expect(await currentPlan()).toBe("pro");
  });

  it("ignores events older than the last applied one", async () => {
    expect(await handleWebhookEvent("stripe", event("business", "2026-01-01T12:02:00Z"))).toBe("processed");
    expect(await handleWebhookEvent("stripe", event("pro", "2026-01-01T12:01:00Z"))).toBe("stale");
    expect(await currentPlan()).toBe("business");
  });

  it("writes the audit entry in the same transaction", async () => {
    const entries = await withTenant(orgId, (tx) =>
      tx.select().from(auditLog).where(eq(auditLog.action, "billing.subscription_changed")),
    );
    expect(entries).toHaveLength(2);
  });

  it("serializes concurrent events so the newest snapshot wins", async () => {
    const results = await Promise.all([
      handleWebhookEvent("stripe", event("pro", "2026-01-01T12:04:00Z")),
      handleWebhookEvent("stripe", event("free", "2026-01-01T12:03:00Z")),
    ]);
    expect(results[0]).toBe("processed");
    expect(["processed", "stale"]).toContain(results[1]);
    expect(await currentPlan()).toBe("pro");
  });
});
