import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { apiKey, member } from "@/lib/db/schema";
import { withSystem } from "@/lib/db/tenant";

import type { ApiKeyScope } from "./api-key-scopes";

export { API_KEY_SCOPES, type ApiKeyScope } from "./api-key-scopes";

const KEY_PREFIX = "sk_live_";
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateApiKey() {
  const bytes = randomBytes(32);
  let secret = "";
  for (const b of bytes) secret += ALPHABET[b % ALPHABET.length];
  const key = `${KEY_PREFIX}${secret}`;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 4), hashedKey: hashApiKey(key) };
}

/** Keys have 190 bits of entropy, so a fast hash is appropriate (no need for bcrypt/argon2). */
export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export interface ApiKeyPrincipal {
  id: string;
  name: string;
  organizationId: string;
  scopes: string[];
}

/**
 * Resolves a bearer API key to its organization. Returns null if missing, revoked, expired, or
 * if its creator is no longer a member of the organization.
 */
export async function verifyApiKey(key: string | null | undefined): Promise<ApiKeyPrincipal | null> {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;
  const hashed = hashApiKey(key);
  return withSystem(async (tx) => {
    const [found] = await tx
      .select({ key: apiKey })
      .from(apiKey)
      .innerJoin(member, and(eq(member.userId, apiKey.createdById), eq(member.organizationId, apiKey.organizationId)))
      .where(and(eq(apiKey.hashedKey, hashed), isNull(apiKey.revokedAt)))
      .limit(1);
    const row = found?.key;
    if (!row || !safeEqualHex(row.hashedKey, hashed)) return null;
    if (row.expiresAt && row.expiresAt < new Date()) return null;
    await tx.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, row.id));
    return { id: row.id, name: row.name, organizationId: row.organizationId, scopes: row.scopes };
  });
}

export function hasScope(principal: ApiKeyPrincipal, scope: ApiKeyScope) {
  return principal.scopes.includes(scope);
}
