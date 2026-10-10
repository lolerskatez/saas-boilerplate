"use client";

import { Copy, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApiKey } from "@/lib/actions/api-keys";
import { API_KEY_SCOPES, type ApiKeyScope } from "@/lib/api-key-scopes";

export function CreateApiKeyDialog({ slug }: { slug: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["projects:read"]);
  const [created, setCreated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const days = Number(form.get("expiresInDays") || 0);
    setLoading(true);
    const res = await createApiKey(slug, {
      name: String(form.get("name")),
      scopes,
      expiresInDays: days > 0 ? days : null,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    setCreated(res.data.key);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setCreated(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <KeyRound /> {t("newKey")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newKey")}</DialogTitle>
        </DialogHeader>
        {created ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>{t("keyCreated")}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Input readOnly value={created} className="font-mono text-xs" data-testid="api-key-value" />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy"
                onClick={() => navigator.clipboard.writeText(created).then(() => toast.success("Copied"))}
              >
                <Copy />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input id="key-name" name="name" placeholder="CI pipeline" required maxLength={64} />
            </div>
            <div className="space-y-2">
              <Label>Scopes</Label>
              {API_KEY_SCOPES.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox
                    id={`scope-${s}`}
                    checked={scopes.includes(s)}
                    onCheckedChange={(c) => setScopes((prev) => (c ? [...prev, s] : prev.filter((x) => x !== s)))}
                  />
                  <Label htmlFor={`scope-${s}`} className="font-mono text-xs font-normal">
                    {s}
                  </Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-expiry">Expires in (days, optional)</Label>
              <Input id="key-expiry" name="expiresInDays" type="number" min={1} max={3650} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || scopes.length === 0}>
                {t("newKey")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
