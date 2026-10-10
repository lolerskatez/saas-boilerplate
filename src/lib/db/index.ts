import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool; pgSystemPool?: Pool };

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

/**
 * Separate pool for trusted cross-tenant code, connecting as a role with BYPASSRLS. The tenant
 * role cannot switch into it, so SQL running on `pool` can never escape Row-Level Security.
 */
export const systemPool =
  globalForDb.pgSystemPool ??
  new Pool({
    connectionString: env.DATABASE_SYSTEM_URL,
    max: Number(process.env.DATABASE_SYSTEM_POOL_MAX ?? 5),
  });

if (env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
  globalForDb.pgSystemPool = systemPool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });
export const systemDb = drizzle(systemPool, { schema, casing: "snake_case" });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Transaction;
