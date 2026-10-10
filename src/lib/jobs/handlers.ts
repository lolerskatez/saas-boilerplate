import { lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { invitation, session, verification } from "@/lib/db/schema";
import { deliverEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

import type { JobName, JobPayloads } from "./definitions";

export const handlers: { [K in JobName]: (data: JobPayloads[K]) => Promise<void> } = {
  "email.send": async (data) => {
    await deliverEmail(data);
  },
  "maintenance.cleanup": async () => {
    const now = new Date();
    await db.delete(session).where(lt(session.expiresAt, now));
    await db.delete(verification).where(lt(verification.expiresAt, now));
    await db.delete(invitation).where(lt(invitation.expiresAt, now));
    logger.info("Expired sessions, verifications and invitations cleaned up");
  },
};
