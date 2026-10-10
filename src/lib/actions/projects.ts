"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import * as z from "zod";

import { recordAudit } from "@/lib/audit";
import { requireOrgPermission } from "@/lib/auth/session";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { project } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

import { ActionError, runAction } from "./safe-action";

const projectInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
});

async function requestMeta() {
  const h = await headers();
  return { ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: h.get("user-agent") };
}

export async function createProject(slug: string, input: z.input<typeof projectInput>) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { project: ["create"] });
    const data = projectInput.parse(input);
    await assertWithinLimit(ctx.organization.id, "projects");
    const meta = await requestMeta();
    const created = await withTenant(ctx.organization.id, async (tx) => {
      const [row] = await tx
        .insert(project)
        .values({ ...data, organizationId: ctx.organization.id, createdById: ctx.user.id })
        .returning();
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "project.created",
          entityType: "project",
          entityId: row!.id,
          after: data,
          ...meta,
        },
        tx,
      );
      return row!;
    });
    revalidatePath(`/dashboard/${slug}`, "layout");
    return { id: created.id };
  });
}

export async function updateProject(slug: string, id: string, input: z.input<typeof projectInput>) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { project: ["update"] });
    const data = projectInput.partial().parse(input);
    const meta = await requestMeta();
    await withTenant(ctx.organization.id, async (tx) => {
      const [before] = await tx.select().from(project).where(eq(project.id, id));
      if (!before) throw new ActionError("Project not found");
      const [after] = await tx.update(project).set(data).where(eq(project.id, id)).returning();
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "project.updated",
          entityType: "project",
          entityId: id,
          before,
          after,
          ...meta,
        },
        tx,
      );
    });
    revalidatePath(`/dashboard/${slug}`, "layout");
  });
}

export async function deleteProject(slug: string, id: string) {
  return runAction(async () => {
    const ctx = await requireOrgPermission(slug, { project: ["delete"] });
    const meta = await requestMeta();
    await withTenant(ctx.organization.id, async (tx) => {
      const [before] = await tx.delete(project).where(eq(project.id, id)).returning();
      if (!before) throw new ActionError("Project not found");
      await recordAudit(
        {
          organizationId: ctx.organization.id,
          actor: { type: "user", id: ctx.user.id, label: ctx.user.email },
          action: "project.deleted",
          entityType: "project",
          entityId: id,
          before: { name: before.name, status: before.status },
          ...meta,
        },
        tx,
      );
    });
    revalidatePath(`/dashboard/${slug}`, "layout");
  });
}
