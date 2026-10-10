import type { BillingInterval, PlanId } from "./plans";

export interface CheckoutInput {
  organizationId: string;
  organizationName: string;
  customerEmail: string;
  plan: Exclude<PlanId, "free">;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

/** Normalized subscription state a processor reports back from webhooks. */
export interface SubscriptionSnapshot {
  organizationId: string;
  customerId: string | null;
  subscriptionId: string | null;
  priceId: string | null;
  plan: PlanId;
  status: string;
  interval: BillingInterval | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface WebhookEvent {
  id: string;
  type: string;
  /**
   * When `subscription` reflected the provider's state (event creation, or refetch time if the
   * processor refetches). Snapshots older than the last applied one are ignored.
   */
  createdAt: Date;
  /** Present when the event changes an organization's subscription. */
  subscription?: SubscriptionSnapshot;
}

/**
 * Payment provider abstraction (inspired by Open SaaS). Stripe is implemented; add Polar,
 * Lemon Squeezy or Paddle by implementing this interface and registering it in `index.ts`.
 */
export interface PaymentProcessor {
  id: string;
  isConfigured(): boolean;
  createCheckoutSession(input: CheckoutInput): Promise<{ url: string }>;
  createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  /** Verifies the signature and returns a normalized event. Throws on invalid signatures. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
}
