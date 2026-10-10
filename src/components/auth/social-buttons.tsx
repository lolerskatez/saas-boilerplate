"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/client";

export function SocialButtons({ providers, callbackURL }: { providers: string[]; callbackURL: string }) {
  const t = useTranslations("auth");
  if (providers.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="relative text-center text-xs text-muted-foreground uppercase">
        <span className="relative z-10 bg-card px-2">{t("orContinueWith")}</span>
        <div className="absolute inset-x-0 top-1/2 border-t" />
      </div>
      <div className="grid gap-2">
        {providers.map((p) => (
          <Button key={p} variant="outline" type="button" onClick={() => signIn.social({ provider: p, callbackURL })}>
            {p === "github" ? "GitHub" : p === "google" ? "Google" : p}
          </Button>
        ))}
      </div>
    </div>
  );
}
