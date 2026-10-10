import { eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { processedWebhookEvent, subscription } from "@/lib/db/schema";
import { notifyOrgAdmins } from "@/lib/notifications";

import type { PaymentProcessor, WebhookEvent } from "./processor";
import { PLANS } from "./plans";
import { stripeProcessor } from "./stripe";

export const processors: Record<string, PaymentProcessor> = { stripe: stripeProcessor };

export const paymentProcessor: PaymentProcessor = stripeProcessor;

/**
 * Applies a webhook event exactly once. The event id insert and the subscription upsert share a
 * transaction, so a crash mid-way lets the provider's retry re-process it cleanly.
 */
export async function handleWebhookEvent(provider: string, event: WebhookEvent): Promise<"processed" | "duplicate"> {
  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(processedWebhookEvent)
      .values({ provider, eventId: event.id, eventType: event.type })
      .onConflictDoNothing()
      .returning({ id: processedWebhookEvent.id });
    if (inserted.length === 0) return { status: "duplicate" as const };

    const snap = event.subscription;
    if (!snap) return { status: "processed" as const };

    const [previous] = await tx
      .select({ plan: subscription.plan, status: subscription.status })
      .from(subscription)
      .where(eq(subscription.organizationId, snap.organizationId));

    const values = { ...snap, provider };
    await tx
      .insert(subscription)
      .values(values)
      .onConflictDoUpdate({ target: subscription.organizationId, set: values });
    return { status: "processed" as const, snap, previous };
  });

  if (result.status === "processed" && result.snap) {
    const { snap, previous } = result;
    if (previous?.plan !== snap.plan || previous?.status !== snap.status) {
      await recordAudit({
        organizationId: snap.organizationId,
        actor: { type: "system" },
        action: "billing.subscription_changed",
        entityType: "subscription",
        entityId: snap.subscriptionId,
        before: previous ?? null,
        after: { plan: snap.plan, status: snap.status },
      });
      await notifyOrgAdmins(snap.organizationId, {
        type: "billing",
        title: "Subscription updated",
        body: `Your organization is now on the ${PLANS[snap.plan].name} plan (${snap.status}).`,
      });
    }
  }
  return result.status;
}
