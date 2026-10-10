import { and, eq, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { file, invitation, session, verification } from "@/lib/db/schema";
import { withSystem } from "@/lib/db/tenant";
import { deliverEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { deleteObject, PENDING_UPLOAD_TTL_MS } from "@/lib/storage";

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
    const abandoned = await withSystem((tx) =>
      tx
        .delete(file)
        .where(and(eq(file.status, "pending"), lt(file.createdAt, new Date(now.getTime() - PENDING_UPLOAD_TTL_MS))))
        .returning({ storageKey: file.storageKey }),
    );
    await Promise.all(abandoned.map((f) => deleteObject(f.storageKey).catch(() => undefined)));
    logger.info({ abandonedUploads: abandoned.length }, "Expired sessions, invitations and uploads cleaned up");
  },
};
