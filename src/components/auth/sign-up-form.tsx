"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth/client";

import { SocialButtons } from "./social-buttons";

export function SignUpForm({
  providers,
  redirectTo,
  requireVerification,
  defaultEmail,
}: {
  providers: string[];
  redirectTo: string;
  requireVerification: boolean;
  defaultEmail?: string;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    setLoading(true);
    const { error } = await signUp.email({
      name: String(form.get("name")),
      email,
      password: String(form.get("password")),
      callbackURL: redirectTo,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Sign up failed");
      return;
    }
    if (requireVerification) {
      setSentTo(email);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  if (sentTo) {
    return (
      <Alert>
        <AlertTitle>{t("checkEmail")}</AlertTitle>
        <AlertDescription>{t("verificationSent", { email: sentTo })}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {t("signUpTitle")}
        </Button>
      </form>
      <SocialButtons providers={providers} callbackURL={redirectTo} />
    </div>
  );
}
