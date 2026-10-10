import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

const optional = z.string().min(1).optional();

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    ADMIN_EMAILS: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
    AUTH_REQUIRE_EMAIL_VERIFICATION: z.stringbool().default(true),
    GITHUB_CLIENT_ID: optional,
    GITHUB_CLIENT_SECRET: optional,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,

    EMAIL_FROM: z.string().default("SaaS <noreply@example.com>"),
    SMTP_URL: optional,
    RESEND_API_KEY: optional,

    JOBS_MODE: z.enum(["queue", "inline"]).default("queue"),

    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    STRIPE_PRICE_PRO_MONTHLY: optional,
    STRIPE_PRICE_PRO_YEARLY: optional,
    STRIPE_PRICE_BUSINESS_MONTHLY: optional,
    STRIPE_PRICE_BUSINESS_YEARLY: optional,

    S3_ENDPOINT: optional,
    S3_PUBLIC_ENDPOINT: optional,
    S3_REGION: z.string().default("us-east-1"),
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    S3_BUCKET: z.string().default("uploads"),
    S3_FORCE_PATH_STYLE: z.stringbool().default(true),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    SENTRY_DSN: optional,
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_APP_NAME: z.string().default("Acme SaaS"),
    NEXT_PUBLIC_SENTRY_DSN: optional,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: optional,
  },
  shared: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
