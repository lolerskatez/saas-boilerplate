"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { markNotificationsRead } from "@/lib/notifications";

export async function markAllNotificationsRead() {
  const session = await requireSession();
  await markNotificationsRead(session.user.id);
  revalidatePath("/", "layout");
}
