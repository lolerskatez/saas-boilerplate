import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import * as z from "zod";

import { ApiError, apiRoute } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { project } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

type Params = { id: string };

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).nullable(),
    status: z.enum(["active", "paused", "archived"]),
  })
  .partial();

export const GET = apiRoute<Params>("projects:read", async ({ principal, params }) => {
  const [row] = await withTenant(principal.organizationId, (tx) =>
    tx.select().from(project).where(eq(project.id, params.id)),
  );
  if (!row) throw new ApiError(404, "not_found", "Project not found");
  return NextResponse.json({ data: row });
});

export const PATCH = apiRoute<Params>("projects:write", async ({ request, principal, params }) => {
  const body = updateSchema.parse(await request.json());
  const updated = await withTenant(principal.organizationId, async (tx) => {
    const [before] = await tx.select().from(project).where(eq(project.id, params.id));
    if (!before) throw new ApiError(404, "not_found", "Project not found");
    const [after] = await tx.update(project).set(body).where(eq(project.id, params.id)).returning();
    await recordAudit(
      {
        organizationId: principal.organizationId,
        actor: { type: "api_key", id: principal.id, label: principal.name },
        action: "project.updated",
        entityType: "project",
        entityId: params.id,
        before,
        after,
      },
      tx,
    );
    return after!;
  });
  return NextResponse.json({ data: updated });
});

export const DELETE = apiRoute<Params>("projects:write", async ({ principal, params }) => {
  await withTenant(principal.organizationId, async (tx) => {
    const [deleted] = await tx.delete(project).where(eq(project.id, params.id)).returning();
    if (!deleted) throw new ApiError(404, "not_found", "Project not found");
    await recordAudit(
      {
        organizationId: principal.organizationId,
        actor: { type: "api_key", id: principal.id, label: principal.name },
        action: "project.deleted",
        entityType: "project",
        entityId: params.id,
        before: { name: deleted.name },
      },
      tx,
    );
  });
  return new NextResponse(null, { status: 204 });
});
