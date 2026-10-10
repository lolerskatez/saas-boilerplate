<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- **Tenant data:** every tenant-scoped table has `organization_id` and RLS (`drizzle/0001_rls.sql`). Always query
  through `withTenant(orgId, tx => ...)`; use `withSystem` only for trusted cross-tenant code. New tenant tables
  need an RLS migration — see README "Tenant isolation".
- **Authorization:** pages call `getOrgContext(slug)`; mutations call `requireOrgPermission(slug, { resource: [actions] })`.
  Permissions live in `src/lib/auth/permissions.ts`.
- **Mutations:** server actions in `src/lib/actions/*` wrap logic in `runAction()`, call `assertWithinLimit()` for
  plan-limited resources, and `recordAudit(..., tx)` inside the same transaction.
- **Schema:** edit `src/lib/db/schema/app.ts`, then `npm run db:generate`. Never hand-edit `schema/auth.ts`;
  regenerate it with `npm run auth:generate` after changing Better Auth plugins.
- **Env:** add variables to `src/lib/env.ts` and `.env.example`.
- **i18n:** add keys to all files in `messages/` (en is the source of truth for types).
- **Checks before committing:** `npm run lint && npm run typecheck && npm run format:check && npm run test`.
  Commits follow Conventional Commits.
