import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();
  const t = await getTranslations("admin");
  return (
    <div className="min-h-screen">
      <TopBar
        session={session}
        left={
          <nav className="flex items-center gap-1">
            <span className="mr-3 font-semibold">{t("title")}</span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Overview</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/users">{t("users")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/organizations">{t("organizations")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">← App</Link>
            </Button>
          </nav>
        }
      />
      <main className="container mx-auto space-y-6 p-6">{children}</main>
    </div>
  );
}
