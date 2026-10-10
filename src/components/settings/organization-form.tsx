"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { slugify } from "@/lib/utils";

export function OrganizationForm({
  organization,
  canEdit,
}: {
  organization: { id: string; name: string; slug: string; logo: string | null };
  canEdit: boolean;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const slug = slugify(String(form.get("slug")));
    setLoading(true);
    const { error } = await authClient.organization.update({
      organizationId: organization.id,
      data: { name: String(form.get("name")), slug, logo: String(form.get("logo") || "") || undefined },
    });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Update failed");
    toast.success("Organization updated");
    router.push(`/dashboard/${slug}/settings`);
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={organization.name} disabled={!canEdit} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={organization.slug}
              disabled={!canEdit}
              required
              pattern="[a-z0-9-]+"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input id="logo" name="logo" type="url" defaultValue={organization.logo ?? ""} disabled={!canEdit} />
          </div>
        </CardContent>
        {canEdit ? (
          <CardFooter className="mt-4">
            <Button type="submit" disabled={loading}>
              {t("save")}
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
