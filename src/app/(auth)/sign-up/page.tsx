import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { enabledSocialProviders, safeRedirect } from "@/lib/auth/providers";
import { env } from "@/lib/env";

export const metadata = { title: "Sign up" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [t, params] = await Promise.all([getTranslations("auth"), searchParams]);
  const redirectTo = safeRedirect(params.redirectTo, "/onboarding");
  const email = typeof params.email === "string" ? params.email : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("signUpTitle")}</CardTitle>
        <CardDescription>{t("signUpSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm
          providers={enabledSocialProviders()}
          redirectTo={redirectTo}
          requireVerification={env.AUTH_REQUIRE_EMAIL_VERIFICATION}
          defaultEmail={email}
        />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("haveAccount")}&nbsp;
        <Link href={`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-foreground underline">
          {t("signInTitle")}
        </Link>
      </CardFooter>
    </Card>
  );
}
