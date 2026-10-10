import { desc } from "drizzle-orm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/dashboard/page-header";
import { UsageCard } from "@/components/dashboard/usage-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrgContext } from "@/lib/auth/session";
import { getOrgPlan, getOrgUsage } from "@/lib/billing/entitlements";
import { auditLog } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

export default async function OrgOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  const [t, plan, usage, activity] = await Promise.all([
    getTranslations("dashboard"),
    getOrgPlan(ctx.organization.id),
    getOrgUsage(ctx.organization.id),
    withTenant(ctx.organization.id, (tx) => tx.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(8)),
  ]);
  return (
    <>
      <PageHeader
        title={t("welcome", { name: ctx.user.name.split(" ")[0] ?? ctx.user.name })}
        description={ctx.organization.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {t("plan")}: {plan.name}
            </Badge>
            <Button asChild size="sm">
              <Link href={`/dashboard/${slug}/projects`}>{t("newProject")}</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UsageCard label={t("members")} used={usage.members} limit={plan.limits.members} />
        <UsageCard label={t("projects")} used={usage.projects} limit={plan.limits.projects} />
        <UsageCard label={t("apiKeys")} used={usage.apiKeys} limit={plan.limits.apiKeys} />
        <UsageCard label={t("storage")} used={usage.storageMb} limit={plan.limits.storageMb} unit="MB" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{a.actorLabel ?? a.actorType}</span>{" "}
                    <code className="text-muted-foreground">{a.action}</code>
                  </span>
                  <span className="text-xs text-muted-foreground">{a.createdAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
