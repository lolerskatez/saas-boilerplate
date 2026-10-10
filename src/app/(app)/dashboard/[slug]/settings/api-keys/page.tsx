import { desc, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { CreateApiKeyDialog } from "@/components/settings/create-api-key-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revokeApiKey } from "@/lib/actions/api-keys";
import { can } from "@/lib/auth/permissions";
import { getOrgContext } from "@/lib/auth/session";
import { apiKey } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { env } from "@/lib/env";

export const metadata = { title: "API keys" };

export default async function ApiKeysPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx.role, { apiKey: ["read"] })) notFound();
  const [t, keys] = await Promise.all([
    getTranslations("settings"),
    withTenant(ctx.organization.id, (tx) =>
      tx.select().from(apiKey).where(isNull(apiKey.revokedAt)).orderBy(desc(apiKey.createdAt)),
    ),
  ]);
  return (
    <>
      <PageHeader
        title={t("apiKeys")}
        description="Authenticate requests to the REST API with Authorization: Bearer <key>."
        actions={can(ctx.role, { apiKey: ["create"] }) ? <CreateApiKeyDialog slug={slug} /> : null}
      />
      <Card className="p-0">
        {keys.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>
                    <code>{k.prefix}…</code>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>{k.lastUsedAt ? k.lastUsedAt.toLocaleString() : "Never"}</TableCell>
                  <TableCell>{k.expiresAt ? k.expiresAt.toLocaleDateString() : "Never"}</TableCell>
                  <TableCell className="text-right">
                    {can(ctx.role, { apiKey: ["revoke"] }) ? (
                      <ConfirmButton
                        trigger={
                          <Button variant="ghost" size="sm">
                            {t("revoke")}
                          </Button>
                        }
                        title="Revoke API key?"
                        description="Applications using this key will immediately stop working."
                        confirmLabel={t("revoke")}
                        action={revokeApiKey.bind(null, slug, k.id)}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
            {`curl ${env.NEXT_PUBLIC_APP_URL}/api/v1/projects \\
  -H "Authorization: Bearer sk_live_..."

curl -X POST ${env.NEXT_PUBLIC_APP_URL}/api/v1/projects \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My project"}'`}
          </pre>
        </CardContent>
      </Card>
    </>
  );
}
