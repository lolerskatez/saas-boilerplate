import { desc, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import * as z from "zod";

import { apiRoute } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { project } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
});

/** GET /api/v1/projects?limit=20&cursor=<ISO createdAt> */
export const GET = apiRoute("projects:read", async ({ request, principal }) => {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 100);
  const cursor = url.searchParams.get("cursor");
  const rows = await withTenant(principal.organizationId, (tx) =>
    tx
      .select()
      .from(project)
      .where(cursor ? lt(project.createdAt, new Date(cursor)) : undefined)
      .orderBy(desc(project.createdAt))
      .limit(limit + 1),
  );
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  return NextResponse.json({ data, nextCursor: hasMore ? data.at(-1)!.createdAt.toISOString() : null });
});

export const POST = apiRoute("projects:write", async ({ request, principal }) => {
  const body = createSchema.parse(await request.json());
  await assertWithinLimit(principal.organizationId, "projects");
  const created = await withTenant(principal.organizationId, async (tx) => {
    const [row] = await tx
      .insert(project)
      .values({ ...body, organizationId: principal.organizationId })
      .returning();
    await recordAudit(
      {
        organizationId: principal.organizationId,
        actor: { type: "api_key", id: principal.id, label: principal.name },
        action: "project.created",
        entityType: "project",
        entityId: row!.id,
        after: body,
      },
      tx,
    );
    return row!;
  });
  return NextResponse.json({ data: created }, { status: 201 });
});
