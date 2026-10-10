import Link from "next/link";

import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen">
      <TopBar
        session={session}
        left={
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        }
      />
      <main className="container mx-auto max-w-3xl space-y-6 p-6">{children}</main>
    </div>
  );
}
