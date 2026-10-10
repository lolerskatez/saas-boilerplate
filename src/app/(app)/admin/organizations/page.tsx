import { getTranslations } from "next-intl/server";

import { SearchForm } from "@/components/admin/search-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOrganizations } from "@/lib/admin";
import { PLANS, resolvePlanId } from "@/lib/billing/plans";

export const metadata = { title: "Organizations" };

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [t, orgs] = await Promise.all([getTranslations("admin"), listOrganizations(q)]);
  return (
    <>
      <h1 className="text-2xl font-bold">{t("organizations")}</h1>
      <SearchForm defaultValue={q} placeholder="Search by name or slug" />
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((o) => {
              const plan = PLANS[resolvePlanId(o.plan && o.status ? { plan: o.plan, status: o.status } : null)];
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-muted-foreground">{o.slug}</TableCell>
                  <TableCell>{o.members}</TableCell>
                  <TableCell>
                    <Badge variant={plan.id === "free" ? "outline" : "default"}>{plan.name}</Badge>
                  </TableCell>
                  <TableCell>{o.createdAt.toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
