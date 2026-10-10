import { getTranslations } from "next-intl/server";

import { SearchForm } from "@/components/admin/search-form";
import { UserActions } from "@/components/admin/user-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listUsers } from "@/lib/admin";
import { requireSuperAdmin } from "@/lib/auth/session";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [t, session, users] = await Promise.all([getTranslations("admin"), requireSuperAdmin(), listUsers(q)]);
  return (
    <>
      <h1 className="text-2xl font-bold">{t("users")}</h1>
      <SearchForm defaultValue={q} placeholder="Search by name or email" />
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell className="space-x-1">
                  {u.role === "admin" ? <Badge>admin</Badge> : null}
                  {u.banned ? <Badge variant="destructive">banned</Badge> : null}
                  {u.emailVerified ? null : <Badge variant="outline">unverified</Badge>}
                  {u.twoFactorEnabled ? <Badge variant="secondary">2FA</Badge> : null}
                </TableCell>
                <TableCell>{u.createdAt.toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <UserActions userId={u.id} banned={!!u.banned} role={u.role} isSelf={u.id === session.user.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
