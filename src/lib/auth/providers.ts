import { env } from "@/lib/env";

export function enabledSocialProviders() {
  return [
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? "github" : null,
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? "google" : null,
  ].filter((p): p is string => p !== null);
}

/** Only allow same-origin relative redirects to prevent open-redirects. */
export function safeRedirect(value: string | string[] | undefined, fallback = "/dashboard") {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}
