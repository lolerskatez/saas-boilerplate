"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export default function TwoFactorPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [backup, setBackup] = useState(false);
  const [trust, setTrust] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    setLoading(true);
    const { error } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice: trust })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice: trust });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Invalid code");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("twoFactorTitle")}</CardTitle>
        <CardDescription>{t("twoFactorSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            name="code"
            inputMode={backup ? "text" : "numeric"}
            autoComplete="one-time-code"
            placeholder={backup ? "xxxxx-xxxxx" : "123456"}
            required
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Checkbox id="trust" checked={trust} onCheckedChange={(v) => setTrust(v === true)} />
            <Label htmlFor="trust" className="text-sm font-normal">
              Trust this device for 30 days
            </Label>
          </div>
          <Button className="w-full" disabled={loading}>
            {t("verify")}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => setBackup((b) => !b)}>
            {t("useBackupCode")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
