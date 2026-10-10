import { betterAuth } from "better-auth";
import { and, eq, isNull } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, organization, twoFactor } from "better-auth/plugins";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { enqueue } from "@/lib/jobs";

import { ac, roles } from "./permissions";

const socialProviders = {
  ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
    : {}),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {}),
};

function isAdminEmail(user: { email: string; emailVerified?: boolean | null }) {
  return !!user.emailVerified && env.ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// Lazily imported to avoid an import cycle (these modules depend on the db schema / auth types).
const audit = () => import("@/lib/audit");
const entitlements = () => import("@/lib/billing/entitlements");
const notifications = () => import("@/lib/notifications");

export const auth = betterAuth({
  appName: env.NEXT_PUBLIC_APP_NAME,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await enqueue("email.send", { to: user.email, template: "reset-password", props: { name: user.name, url } });
    },
  },
  emailVerification: {
    sendOnSignUp: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await enqueue("email.send", { to: user.email, template: "verify-email", props: { name: user.name, url } });
    },
  },
  socialProviders,
  account: { accountLinking: { enabled: true, trustedProviders: ["github", "google"] } },
  session: { cookieCache: { enabled: true, maxAge: 60 } },
  rateLimit: { enabled: env.NODE_ENV === "production", window: 60, max: 100 },
  databaseHooks: {
    user: {
      create: {
        // ADMIN_EMAILS become super-admins, but only once the address is verified (e.g. via OAuth).
        before: async (user) => ({ data: { ...user, role: isAdminEmail(user) ? "admin" : "user" } }),
      },
      update: {
        after: async (user) => {
          if (isAdminEmail(user) && (user as { role?: string | null }).role !== "admin") {
            await db.update(schema.user).set({ role: "admin" }).where(eq(schema.user.id, user.id));
          }
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      cancelPendingInvitationsOnReInvite: true,
      membershipLimit: async (_user, org) => {
        const { getOrgPlan } = await entitlements();
        const limit = (await getOrgPlan(org.id)).limits.members;
        return Number.isFinite(limit) ? limit : Number.MAX_SAFE_INTEGER;
      },
      sendInvitationEmail: async ({ id, email, role, organization: org, inviter }) => {
        await enqueue("email.send", {
          to: email,
          template: "invitation",
          props: {
            inviterName: inviter.user.name,
            organizationName: org.name,
            role,
            url: `${env.NEXT_PUBLIC_APP_URL}/accept-invitation/${id}`,
          },
        });
        const { notifyUserByEmail } = await notifications();
        await notifyUserByEmail(email, {
          type: "invitation",
          title: `Invitation to ${org.name}`,
          body: `${inviter.user.name} invited you to join ${org.name} as ${role}.`,
          link: `/accept-invitation/${id}`,
        });
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization: org, user }) => {
          const { recordAudit } = await audit();
          await recordAudit({
            organizationId: org.id,
            actor: { type: "user", id: user.id },
            action: "organization.created",
            entityType: "organization",
            entityId: org.id,
            after: { name: org.name, slug: org.slug },
          });
        },
        afterUpdateOrganization: async ({ organization: org, user }) => {
          if (!org) return;
          const { recordAudit } = await audit();
          await recordAudit({
            organizationId: org.id,
            actor: { type: "user", id: user.id },
            action: "organization.updated",
            entityType: "organization",
            entityId: org.id,
            after: { name: org.name, slug: org.slug, logo: org.logo },
          });
        },
        afterAddMember: async ({ member, user, organization: org }) => {
          const { recordAudit } = await audit();
          await recordAudit({
            organizationId: org.id,
            actor: { type: "system" },
            action: "member.added",
            entityType: "member",
            entityId: member.id,
            after: { email: user.email, role: member.role },
          });
        },
        afterRemoveMember: async ({ member, user, organization: org }) => {
          const { withTenant } = await import("@/lib/db/tenant");
          await withTenant(org.id, (tx) =>
            tx
              .update(schema.apiKey)
              .set({ revokedAt: new Date() })
              .where(and(eq(schema.apiKey.createdById, user.id), isNull(schema.apiKey.revokedAt))),
          );
          const { recordAudit } = await audit();
          await recordAudit({
            organizationId: org.id,
            actor: { type: "system" },
            action: "member.removed",
            entityType: "member",
            entityId: member.id,
            before: { email: user.email, role: member.role },
          });
        },
        afterUpdateMemberRole: async ({ member, previousRole, user, organization: org }) => {
          const { recordAudit } = await audit();
          await recordAudit({
            organizationId: org.id,
            actor: { type: "system" },
            action: "member.role_changed",
            entityType: "member",
            entityId: member.id,
            before: { email: user.email, role: previousRole },
            after: { email: user.email, role: member.role },
          });
          const { notify } = await notifications();
          await notify({
            userId: user.id,
            organizationId: org.id,
            type: "member",
            title: "Your role changed",
            body: `You are now ${member.role} in ${org.name}.`,
            link: `/dashboard/${org.slug}`,
          });
        },
        afterCreateInvitation: async ({ invitation, inviter, organization: org }) => {
          const { recordAudit } = await audit();
          await recordAudit({
            organizationId: org.id,
            actor: { type: "user", id: inviter.id },
            action: "invitation.created",
            entityType: "invitation",
            entityId: invitation.id,
            after: { email: invitation.email, role: invitation.role },
          });
        },
        afterAcceptInvitation: async ({ member, user, organization: org }) => {
          const { notifyOrgAdmins } = await notifications();
          await notifyOrgAdmins(
            org.id,
            {
              type: "member",
              title: "New member",
              body: `${user.name} joined ${org.name}.`,
              link: `/dashboard/${org.slug}/settings/members`,
            },
            { excludeUserId: member.userId },
          );
        },
      },
    }),
    admin({ defaultRole: "user", adminRoles: ["admin"], impersonationSessionDuration: 60 * 60 }),
    twoFactor({ issuer: env.NEXT_PUBLIC_APP_NAME }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
