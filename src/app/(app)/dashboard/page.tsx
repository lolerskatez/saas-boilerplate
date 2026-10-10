import { redirect } from "next/navigation";

import { listUserOrganizations, requireSession } from "@/lib/auth/session";

/** Sends the user to their active (or first) organization, or to onboarding if they have none. */
export default async function DashboardIndex() {
  const session = await requireSession();
  const orgs = await listUserOrganizations(session.user.id);
  if (orgs.length === 0) redirect("/onboarding");
  const active = orgs.find((o) => o.id === session.session.activeOrganizationId) ?? orgs[0]!;
  redirect(`/dashboard/${active.slug}`);
}
