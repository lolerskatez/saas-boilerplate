import { and, desc, eq, lt } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can } from "@/lib/auth/permissions";
import { getOrgContext } from "@/lib/auth/session";
import { auditLog } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

function formatValue(v: unknown) {
  if (v === null || v === undefined) return "∅";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ before?: string; entity?: string }>;
}) {
  const [{ slug }, { before, entity }] = await Promise.all([params, searchParams]);
  const ctx = await getOrgContext(slug);
  if (!can(ctx.role, { auditLog: ["read"] })) notFound();
  const [t, rows] = await Promise.all([
    getTranslations("settings"),
    withTenant(ctx.organization.id, (tx) =>
      tx
        .select()
        .from(auditLog)
        .where(
          and(
            before ? lt(auditLog.createdAt, new Date(before)) : undefined,
            entity ? eq(auditLog.entityType, entity) : undefined,
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(PAGE_SIZE + 1),
    ),
  ]);
  const page = rows.slice(0, PAGE_SIZE);
  const next = rows.length > PAGE_SIZE ? page.at(-1)!.createdAt.toISOString() : null;
  const base = `/dashboard/${slug}/settings/audit-log`;
  const entities = ["project", "member", "invitation", "api_key", "file", "organization", "subscription"];
  return (
    <>
      <PageHeader title={t("auditLog")} description="A tamper-evident history of changes in this organization." />
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={entity ? "outline" : "default"}>
          <Link href={base}>All</Link>
        </Button>
        {entities.map((e) => (
          <Button key={e} asChild size="sm" variant={entity === e ? "default" : "outline"}>
            <Link href={`${base}?entity=${e}`}>{e}</Link>
          </Button>
        ))}
      </div>
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((row) => (
              <TableRow key={row.id} className="align-top">
                <TableCell className="text-xs whitespace-nowrap">{row.createdAt.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="text-sm">{row.actorLabel ?? row.actorId ?? "System"}</div>
                  <Badge variant="outline" className="text-[10px]">
                    {row.actorType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <code className="text-xs">{row.action}</code>
                </TableCell>
                <TableCell className="max-w-md">
                  <ul className="space-y-0.5 text-xs">
                    {Object.entries(row.changes ?? {}).map(([field, c]) => (
                      <li key={field} className="truncate">
                        <span className="font-medium">{field}</span>:{" "}
                        <span className="text-muted-foreground line-through">{formatValue(c.from)}</span> →{" "}
                        {formatValue(c.to)}
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {page.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No entries.</p> : null}
      </Card>
      {next ? (
        <Button asChild variant="outline">
          <Link href={`${base}?before=${encodeURIComponent(next)}${entity ? `&entity=${entity}` : ""}`}>
            Older entries →
          </Link>
        </Button>
      ) : null}
    </>
  );
}
