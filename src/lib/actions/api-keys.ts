"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { API_KEY_SCOPES, generateApiKey } from "@/lib/api-keys";
import { recordAudit } from "@/lib/audit";
import { requireOrgPermission } from "@/lib/auth/session";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { apiKey } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

import { ActionError, runAction } from "./safe-action";

const input = z.object({
  name: z.string().trim().min(1).max(64),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1),
  expiresInDays: z.number().int().positive().max(3650).nullable().optional(),
});

/** Returns the plaintext key exactly once; only its SHA-256 hash is stored. */
export async function createApiKey(slug: string, values: z.input<typeof input>) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { apiKey: ["create"] });
    const data = input.parse(values);
    await assertWithinLimit(ctx.organization.id, "apiKeys");
    const { key, prefix, hashedKey } = generateApiKey();
    const expiresAt = data.expiresInDays ? new Date(Date.now() + data.expiresInDays * 86_400_000) : null;
    await withTenant(ctx.organization.id, async (tx) => {
      const [row] = await tx
        .insert(apiKey)
        .values({
          organizationId: ctx.organization.id,
          name: data.name,
          prefix,
          hashedKey,
          scopes: data.scopes,
          expiresAt,
          createdById: ctx.user.id,
        })
        .returning({ id: apiKey.id });
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "api_key.created",
          entityType: "api_key",
          entityId: row!.id,
          after: { name: data.name, scopes: data.scopes, prefix },
        },
        tx,
      );
    });
    revalidatePath(`/dashboard/${slug}/settings/api-keys`);
    return { key };
  });
}

export async function revokeApiKey(slug: string, id: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { apiKey: ["revoke"] });
    await withTenant(ctx.organization.id, async (tx) => {
      const [row] = await tx
        .update(apiKey)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKey.id, id), isNull(apiKey.revokedAt)))
        .returning({ name: apiKey.name });
      if (!row) throw new ActionError("API key not found");
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "api_key.revoked",
          entityType: "api_key",
          entityId: id,
          before: { name: row.name },
        },
        tx,
      );
    });
    revalidatePath(`/dashboard/${slug}/settings/api-keys`);
  });
}
