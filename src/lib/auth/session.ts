import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";

import { auth } from "./index";
import { can, type PermissionRequest } from "./permissions";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") notFound();
  return session;
}

export const listUserOrganizations = cache(async (userId: string) =>
  db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(organization.name),
);

/**
 * Resolves the organization from the URL slug and verifies the current user is a member.
 * Every `/dashboard/[slug]` page and server action goes through this.
 */
export const getOrgContext = cache(async (slug: string) => {
  const session = await requireSession();
  const [row] = await db
    .select({ org: organization, memberId: member.id, role: member.role })
    .from(organization)
    .innerJoin(member, and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)))
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!row) notFound();
  return { session, user: session.user, organization: row.org, memberId: row.memberId, role: row.role };
});

export type OrgContext = Awaited<ReturnType<typeof getOrgContext>>;

export async function requireOrgPermission(slug: string, request: PermissionRequest) {
  const ctx = await getOrgContext(slug);
  if (!can(ctx.role, request)) throw new Error("You don't have permission to perform this action.");
  return ctx;
}
