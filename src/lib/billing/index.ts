import { eq, sql } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { processedWebhookEvent, subscription } from "@/lib/db/schema";
import { notifyOrgAdmins } from "@/lib/notifications";

import type { PaymentProcessor, WebhookEvent } from "./processor";
import { PLANS } from "./plans";
import { stripeProcessor } from "./stripe";

export const processors: Record<string, PaymentProcessor> = { stripe: stripeProcessor };

export const paymentProcessor: PaymentProcessor = stripeProcessor;

export type WebhookResult = "processed" | "duplicate" | "stale";

/**
 * Applies a webhook event exactly once. The event id, subscription upsert, audit entry and
 * notifications share one transaction, so a failure anywhere lets the provider's retry redo
 * everything. Events older than the last applied one are recorded but ignored, because
 * providers do not guarantee delivery order.
 */
export async function handleWebhookEvent(provider: string, event: WebhookEvent): Promise<WebhookResult> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(processedWebhookEvent)
      .values({ provider, eventId: event.id, eventType: event.type })
      .onConflictDoNothing()
      .returning({ id: processedWebhookEvent.id });
    if (inserted.length === 0) return "duplicate";

    const snap = event.subscription;
    if (!snap) return "processed";

    // Serializes events per org, including the first one when no subscription row exists to lock.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`billing:${snap.organizationId}`}))`);
    const [previous] = await tx
      .select({ plan: subscription.plan, status: subscription.status, lastEventAt: subscription.lastEventAt })
      .from(subscription)
      .where(eq(subscription.organizationId, snap.organizationId));
    if (previous?.lastEventAt && previous.lastEventAt > event.createdAt) return "stale";

    const values = { ...snap, provider, lastEventAt: event.createdAt };
    await tx
      .insert(subscription)
      .values(values)
      .onConflictDoUpdate({ target: subscription.organizationId, set: values });

    if (previous?.plan !== snap.plan || previous?.status !== snap.status) {
      await tx.execute(sql`select set_config('app.current_org_id', ${snap.organizationId}, true)`);
      await recordAudit(
        {
          organizationId: snap.organizationId,
          actor: { type: "system" },
          action: "billing.subscription_changed",
          entityType: "subscription",
          entityId: snap.subscriptionId,
          before: previous ? { plan: previous.plan, status: previous.status } : null,
          after: { plan: snap.plan, status: snap.status },
        },
        tx,
      );
      await notifyOrgAdmins(
        snap.organizationId,
        {
          type: "billing",
          title: "Subscription updated",
          body: `Your organization is now on the ${PLANS[snap.plan].name} plan (${snap.status}).`,
        },
        { tx },
      );
    }
    return "processed";
  });
}
