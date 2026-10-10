import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { enabledSocialProviders, safeRedirect } from "@/lib/auth/providers";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [t, params] = await Promise.all([getTranslations("auth"), searchParams]);
  const redirectTo = safeRedirect(params.redirectTo);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("signInTitle")}</CardTitle>
        <CardDescription>{t("signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm providers={enabledSocialProviders()} redirectTo={redirectTo} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("noAccount")}&nbsp;
        <Link href={`/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-foreground underline">
          {t("signUpTitle")}
        </Link>
      </CardFooter>
    </Card>
  );
}
