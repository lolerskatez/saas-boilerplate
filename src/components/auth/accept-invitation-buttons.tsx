"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function AcceptInvitationButtons({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function respond(accept: boolean) {
    setLoading(true);
    const res = accept
      ? await authClient.organization.acceptInvitation({ invitationId })
      : await authClient.organization.rejectInvitation({ invitationId });
    setLoading(false);
    if (res.error) return toast.error(res.error.message ?? "Something went wrong");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex w-full gap-2">
      <Button className="flex-1" disabled={loading} onClick={() => respond(true)}>
        Accept
      </Button>
      <Button className="flex-1" variant="outline" disabled={loading} onClick={() => respond(false)}>
        Decline
      </Button>
    </div>
  );
}
