import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/dashboard/page-header";
import { ChangePasswordForm, ProfileForm } from "@/components/account/profile-forms";
import { SessionsCard } from "@/components/account/sessions-card";
import { TwoFactorCard } from "@/components/account/two-factor-card";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth/session";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await requireSession();
  const [t, sessions] = await Promise.all([
    getTranslations("settings"),
    auth.api.listSessions({ headers: await headers() }),
  ]);
  return (
    <>
      <PageHeader title={t("profile")} description={session.user.email} />
      <ProfileForm name={session.user.name} image={session.user.image ?? null} />
      <ChangePasswordForm />
      <TwoFactorCard enabled={!!session.user.twoFactorEnabled} />
      <SessionsCard
        currentToken={session.session.token}
        sessions={sessions.map((s) => ({
          id: s.id,
          token: s.token,
          userAgent: s.userAgent ?? null,
          ipAddress: s.ipAddress ?? null,
          createdAt: s.createdAt,
        }))}
      />
    </>
  );
}
