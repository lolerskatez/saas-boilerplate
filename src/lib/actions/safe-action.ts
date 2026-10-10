import { PlanLimitError } from "@/lib/billing/entitlements";
import { logger } from "@/lib/logger";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Wraps a server action body so expected errors surface as messages instead of 500s. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof PlanLimitError) return { ok: false, error: err.message };
    if (err instanceof Error && (err as { digest?: string }).digest?.startsWith("NEXT_")) throw err;
    if (err instanceof ActionError) return { ok: false, error: err.message };
    if (err instanceof Error && err.message.startsWith("You don't have permission"))
      return { ok: false, error: err.message };
    logger.error({ err }, "Server action failed");
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export class ActionError extends Error {}
