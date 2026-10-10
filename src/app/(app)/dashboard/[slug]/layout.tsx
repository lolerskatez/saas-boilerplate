import { Layers } from "lucide-react";
import Link from "next/link";

import { OrgSidebarNav } from "@/components/layout/org-sidebar";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { TopBar } from "@/components/layout/top-bar";
import { can } from "@/lib/auth/permissions";
import { getOrgContext, listUserOrganizations } from "@/lib/auth/session";
import { env } from "@/lib/env";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  const orgs = await listUserOrganizations(ctx.user.id);
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-muted/30 p-4 md:flex">
        <Link href="/" className="flex items-center gap-2 px-2 font-semibold">
          <Layers className="size-5" /> {env.NEXT_PUBLIC_APP_NAME}
        </Link>
        <OrgSwitcher current={ctx.organization} organizations={orgs} />
        <OrgSidebarNav slug={slug} canSeeAdminSettings={can(ctx.role, { auditLog: ["read"] })} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar session={ctx.session} left={<span className="font-medium md:hidden">{ctx.organization.name}</span>} />
        <main className="flex-1 space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}
