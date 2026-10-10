import "server-only";

import { count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { member, organization, subscription, user } from "@/lib/db/schema";
import { ACTIVE_SUBSCRIPTION_STATUSES, PLANS, type PlanId } from "@/lib/billing/plans";

export async function getAdminStats() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [[users], [orgs], [newUsers], subs, signups] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(organization),
    db.select({ n: count() }).from(user).where(gte(user.createdAt, since)),
    db
      .select({ plan: subscription.plan, interval: subscription.interval, n: count() })
      .from(subscription)
      .where(inArray(subscription.status, [...ACTIVE_SUBSCRIPTION_STATUSES]))
      .groupBy(subscription.plan, subscription.interval),
    db
      .select({ day: sql<string>`to_char(date_trunc('day', ${user.createdAt}), 'YYYY-MM-DD')`, n: count() })
      .from(user)
      .where(gte(user.createdAt, since))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);

  // Monthly recurring revenue estimated from the plan catalog (yearly plans divided by 12).
  const mrr = subs.reduce((sum, s) => {
    const plan = PLANS[s.plan as PlanId];
    if (!plan) return sum;
    const monthly = s.interval === "yearly" ? plan.price.yearly / 12 : plan.price.monthly;
    return sum + monthly * s.n;
  }, 0);

  const byDay = new Map(signups.map((s) => [s.day, s.n]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day: d.slice(5), signups: byDay.get(d) ?? 0 };
  });

  return {
    users: users?.n ?? 0,
    organizations: orgs?.n ?? 0,
    newUsers: newUsers?.n ?? 0,
    paidOrganizations: subs.reduce((s, r) => s + r.n, 0),
    mrr,
    series,
  };
}

export async function listUsers(q?: string, limit = 50) {
  return db
    .select()
    .from(user)
    .where(q ? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`)) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit);
}

export async function listOrganizations(q?: string, limit = 50) {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      members: sql<number>`(select count(*)::int from ${member} where ${member.organizationId} = ${organization.id})`,
      plan: subscription.plan,
      status: subscription.status,
    })
    .from(organization)
    .leftJoin(subscription, eq(subscription.organizationId, organization.id))
    .where(q ? or(ilike(organization.name, `%${q}%`), ilike(organization.slug, `%${q}%`)) : undefined)
    .orderBy(desc(organization.createdAt))
    .limit(limit);
}
