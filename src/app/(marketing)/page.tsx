import {
  Bell,
  Building2,
  CreditCard,
  Database,
  FileClock,
  KeyRound,
  Languages,
  ShieldCheck,
  Timer,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PricingTable } from "@/components/marketing/pricing-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Building2,
    title: "Multi-tenant organizations",
    body: "Users create or join many organizations; every resource is scoped to one.",
  },
  {
    icon: Database,
    title: "Postgres Row-Level Security",
    body: "Tenant isolation is enforced by the database, not just by WHERE clauses.",
  },
  {
    icon: Users,
    title: "Roles & invitations",
    body: "Owner, admin and member roles with fine-grained permissions and email invites.",
  },
  {
    icon: ShieldCheck,
    title: "Self-hosted auth",
    body: "Email/password, verification, password reset, OAuth and TOTP two-factor via Better Auth.",
  },
  {
    icon: CreditCard,
    title: "Per-organization billing",
    body: "Stripe checkout, customer portal and idempotent webhooks behind a provider abstraction.",
  },
  {
    icon: KeyRound,
    title: "API keys & REST API",
    body: "Hashed, scoped, revocable org API keys powering a versioned /api/v1.",
  },
  {
    icon: FileClock,
    title: "Audit log",
    body: "Field-level change history for every important action in an organization.",
  },
  {
    icon: Bell,
    title: "Notifications",
    body: "In-app notifications for invitations, role changes and billing events.",
  },
  { icon: Timer, title: "Background jobs & cron", body: "pg-boss queues with retries — no Redis required." },
  {
    icon: Upload,
    title: "File uploads",
    body: "Presigned S3 uploads (AWS, R2, RustFS/MinIO) with per-plan storage limits.",
  },
  { icon: UserCog, title: "Super-admin panel", body: "Users, organizations, revenue metrics, bans and impersonation." },
  {
    icon: Languages,
    title: "i18n & dark mode",
    body: "next-intl translations and system-aware theming out of the box.",
  },
];

export default async function LandingPage() {
  const t = await getTranslations("landing");
  return (
    <>
      <section className="container mx-auto flex flex-col items-center gap-6 px-4 py-24 text-center md:py-32">
        <Badge variant="secondary">{t("badge")}</Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">{t("cta")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#features">{t("secondaryCta")}</Link>
          </Button>
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">{t("featuresTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="mb-2 size-6 text-primary" />
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="container mx-auto px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">{t("pricingTitle")}</h2>
        <PricingTable />
      </section>
    </>
  );
}
