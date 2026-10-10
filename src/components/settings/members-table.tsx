"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authClient } from "@/lib/auth/client";

type Member = { id: string; role: string; userId: string; name: string; email: string };
type Invite = { id: string; email: string; role: string | null; expiresAt: Date };

export function MembersTable({
  organizationId,
  currentUserId,
  canManage,
  isOwner,
  members,
  invitations,
}: {
  organizationId: string;
  currentUserId: string;
  canManage: boolean;
  isOwner: boolean;
  members: Member[];
  invitations: Invite[];
}) {
  const t = useTranslations("settings");
  const router = useRouter();

  async function changeRole(memberId: string, role: string) {
    const { error } = await authClient.organization.updateMemberRole({
      memberId,
      role: role as "member",
      organizationId,
    });
    if (error) return toast.error(error.message ?? "Could not change role");
    toast.success("Role updated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const self = m.userId === currentUserId;
              const editable = canManage && !self && (isOwner || m.role !== "owner");
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.name} {self ? <span className="text-xs text-muted-foreground">(you)</span> : null}
                  </TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    {editable ? (
                      <Select defaultValue={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                        <SelectTrigger size="sm" className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">member</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                          {isOwner ? <SelectItem value="owner">owner</SelectItem> : null}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{m.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editable ? (
                      <ConfirmButton
                        trigger={
                          <Button variant="ghost" size="sm">
                            Remove
                          </Button>
                        }
                        title={`Remove ${m.name}?`}
                        description="They will immediately lose access to this organization."
                        confirmLabel="Remove"
                        action={() => authClient.organization.removeMember({ memberIdOrEmail: m.id, organizationId })}
                      />
                    ) : self && m.role !== "owner" ? (
                      <ConfirmButton
                        trigger={
                          <Button variant="ghost" size="sm">
                            Leave
                          </Button>
                        }
                        title="Leave organization?"
                        description="You will lose access until you are invited again."
                        confirmLabel="Leave"
                        redirectTo="/dashboard"
                        action={() => authClient.organization.leave({ organizationId })}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("pendingInvitations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {invitations.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {i.email} <Badge variant="outline">{i.role}</Badge>
                  </span>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const { error } = await authClient.organization.cancelInvitation({ invitationId: i.id });
                        if (error) return toast.error(error.message ?? "Failed");
                        router.refresh();
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
