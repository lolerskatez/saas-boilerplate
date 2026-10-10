"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { abortUpload, confirmUpload, requestUpload } from "@/lib/actions/files";

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
      const { id, uploadUrl } = res.data;
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } }).catch(
        () => null,
      );
      if (!put?.ok) {
        await abortUpload(slug, id);
        throw new Error(put ? `Upload failed (${put.status})` : "Upload failed");
      }
      const confirmed = await confirmUpload(slug, id);
      if (!confirmed.ok) throw new Error(confirmed.error);
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
