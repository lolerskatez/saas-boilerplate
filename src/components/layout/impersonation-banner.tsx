"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function ImpersonationBanner({ name }: { name: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm text-black">
      {t("impersonating", { name })}
      <Button
        size="xs"
        variant="outline"
        onClick={async () => {
          await authClient.admin.stopImpersonating();
          router.push("/admin/users");
          router.refresh();
        }}
      >
        {t("stopImpersonating")}
      </Button>
    </div>
  );
}
