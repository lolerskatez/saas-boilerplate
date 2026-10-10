import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/dashboard/page-header";
import { UsageCard } from "@/components/dashboard/usage-card";
import { BillingPlans } from "@/components/settings/billing-plans";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paymentProcessor } from "@/lib/billing";
import { getOrgSubscription, getOrgUsage } from "@/lib/billing/entitlements";
import { PLANS, resolvePlanId } from "@/lib/billing/plans";
import { can } from "@/lib/auth/permissions";
import { getOrgContext } from "@/lib/auth/session";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ slug }, { checkout }] = await Promise.all([params, searchParams]);
  const ctx = await getOrgContext(slug);
  if (!can(ctx.role, { billing: ["read"] })) notFound();
  const [t, sub, usage] = await Promise.all([
    getTranslations("settings"),
    getOrgSubscription(ctx.organization.id),
    getOrgUsage(ctx.organization.id),
  ]);
  const plan = PLANS[resolvePlanId(sub)];
  return (
    <>
      <PageHeader title={t("billing")} />
      {checkout === "success" ? (
        <Alert>
          <AlertDescription>
            Thanks! Your subscription will be active as soon as the payment is confirmed.
          </AlertDescription>
        </Alert>
      ) : null}
      {paymentProcessor.isConfigured() ? null : (
        <Alert>
          <AlertDescription>
            Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs to enable checkout.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardDescription>{t("currentPlan")}</CardDescription>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {plan.name}
            {sub ? <Badge variant="secondary">{sub.status}</Badge> : null}
            {sub?.cancelAtPeriodEnd ? <Badge variant="destructive">cancels at period end</Badge> : null}
          </CardTitle>
          {sub?.currentPeriodEnd ? (
            <CardDescription>Current period ends {sub.currentPeriodEnd.toLocaleDateString()}</CardDescription>
          ) : null}
        </CardHeader>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UsageCard label="Members" used={usage.members} limit={plan.limits.members} />
        <UsageCard label="Projects" used={usage.projects} limit={plan.limits.projects} />
        <UsageCard label="API keys" used={usage.apiKeys} limit={plan.limits.apiKeys} />
        <UsageCard label="Storage" used={usage.storageMb} limit={plan.limits.storageMb} unit="MB" />
      </div>
      <BillingPlans
        slug={slug}
        currentPlan={plan.id}
        canManage={can(ctx.role, { billing: ["manage"] })}
        hasCustomer={!!sub?.customerId}
      />
    </>
  );
}
