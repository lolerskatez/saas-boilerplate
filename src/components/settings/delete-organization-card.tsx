"use client";

import { useTranslations } from "next-intl";

import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";

export function DeleteOrganizationCard({ organization }: { organization: { id: string; name: string } }) {
  const t = useTranslations("settings");
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle>{t("dangerZone")}</CardTitle>
        <CardDescription>Deleting an organization removes all of its data. This cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmButton
          trigger={<Button variant="destructive">{t("deleteOrg")}</Button>}
          title={`Delete ${organization.name}?`}
          description="All projects, files, API keys and audit logs will be permanently deleted."
          confirmLabel="Delete organization"
          redirectTo="/dashboard"
          action={() => authClient.organization.delete({ organizationId: organization.id })}
        />
      </CardContent>
    </Card>
  );
}
