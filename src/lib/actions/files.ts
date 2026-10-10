"use server";

import { and, eq, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { recordAudit } from "@/lib/audit";
import { requireOrgPermission } from "@/lib/auth/session";
import { getOrgPlan, getStorageUsageMb, PlanLimitError } from "@/lib/billing/entitlements";
import { isWithinLimit } from "@/lib/billing/plans";
import { file } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import {
  ALLOWED_CONTENT_TYPES,
  buildStorageKey,
  createDownloadUrl,
  createUploadUrl,
  deleteObject,
  headObject,
  MAX_UPLOAD_BYTES,
  PENDING_UPLOAD_TTL_MS,
  storageEnabled,
} from "@/lib/storage";

import { ActionError, runAction } from "./safe-action";

const uploadInput = z.object({
  name: z.string().min(1).max(255),
  contentType: z.string().refine((t) => ALLOWED_CONTENT_TYPES.includes(t), "File type not allowed"),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "File is too large"),
});

/**
 * Step 1 of an upload: validate, enforce storage limits and return a presigned PUT URL.
 * A `pending` row reserves the quota; the browser uploads directly to S3 and then calls
 * `confirmUpload` (or `abortUpload` on failure). The quota check and reservation run under a
 * per-org lock so concurrent requests can't both squeeze under the limit.
 */
export async function requestUpload(slug: string, values: z.input<typeof uploadInput>) {
  return runAction(async () => {
    if (!storageEnabled) throw new ActionError("File storage is not configured.");
    const ctx = await requireOrgPermission(slug, { file: ["upload"] });
    const data = uploadInput.parse(values);
    const orgId = ctx.organization.id;
    const plan = await getOrgPlan(orgId);
    const storageKey = buildStorageKey(orgId, data.name);
    const { row, abandoned } = await withTenant(orgId, async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`storage:${orgId}`}))`);
      // Also reclaim abandoned uploads here, so cleanup works without a worker (JOBS_MODE=inline).
      const abandoned = await tx
        .delete(file)
        .where(and(eq(file.status, "pending"), lt(file.createdAt, new Date(Date.now() - PENDING_UPLOAD_TTL_MS))))
        .returning({ storageKey: file.storageKey });
      const limit = plan.limits.storageMb;
      if (!isWithinLimit(limit, await getStorageUsageMb(tx), data.size / (1024 * 1024))) {
        throw new PlanLimitError("storageMb", limit);
      }
      const [row] = await tx
        .insert(file)
        .values({ ...data, organizationId: orgId, uploadedById: ctx.user.id, storageKey })
        .returning({ id: file.id });
      return { row: row!, abandoned };
    });
    await Promise.all(abandoned.map((f) => deleteObject(f.storageKey).catch(() => undefined)));
    const uploadUrl = await createUploadUrl(storageKey, data.contentType, data.size);
    return { id: row.id, uploadUrl };
  });
}

/** Step 2: verify the object landed in storage with the declared size, then activate it. */
export async function confirmUpload(slug: string, id: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { file: ["upload"] });
    const [pending] = await withTenant(ctx.organization.id, (tx) =>
      tx
        .select()
        .from(file)
        .where(and(eq(file.id, id), eq(file.status, "pending"))),
    );
    if (!pending) throw new ActionError("Upload not found");
    const size = await headObject(pending.storageKey);
    if (size === null || size !== pending.size) {
      await removePending(ctx.organization.id, id, pending.storageKey);
      throw new ActionError("Upload could not be verified. Please try again.");
    }
    await withTenant(ctx.organization.id, async (tx) => {
      const activated = await tx
        .update(file)
        .set({ status: "ready" })
        .where(and(eq(file.id, id), eq(file.status, "pending")))
        .returning({ id: file.id });
      if (activated.length === 0) throw new ActionError("Upload not found");
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "file.uploaded",
          entityType: "file",
          entityId: id,
          after: { name: pending.name, size: pending.size },
        },
        tx,
      );
    });
    revalidatePath(`/dashboard/${slug}/files`);
  });
}

/** Releases a pending upload's reserved quota after the browser upload failed. */
export async function abortUpload(slug: string, id: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { file: ["upload"] });
    const [pending] = await withTenant(ctx.organization.id, (tx) =>
      tx
        .select({ storageKey: file.storageKey })
        .from(file)
        .where(and(eq(file.id, id), eq(file.status, "pending"))),
    );
    if (pending) await removePending(ctx.organization.id, id, pending.storageKey);
  });
}

/** Deletes the object only if the row was still pending, so a concurrent confirm can't lose its file. */
async function removePending(organizationId: string, id: string, storageKey: string) {
  const deleted = await withTenant(organizationId, (tx) =>
    tx
      .delete(file)
      .where(and(eq(file.id, id), eq(file.status, "pending")))
      .returning({ id: file.id }),
  );
  if (deleted.length > 0) await deleteObject(storageKey).catch(() => undefined);
}

export async function getDownloadUrl(slug: string, id: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { file: ["read"] });
    const [row] = await withTenant(ctx.organization.id, (tx) =>
      tx
        .select()
        .from(file)
        .where(and(eq(file.id, id), eq(file.status, "ready"))),
    );
    if (!row) throw new ActionError("File not found");
    return { url: await createDownloadUrl(row.storageKey, row.name) };
  });
}

export async function deleteFile(slug: string, id: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { file: ["delete"] });
    const row = await withTenant(ctx.organization.id, async (tx) => {
      const [deleted] = await tx.delete(file).where(eq(file.id, id)).returning();
      if (!deleted) throw new ActionError("File not found");
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "file.deleted",
          entityType: "file",
          entityId: id,
          before: { name: deleted.name },
        },
        tx,
      );
      return deleted;
    });
    await deleteObject(row.storageKey).catch(() => undefined);
    revalidatePath(`/dashboard/${slug}/files`);
  });
}
