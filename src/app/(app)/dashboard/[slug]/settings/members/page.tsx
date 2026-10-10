import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/dashboard/page-header";
import { InviteMemberDialog } from "@/components/settings/invite-member-dialog";
import { MembersTable } from "@/components/settings/members-table";
import { can } from "@/lib/auth/permissions";
import { getOrgContext } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { invitation, member, user } from "@/lib/db/schema";

export const metadata = { title: "Members" };

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  const orgId = ctx.organization.id;
  const [t, members, invites] = await Promise.all([
    getTranslations("settings"),
    db
      .select({
        id: member.id,
        role: member.role,
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, orgId))
      .orderBy(member.createdAt),
    db
      .select({ id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt })
      .from(invitation)
      .where(and(eq(invitation.organizationId, orgId), eq(invitation.status, "pending"))),
  ]);
  const canManage = can(ctx.role, { member: ["update"] });
  return (
    <>
      <PageHeader
        title={t("members")}
        actions={
          can(ctx.role, { invitation: ["create"] }) ? (
            <InviteMemberDialog organizationId={orgId} isOwner={ctx.role.includes("owner")} />
          ) : null
        }
      />
      <MembersTable
        organizationId={orgId}
        currentUserId={ctx.user.id}
        canManage={canManage}
        isOwner={ctx.role.includes("owner")}
        members={members}
        invitations={invites}
      />
    </>
  );
}
