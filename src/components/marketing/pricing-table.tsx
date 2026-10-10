"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLAN_LIST, type BillingInterval } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export function PricingTable({
  ctaHref = () => "/sign-up",
  ctaLabel,
  currentPlan,
  onSelect,
}: {
  ctaHref?: (planId: string, interval: BillingInterval) => string;
  ctaLabel?: string;
  currentPlan?: string;
  onSelect?: (planId: string, interval: BillingInterval) => void;
}) {
  const t = useTranslations("landing");
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <Tabs value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
          <TabsList>
            <TabsTrigger value="monthly">{t("monthly")}</TabsTrigger>
            <TabsTrigger value="yearly">{t("yearly")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <Card key={plan.id} className={cn("flex flex-col", plan.highlighted && "border-primary shadow-lg")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.highlighted ? <Badge>Popular</Badge> : null}
                  {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="text-4xl font-bold">
                  ${plan.price[interval]}
                  <span className="text-base font-normal text-muted-foreground">
                    {interval === "monthly" ? t("perMonth") : t("perYear")}
                  </span>
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {onSelect ? (
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    disabled={isCurrent || plan.id === "free"}
                    onClick={() => onSelect(plan.id, interval)}
                  >
                    {isCurrent ? "Current plan" : (ctaLabel ?? t("cta"))}
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                    <Link href={ctaHref(plan.id, interval)}>{ctaLabel ?? t("cta")}</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
