"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getDownloadUrl } from "@/lib/actions/files";

export function FileDownloadButton({ slug, id }: { slug: string; id: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Download"
      onClick={async () => {
        const res = await getDownloadUrl(slug, id);
        if (!res.ok) return toast.error(res.error);
        window.location.href = res.data.url;
      }}
    >
      <Download />
    </Button>
  );
}
