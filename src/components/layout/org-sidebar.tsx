"use client";

import { CreditCard, FileClock, FolderKanban, Home, KeyRound, Paperclip, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export function OrgSidebarNav({ slug, canSeeAdminSettings }: { slug: string; canSeeAdminSettings: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const base = `/dashboard/${slug}`;
  const main = [
    { href: base, label: t("dashboard.overview"), icon: Home, exact: true },
    { href: `${base}/projects`, label: t("dashboard.projects"), icon: FolderKanban },
    { href: `${base}/files`, label: t("dashboard.files"), icon: Paperclip },
  ];
  const settings = [
    { href: `${base}/settings`, label: t("settings.general"), icon: Settings, exact: true },
    { href: `${base}/settings/members`, label: t("settings.members"), icon: Users },
    ...(canSeeAdminSettings
      ? [
          { href: `${base}/settings/billing`, label: t("settings.billing"), icon: CreditCard },
          { href: `${base}/settings/api-keys`, label: t("settings.apiKeys"), icon: KeyRound },
          { href: `${base}/settings/audit-log`, label: t("settings.auditLog"), icon: FileClock },
        ]
      : []),
  ];
  const render = (items: typeof main) =>
    items.map(({ href, label, icon: Icon, exact }) => {
      const active = exact ? pathname === href : pathname.startsWith(href);
      return (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            active
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <Icon className="size-4" /> {label}
        </Link>
      );
    });
  return (
    <nav className="space-y-6">
      <div className="space-y-1">{render(main)}</div>
      <div className="space-y-1">
        <div className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase">{t("common.settings")}</div>
        {render(settings)}
      </div>
    </nav>
  );
}
