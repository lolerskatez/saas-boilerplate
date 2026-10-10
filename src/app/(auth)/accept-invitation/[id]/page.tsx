import { eq } from "drizzle-orm";
import Link from "next/link";

import { AcceptInvitationButtons } from "@/components/auth/accept-invitation-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { invitation, organization } from "@/lib/db/schema";

export const metadata = { title: "Invitation" };

export default async function AcceptInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, [invite]] = await Promise.all([
    getSession(),
    db
      .select({
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        orgName: organization.name,
      })
      .from(invitation)
      .innerJoin(organization, eq(invitation.organizationId, organization.id))
      .where(eq(invitation.id, id))
      .limit(1),
  ]);

  const invalid = !invite || invite.status !== "pending" || invite.expiresAt < new Date();
  const next = `/accept-invitation/${id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{invalid ? "Invitation unavailable" : `Join ${invite.orgName}`}</CardTitle>
        <CardDescription>
          {invalid
            ? "This invitation is invalid, expired or has already been used."
            : `You've been invited to join as ${invite.role}.`}
        </CardDescription>
      </CardHeader>
      {invalid ? null : session ? (
        session.user.email.toLowerCase() === invite.email.toLowerCase() ? (
          <CardFooter>
            <AcceptInvitationButtons invitationId={id} />
          </CardFooter>
        ) : (
          <CardContent className="text-sm text-muted-foreground">
            This invitation was sent to {invite.email}, but you are signed in as {session.user.email}. Sign in with the
            invited account to accept it.
          </CardContent>
        )
      ) : (
        <CardFooter className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/sign-up?redirectTo=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`}>
              Create account
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/sign-in?redirectTo=${encodeURIComponent(next)}`}>Sign in</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
