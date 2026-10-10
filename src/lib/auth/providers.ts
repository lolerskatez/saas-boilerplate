import { env } from "@/lib/env";

export function enabledSocialProviders() {
  return [
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? "github" : null,
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? "google" : null,
  ].filter((p): p is string => p !== null);
}

/** Only allow same-origin relative paths to prevent open redirects (`//x`, `/\\x`, control chars). */
export function safeRedirect(value: string | string[] | undefined, fallback = "/dashboard") {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(v)) return fallback;
  const base = "http://localhost";
  try {
    const url = new URL(v, base);
    return url.origin === base && !v.startsWith("//") ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}
