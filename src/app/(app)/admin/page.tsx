import { getTranslations } from "next-intl/server";

import { SignupsChart } from "@/components/admin/signups-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats } from "@/lib/admin";

export const metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  const [t, stats] = await Promise.all([getTranslations("admin"), getAdminStats()]);
  const cards = [
    { label: t("users"), value: stats.users.toLocaleString(), hint: `+${stats.newUsers} in the last 30 days` },
    {
      label: t("organizations"),
      value: stats.organizations.toLocaleString(),
      hint: `${stats.paidOrganizations} paying`,
    },
    {
      label: "MRR",
      value: `$${stats.mrr.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      hint: "Estimated from active subscriptions",
    },
    {
      label: "ARR",
      value: `$${(stats.mrr * 12).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      hint: "MRR × 12",
    },
  ];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-3xl">{c.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{c.hint}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("signups")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupsChart data={stats.series} />
        </CardContent>
      </Card>
    </>
  );
}
