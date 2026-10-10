"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { recordAudit } from "@/lib/audit";
import { requireOrgPermission } from "@/lib/auth/session";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { file } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import {
  ALLOWED_CONTENT_TYPES,
  buildStorageKey,
  createDownloadUrl,
  createUploadUrl,
  deleteObject,
  MAX_UPLOAD_BYTES,
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
 * The file row is created up front; the browser then uploads directly to S3.
 */
export async function requestUpload(slug: string, values: z.input<typeof uploadInput>) {
  return runAction(async () => {
    if (!storageEnabled) throw new ActionError("File storage is not configured.");
    const ctx = await requireOrgPermission(slug, { file: ["upload"] });
    const data = uploadInput.parse(values);
    await assertWithinLimit(ctx.organization.id, "storageMb", data.size / (1024 * 1024));
    const storageKey = buildStorageKey(ctx.organization.id, data.name);
    const uploadUrl = await createUploadUrl(storageKey, data.contentType, data.size);
    const row = await withTenant(ctx.organization.id, async (tx) => {
      const [created] = await tx
        .insert(file)
        .values({ ...data, organizationId: ctx.organization.id, uploadedById: ctx.user.id, storageKey })
        .returning({ id: file.id });
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "file.uploaded",
          entityType: "file",
          entityId: created!.id,
          after: { name: data.name, size: data.size },
        },
        tx,
      );
      return created!;
    });
    revalidatePath(`/dashboard/${slug}/files`);
    return { id: row.id, uploadUrl };
  });
}

export async function getDownloadUrl(slug: string, id: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { file: ["read"] });
    const [row] = await withTenant(ctx.organization.id, (tx) => tx.select().from(file).where(eq(file.id, id)));
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
