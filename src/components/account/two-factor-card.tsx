"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const { data, error } = enabled
      ? await authClient.twoFactor.disable({ password })
      : await authClient.twoFactor.enable({ password });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Failed");
    setPassword("");
    if (enabled) {
      toast.success("Two-factor authentication disabled");
      router.refresh();
    } else if (data && "totpURI" in data) {
      setSetup({ totpURI: data.totpURI, backupCodes: data.backupCodes });
    }
  }

  async function verify() {
    setLoading(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Invalid code");
    toast.success("Two-factor authentication enabled");
    setSetup(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("twoFactor")} {enabled ? <Badge>On</Badge> : <Badge variant="outline">Off</Badge>}
        </CardTitle>
        <CardDescription>Protect your account with a TOTP authenticator app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {setup ? (
          <div className="space-y-4">
            <div className="w-fit rounded-md bg-white p-3">
              <QRCodeSVG value={setup.totpURI} size={160} />
            </div>
            <div>
              <Label>Backup codes (store them somewhere safe)</Label>
              <pre className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-muted p-3 text-xs">
                {setup.backupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </pre>
            </div>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" />
              <Button onClick={verify} disabled={loading || code.length < 6}>
                Verify
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Confirm your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant={enabled ? "destructive" : "default"} onClick={start} disabled={loading || !password}>
              {enabled ? t("disable2fa") : t("enable2fa")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
