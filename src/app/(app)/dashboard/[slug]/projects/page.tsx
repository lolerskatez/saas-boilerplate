import { desc } from "drizzle-orm";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectDialog } from "@/components/dashboard/project-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteProject } from "@/lib/actions/projects";
import { can } from "@/lib/auth/permissions";
import { getOrgContext } from "@/lib/auth/session";
import { project } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  const [t, projects] = await Promise.all([
    getTranslations("dashboard"),
    withTenant(ctx.organization.id, (tx) => tx.select().from(project).orderBy(desc(project.createdAt))),
  ]);
  const canCreate = can(ctx.role, { project: ["create"] });
  const canUpdate = can(ctx.role, { project: ["update"] });
  const canDelete = can(ctx.role, { project: ["delete"] });
  return (
    <>
      <PageHeader
        title={t("projects")}
        description="An example tenant-scoped resource protected by Row-Level Security."
        actions={
          canCreate ? (
            <ProjectDialog
              slug={slug}
              trigger={
                <Button>
                  <Plus /> {t("newProject")}
                </Button>
              }
            />
          ) : null
        }
      />
      <Card className="p-0">
        {projects.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("noProjects")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description ? (
                      <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{p.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    {canUpdate ? (
                      <ProjectDialog
                        slug={slug}
                        project={p}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                    ) : null}
                    {canDelete ? (
                      <ConfirmButton
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Delete">
                            <Trash2 />
                          </Button>
                        }
                        title="Delete project?"
                        description={`"${p.name}" will be permanently deleted.`}
                        confirmLabel="Delete"
                        successMessage="Project deleted"
                        action={deleteProject.bind(null, slug, p.id)}
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
