"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";

type S = { id: string; token: string; userAgent: string | null; ipAddress: string | null; createdAt: Date };

export function SessionsCard({ sessions, currentToken }: { sessions: S[]; currentToken: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sessions")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">{s.userAgent ?? "Unknown device"}</div>
                <div className="text-xs text-muted-foreground">
                  {s.ipAddress ?? "Unknown IP"} · {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
              {s.token === currentToken ? (
                <Badge variant="secondary">This device</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const { error } = await authClient.revokeSession({ token: s.token });
                    if (error) return toast.error(error.message ?? "Failed");
                    router.refresh();
                  }}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
