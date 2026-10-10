"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";

export function UserActions({
  userId,
  banned,
  role,
  isSelf,
}: {
  userId: string;
  banned: boolean;
  role: string | null;
  isSelf: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();

  async function run(fn: () => Promise<{ error: { message?: string } | null }>, after?: string) {
    const { error } = await fn();
    if (error) return toast.error(error.message ?? "Action failed");
    if (after) router.push(after);
    router.refresh();
  }

  if (isSelf) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="User actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run(() => authClient.admin.impersonateUser({ userId }), "/dashboard")}>
          {t("impersonate")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => run(() => authClient.admin.setRole({ userId, role: role === "admin" ? "user" : "admin" }))}
        >
          {role === "admin" ? "Remove super-admin" : "Make super-admin"}
        </DropdownMenuItem>
        {banned ? (
          <DropdownMenuItem onClick={() => run(() => authClient.admin.unbanUser({ userId }))}>
            {t("unban")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => run(() => authClient.admin.banUser({ userId, banReason: "Banned by admin" }))}
          >
            {t("ban")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
