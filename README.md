# Ultimate SaaS Boilerplate

A production-ready, **multi-tenant** SaaS starter built on Next.js 16. It combines the best ideas from
[ixartz/SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate),
[apptension/saas-boilerplate](https://github.com/apptension/saas-boilerplate),
[sudharsangs/nextjs-multitenant-saas-boilerplate](https://github.com/sudharsangs/nextjs-multitenant-saas-boilerplate) and
[wasp-lang/open-saas](https://github.com/wasp-lang/open-saas) into a single TypeScript app with no vendor lock-in.

## Features

| Area                 | What you get                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-tenancy**    | Organizations with owner/admin/member roles, email invitations, org switcher, per-org URLs (`/dashboard/[slug]`)                                                                         |
| **Tenant isolation** | Postgres **Row-Level Security** on every tenant table — a forgotten `WHERE organization_id` can't leak data                                                                              |
| **Auth**             | Self-hosted [Better Auth](https://better-auth.com): email/password, email verification, password reset, GitHub/Google OAuth, TOTP 2FA + backup codes, session management                 |
| **RBAC**             | Fine-grained permission statements (`project:create`, `billing:manage`, …) shared by server and client                                                                                   |
| **Billing**          | Per-organization Stripe subscriptions: checkout, customer portal, **idempotent webhooks**, plan limits (members/projects/API keys/storage); provider abstraction for Polar/Lemon Squeezy |
| **Public API**       | Hashed, scoped, expiring, revocable org **API keys** and a versioned REST API at `/api/v1`                                                                                               |
| **Audit log**        | Field-level diffs (`{ field: { from, to } }`) for every important change, written in the same transaction                                                                                |
| **Notifications**    | In-app notifications (invites, role changes, billing events)                                                                                                                             |
| **Background jobs**  | [pg-boss](https://github.com/timgit/pg-boss) queues, retries and cron — Postgres only, no Redis. Inline mode for serverless                                                              |
| **Email**            | React Email templates sent via SMTP (Mailpit locally) or Resend                                                                                                                          |
| **File uploads**     | Presigned S3 uploads (AWS S3, Cloudflare R2, RustFS, MinIO) with per-plan storage limits                                                                                                 |
| **Super-admin**      | Users/orgs tables, MRR/ARR and sign-up charts, ban/unban, promote, **impersonation**                                                                                                     |
| **UX**               | Landing page + pricing, shadcn/ui, dark mode, i18n (en/es/fr) via next-intl                                                                                                              |
| **Quality**          | Strict TypeScript, ESLint, Prettier, Vitest (unit + RLS integration), Playwright E2E, Lefthook, Commitlint, GitHub Actions CI                                                            |
| **Ops**              | Docker Compose dev stack, multi-stage Dockerfile (web + worker), env validation, security headers, structured logging (pino), health check                                               |

## Quick start

Requirements: Node 24+, Docker.

```bash
cp .env.example .env                       # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm install
npm run services:up                        # Postgres, Mailpit (http://localhost:8025), RustFS S3 (http://localhost:9001)
npm run db:migrate
npm run dev                                # http://localhost:3000
npm run worker                             # in a second terminal: background jobs + cron
```

Sign up, verify your email in Mailpit, create an organization and you're in. Add your email to `ADMIN_EMAILS`
to become a super-admin (`/admin`); the role is granted only once that address is verified (email link or
OAuth), so with `AUTH_REQUIRE_EMAIL_VERIFICATION=false` promote the first admin manually:
`UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';`.

Local S3: create the `uploads` bucket in the RustFS console (`rustfsadmin` / `rustfsadmin`) and allow CORS from
`http://localhost:3000`, or point the `S3_*` variables at any S3-compatible provider.

## Scripts

| Script                                     | Description                                                     |
| ------------------------------------------ | --------------------------------------------------------------- |
| `dev` / `build` / `start`                  | Next.js                                                         |
| `worker`                                   | pg-boss worker (queues + cron)                                  |
| `lint` / `typecheck` / `format`            | Code quality                                                    |
| `test`                                     | Vitest unit tests + RLS integration tests (needs a migrated DB) |
| `test:e2e`                                 | Playwright (set `AUTH_REQUIRE_EMAIL_VERIFICATION=false`)        |
| `db:generate` / `db:migrate` / `db:studio` | Drizzle Kit                                                     |
| `auth:generate`                            | Regenerate the Better Auth schema after adding plugins          |
| `email:dev`                                | Preview email templates at http://localhost:3001                |

## Architecture

```
src/
├── app/
│   ├── (marketing)/           landing + pricing
│   ├── (auth)/                sign-in, sign-up, reset, 2FA, accept-invitation
│   ├── (app)/dashboard/[slug] tenant app: overview, projects, files, settings/*
│   ├── (app)/admin            super-admin panel
│   ├── (app)/account          profile, password, 2FA, sessions
│   └── api/                   auth, /v1 REST API, webhooks/[provider], health
├── emails/                    React Email templates
├── i18n/ + messages/          next-intl (cookie-based locale, no URL prefix)
├── lib/
│   ├── auth/                  Better Auth server/client, RBAC, session + org context helpers
│   ├── billing/               plans, entitlements, PaymentProcessor interface, Stripe
│   ├── db/                    Drizzle schema, withTenant()/withSystem()
│   ├── actions/               server actions (all go through requireOrgPermission)
│   ├── api/                   REST API key auth wrapper
│   ├── jobs/                  pg-boss producer, job definitions + handlers
│   ├── audit.ts, notifications.ts, api-keys.ts, storage/, email/
├── proxy.ts                   optimistic auth redirects (Next.js 16 "middleware")
└── worker.ts                  background worker entrypoint
drizzle/                       SQL migrations (0001_rls.sql = RLS policies)
```

### Tenant isolation (RLS)

Tenant tables (`project`, `audit_log`, `api_key`, `file`) have `FORCE ROW LEVEL SECURITY` and a policy that only
exposes rows whose `organization_id` equals the transaction-local setting `app.current_org_id`:

```ts
const projects = await withTenant(org.id, (tx) => tx.select().from(project)); // only this org's rows
```

Queries outside `withTenant` see **no** tenant rows, and inserts into another tenant fail. `withSystem` bypasses
RLS for trusted cross-tenant code (API key lookup, background jobs) by using a separate connection,
`DATABASE_SYSTEM_URL`, as a `BYPASSRLS` role. `DATABASE_URL` must use a role that is **not** a superuser and lacks
`BYPASSRLS`, so tenant-scoped SQL has no way to switch the bypass on (see `docker/postgres/init.sql`).
`tests/integration/rls.test.ts` proves it.

**Adding a tenant-scoped table:** add it to `src/lib/db/schema/app.ts` with an `organizationId` column, run
`npm run db:generate`, then `npx drizzle-kit generate --custom` and enable RLS + the `tenant_isolation` policy
like in `drizzle/0001_rls.sql`. Always access it via `withTenant`.

### Billing

Plans and limits live in `src/lib/billing/plans.ts`. Create matching Stripe prices and set `STRIPE_PRICE_*`.
Point a Stripe webhook at `/api/webhooks/stripe` (locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
with `checkout.session.completed` and `customer.subscription.*` events. Every event id is stored in
`processed_webhook_event` in the same transaction as the subscription update, so retries are safe. Limits are
enforced by `assertWithinLimit()` in actions and the REST API, and by Better Auth's `membershipLimit`.

To add another provider, implement `PaymentProcessor` (`src/lib/billing/processor.ts`) and register it in
`src/lib/billing/index.ts`; webhooks are routed by `/api/webhooks/[provider]`.

### REST API

```bash
curl http://localhost:3000/api/v1/projects -H "Authorization: Bearer sk_live_..."
```

| Method               | Path                   | Scope                              |
| -------------------- | ---------------------- | ---------------------------------- |
| GET                  | `/api/v1/me`           | any                                |
| GET / POST           | `/api/v1/projects`     | `projects:read` / `projects:write` |
| GET / PATCH / DELETE | `/api/v1/projects/:id` | `projects:read` / `projects:write` |

Errors use `{ "error": { "code", "message" } }`; plan limits return `402`.

### Background jobs

Define a job in `src/lib/jobs/definitions.ts`, implement it in `handlers.ts`, then `await enqueue("name", data)`.
`npm run worker` processes queues and cron schedules. On serverless platforms without a worker set `JOBS_MODE=inline`.

## Deployment

- **Docker:** `docker build --target web -t app .` and `docker build --target worker -t app-worker .`. Run
  `npx drizzle-kit migrate` from the worker image before starting.
- **Vercel:** works out of the box with `JOBS_MODE=inline` (or run the worker elsewhere, e.g. Fly/Railway).
- Use a managed Postgres, create a non-superuser app role, and set all variables from `.env.example`.

## License

MIT
