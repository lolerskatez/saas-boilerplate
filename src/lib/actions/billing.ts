"use server";

import * as z from "zod";

import { paymentProcessor } from "@/lib/billing";
import { getOrgSubscription } from "@/lib/billing/entitlements";
import { requireOrgPermission } from "@/lib/auth/session";
import { env } from "@/lib/env";

import { ActionError, runAction } from "./safe-action";

const checkoutInput = z.object({ plan: z.enum(["pro", "business"]), interval: z.enum(["monthly", "yearly"]) });

export async function createCheckout(slug: string, values: z.input<typeof checkoutInput>) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { billing: ["manage"] });
    if (!paymentProcessor.isConfigured()) throw new ActionError("Billing is not configured. Set STRIPE_SECRET_KEY.");
    const { plan, interval } = checkoutInput.parse(values);
    const sub = await getOrgSubscription(ctx.organization.id);
    const base = `${env.NEXT_PUBLIC_APP_URL}/dashboard/${slug}/settings/billing`;
    if (sub?.customerId && sub.status !== "canceled") {
      return paymentProcessor.createPortalSession({ customerId: sub.customerId, returnUrl: base });
    }
    return paymentProcessor.createCheckoutSession({
      organizationId: ctx.organization.id,
      organizationName: ctx.organization.name,
      customerEmail: ctx.user.email,
      plan,
      interval,
      successUrl: `${base}?checkout=success`,
      cancelUrl: `${base}?checkout=canceled`,
    });
  });
}

export async function openBillingPortal(slug: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { billing: ["manage"] });
    const sub = await getOrgSubscription(ctx.organization.id);
    if (!sub?.customerId) throw new ActionError("No billing account yet. Choose a plan first.");
    return paymentProcessor.createPortalSession({
      customerId: sub.customerId,
      returnUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/${slug}/settings/billing`,
    });
  });
}
