import Stripe from "stripe";

import { env } from "@/lib/env";

import type { PaymentProcessor, SubscriptionSnapshot } from "./processor";
import type { BillingInterval, PlanId } from "./plans";

let client: Stripe | undefined;
function stripe() {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}

const priceMap = (): Record<string, { plan: PlanId; interval: BillingInterval }> => {
  const entries: Array<[string | undefined, PlanId, BillingInterval]> = [
    [env.STRIPE_PRICE_PRO_MONTHLY, "pro", "monthly"],
    [env.STRIPE_PRICE_PRO_YEARLY, "pro", "yearly"],
    [env.STRIPE_PRICE_BUSINESS_MONTHLY, "business", "monthly"],
    [env.STRIPE_PRICE_BUSINESS_YEARLY, "business", "yearly"],
  ];
  return Object.fromEntries(entries.filter(([id]) => id).map(([id, plan, interval]) => [id, { plan, interval }]));
};

export function priceIdFor(plan: PlanId, interval: BillingInterval) {
  return Object.entries(priceMap()).find(([, v]) => v.plan === plan && v.interval === interval)?.[0];
}

function snapshot(sub: Stripe.Subscription): SubscriptionSnapshot | undefined {
  const organizationId = sub.metadata?.organizationId;
  if (!organizationId) return undefined;
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const mapped = priceId ? priceMap()[priceId] : undefined;
  return {
    organizationId,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscriptionId: sub.id,
    priceId,
    plan: mapped?.plan ?? "free",
    status: sub.status,
    interval: mapped?.interval ?? null,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

export const stripeProcessor: PaymentProcessor = {
  id: "stripe",
  isConfigured: () => Boolean(env.STRIPE_SECRET_KEY),

  async createCheckoutSession(input) {
    const price = priceIdFor(input.plan, input.interval);
    if (!price) throw new Error(`No Stripe price configured for ${input.plan}/${input.interval}`);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: input.customerEmail,
      client_reference_id: input.organizationId,
      allow_promotion_codes: true,
      subscription_data: { metadata: { organizationId: input.organizationId } },
      metadata: { organizationId: input.organizationId },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  },

  async createPortalSession({ customerId, returnUrl }) {
    const session = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return { url: session.url };
  },

  async parseWebhook(rawBody, headers) {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    const signature = headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");
    const event = stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.mode !== "subscription" || !s.subscription) return { id: event.id, type: event.type };
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        const sub = await stripe().subscriptions.retrieve(subId);
        return { id: event.id, type: event.type, subscription: snapshot(sub) };
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        return { id: event.id, type: event.type, subscription: snapshot(event.data.object) };
      default:
        return { id: event.id, type: event.type };
    }
  },
};
