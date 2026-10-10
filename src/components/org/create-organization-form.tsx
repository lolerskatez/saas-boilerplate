"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { slugify } from "@/lib/utils";

export function CreateOrganizationForm() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const finalSlug = slugify(slug || name);
    const { error } = await authClient.organization.create({ name, slug: finalSlug });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Could not create organization");
    router.push(`/dashboard/${finalSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">{t("orgName")}</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
          required
          maxLength={64}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-slug">{t("slug")}</Label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">/dashboard/</span>
          <Input
            id="org-slug"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
            required
            pattern="[a-z0-9-]+"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading || !name}>
        {t("submit")}
      </Button>
    </form>
  );
}
