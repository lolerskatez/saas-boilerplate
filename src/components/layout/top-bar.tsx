import type { ReactNode } from "react";

import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { Session } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";

export async function TopBar({ session, left }: { session: Session; left?: ReactNode }) {
  const notifications = await listNotifications(session.user.id, 10);
  return (
    <>
      {session.session.impersonatedBy ? <ImpersonationBanner name={session.user.name} /> : null}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
        <div className="flex flex-1 items-center gap-2">{left}</div>
        <LocaleSwitcher />
        <ThemeToggle />
        <NotificationBell items={notifications} />
        <UserMenu user={session.user} />
      </header>
    </>
  );
}
