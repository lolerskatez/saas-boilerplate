import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/dashboard/page-header";
import { DeleteOrganizationCard } from "@/components/settings/delete-organization-card";
import { OrganizationForm } from "@/components/settings/organization-form";
import { can } from "@/lib/auth/permissions";
import { getOrgContext } from "@/lib/auth/session";

export const metadata = { title: "Organization settings" };

export default async function OrgSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  const t = await getTranslations("settings");
  return (
    <>
      <PageHeader title={t("general")} />
      <OrganizationForm organization={ctx.organization} canEdit={can(ctx.role, { organization: ["update"] })} />
      {can(ctx.role, { organization: ["delete"] }) ? <DeleteOrganizationCard organization={ctx.organization} /> : null}
    </>
  );
}
