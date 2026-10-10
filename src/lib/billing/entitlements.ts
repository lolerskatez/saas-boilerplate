import { count, eq, isNull, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { apiKey, file, member, project, subscription } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

import { formatLimit, isWithinLimit, PLANS, resolvePlanId, type Plan, type PlanLimits } from "./plans";

export class PlanLimitError extends Error {
  constructor(
    public readonly resource: keyof PlanLimits,
    public readonly limit: number,
  ) {
    super(`Your plan allows ${formatLimit(limit)} ${resource}. Upgrade to add more.`);
    this.name = "PlanLimitError";
  }
}

export async function getOrgSubscription(organizationId: string) {
  const [row] = await db.select().from(subscription).where(eq(subscription.organizationId, organizationId)).limit(1);
  return row ?? null;
}

export async function getOrgPlan(organizationId: string): Promise<Plan> {
  return PLANS[resolvePlanId(await getOrgSubscription(organizationId))];
}

export async function getOrgUsage(organizationId: string): Promise<PlanLimits> {
  const [members] = await db.select({ n: count() }).from(member).where(eq(member.organizationId, organizationId));
  return withTenant(organizationId, async (tx) => {
    const [projects] = await tx.select({ n: count() }).from(project);
    const [keys] = await tx.select({ n: count() }).from(apiKey).where(isNull(apiKey.revokedAt));
    const [storage] = await tx.select({ bytes: sum(file.size) }).from(file);
    return {
      members: members?.n ?? 0,
      projects: projects?.n ?? 0,
      apiKeys: keys?.n ?? 0,
      storageMb: Number(storage?.bytes ?? 0) / (1024 * 1024),
    };
  });
}

/** Throws `PlanLimitError` if adding `increment` of `resource` would exceed the org's plan. */
export async function assertWithinLimit(organizationId: string, resource: keyof PlanLimits, increment = 1) {
  const [plan, usage] = await Promise.all([getOrgPlan(organizationId), getOrgUsage(organizationId)]);
  const limit = plan.limits[resource];
  if (!isWithinLimit(limit, usage[resource], increment)) throw new PlanLimitError(resource, limit);
}
