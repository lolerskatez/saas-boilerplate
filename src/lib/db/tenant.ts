import { sql } from "drizzle-orm";

import { db, systemDb, type Transaction } from "./index";

/**
 * Runs `fn` in a transaction scoped to a single organization.
 *
 * Tenant tables have Postgres Row-Level Security policies that only expose rows whose
 * `organization_id` matches `app.current_org_id`. Queries made through `tx` therefore can
 * never read or write another tenant's data, even if a `where` clause is forgotten.
 */
export async function withTenant<T>(organizationId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  if (!organizationId) throw new Error("withTenant: organizationId is required");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${organizationId}, true)`);
    return fn(tx);
  });
}

/**
 * Runs `fn` with RLS bypassed, on the `DATABASE_SYSTEM_URL` connection (a BYPASSRLS role).
 * Only for trusted code paths that legitimately span tenants: API key lookup and background jobs.
 */
export async function withSystem<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return systemDb.transaction(fn);
}
