"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** A destructive action behind a confirmation dialog. `action` returns an ActionResult-like object. */
export function ConfirmButton({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  action,
  successMessage,
  redirectTo,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => Promise<{ ok: boolean; error?: string } | { error: { message?: string } | null }>;
  successMessage?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const res = await action();
              setLoading(false);
              const error =
                "ok" in res
                  ? res.ok
                    ? null
                    : (res.error ?? "Action failed")
                  : res.error
                    ? (res.error.message ?? "Action failed")
                    : null;
              if (error) return toast.error(error);
              if (successMessage) toast.success(successMessage);
              if (redirectTo) router.push(redirectTo);
              router.refresh();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
