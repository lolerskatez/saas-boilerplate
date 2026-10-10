import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/handler";
import { getOrgPlan } from "@/lib/billing/entitlements";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";

export const GET = apiRoute(null, async ({ principal }) => {
  const [org] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, principal.organizationId));
  const plan = await getOrgPlan(principal.organizationId);
  return NextResponse.json({
    organization: org,
    plan: plan.id,
    apiKey: { id: principal.id, name: principal.name, scopes: principal.scopes },
  });
});
