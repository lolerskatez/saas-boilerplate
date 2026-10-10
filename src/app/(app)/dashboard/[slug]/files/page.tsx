import { desc } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { FileDownloadButton } from "@/components/dashboard/file-download-button";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteFile } from "@/lib/actions/files";
import { can } from "@/lib/auth/permissions";
import { getOrgContext } from "@/lib/auth/session";
import { file } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { ALLOWED_CONTENT_TYPES, storageEnabled } from "@/lib/storage";
import { formatBytes } from "@/lib/utils";

export const metadata = { title: "Files" };

export default async function FilesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  const [t, files] = await Promise.all([
    getTranslations("dashboard"),
    withTenant(ctx.organization.id, (tx) => tx.select().from(file).orderBy(desc(file.createdAt))),
  ]);
  return (
    <>
      <PageHeader
        title={t("files")}
        description="Uploaded directly to S3-compatible storage with presigned URLs."
        actions={
          storageEnabled && can(ctx.role, { file: ["upload"] }) ? (
            <FileUploader slug={slug} label={t("upload")} accept={ALLOWED_CONTENT_TYPES.join(",")} />
          ) : null
        }
      />
      {storageEnabled ? null : (
        <Alert>
          <AlertDescription>File storage is not configured. Set the S3_* environment variables.</AlertDescription>
        </Alert>
      )}
      <Card className="p-0">
        {files.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("noFiles")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{formatBytes(f.size)}</TableCell>
                  <TableCell>{f.createdAt.toLocaleString()}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <FileDownloadButton slug={slug} id={f.id} />
                    {can(ctx.role, { file: ["delete"] }) ? (
                      <ConfirmButton
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Delete">
                            <Trash2 />
                          </Button>
                        }
                        title="Delete file?"
                        description={`"${f.name}" will be permanently deleted.`}
                        confirmLabel="Delete"
                        action={deleteFile.bind(null, slug, f.id)}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
