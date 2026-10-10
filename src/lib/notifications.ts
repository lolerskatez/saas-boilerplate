import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { member, notification, user } from "@/lib/db/schema";

export interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export async function notify(input: NotificationInput & { userId: string; organizationId?: string | null }) {
  await db.insert(notification).values({
    userId: input.userId,
    organizationId: input.organizationId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/** Notifies a user by email address if they already have an account (e.g. invitations). */
export async function notifyUserByEmail(email: string, input: NotificationInput) {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase())).limit(1);
  if (existing) await notify({ ...input, userId: existing.id });
}

export async function notifyOrgAdmins(
  organizationId: string,
  input: NotificationInput,
  opts: { excludeUserId?: string } = {},
) {
  const admins = await db
    .select({ userId: member.userId })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        inArray(member.role, ["owner", "admin"]),
        opts.excludeUserId ? ne(member.userId, opts.excludeUserId) : undefined,
      ),
    );
  if (admins.length === 0) return;
  await db.insert(notification).values(admins.map((a) => ({ ...input, userId: a.userId, organizationId })));
}

export async function listNotifications(userId: string, limit = 20) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.userId, userId),
        isNull(notification.readAt),
        ids && ids.length > 0 ? inArray(notification.id, ids) : undefined,
      ),
    );
}
