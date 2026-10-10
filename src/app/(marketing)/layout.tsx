import { getTranslations } from "next-intl/server";

import { SiteHeader } from "@/components/marketing/site-header";
import { env } from "@/lib/env";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("landing");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {env.NEXT_PUBLIC_APP_NAME}. {t("footer")}
      </footer>
    </div>
  );
}
