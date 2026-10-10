"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { requestUpload } from "@/lib/actions/files";

export function FileUploader({ slug, label, accept }: { slug: string; label: string; accept: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await requestUpload(slug, { name: file.name, contentType: file.type, size: file.size });
      if (!res.ok) throw new Error(res.error);
      const put = await fetch(res.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      toast.success(`${file.name} uploaded`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={input} type="file" className="hidden" accept={accept} onChange={onChange} />
      <Button onClick={() => input.current?.click()} disabled={uploading}>
        <Upload /> {uploading ? "Uploading…" : label}
      </Button>
    </>
  );
}
