"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { PricingTable } from "@/components/marketing/pricing-table";
import { Button } from "@/components/ui/button";
import { createCheckout, openBillingPortal } from "@/lib/actions/billing";

export function BillingPlans({
  slug,
  currentPlan,
  canManage,
  hasCustomer,
}: {
  slug: string;
  currentPlan: string;
  canManage: boolean;
  hasCustomer: boolean;
}) {
  const t = useTranslations("settings");
  const [loading, setLoading] = useState(false);

  async function go(promise: Promise<{ ok: true; data: { url: string } } | { ok: false; error: string }>) {
    setLoading(true);
    const res = await promise;
    if (!res.ok) {
      setLoading(false);
      return toast.error(res.error);
    }
    window.location.href = res.data.url;
  }

  return (
    <div className="space-y-4">
      {canManage && hasCustomer ? (
        <Button variant="outline" disabled={loading} onClick={() => go(openBillingPortal(slug))}>
          {t("manageBilling")}
        </Button>
      ) : null}
      <PricingTable
        currentPlan={currentPlan}
        ctaLabel={t("upgrade")}
        onSelect={
          canManage && !loading
            ? (plan, interval) => go(createCheckout(slug, { plan: plan as "pro" | "business", interval }))
            : undefined
        }
      />
    </div>
  );
}
