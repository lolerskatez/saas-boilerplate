import { PgBoss } from "pg-boss";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { JOB_NAMES, type JobName, type JobPayloads } from "./definitions";

const globalForBoss = globalThis as unknown as { bossPromise?: Promise<PgBoss> };

export async function ensureQueues(boss: PgBoss) {
  for (const name of JOB_NAMES) {
    if (!(await boss.getQueue(name))) await boss.createQueue(name);
  }
}

/** A pg-boss client used only for enqueuing; the worker process owns supervision and cron. */
function getProducer(): Promise<PgBoss> {
  globalForBoss.bossPromise ??= (async () => {
    const boss = new PgBoss({ connectionString: env.DATABASE_URL, supervise: false, schedule: false });
    boss.on("error", (error) => logger.error({ err: error }, "pg-boss error"));
    await boss.start();
    await ensureQueues(boss);
    return boss;
  })();
  return globalForBoss.bossPromise;
}

/**
 * Enqueue a background job. With `JOBS_MODE=inline` the handler runs immediately instead,
 * which is useful on serverless hosts that don't run `npm run worker`.
 */
export async function enqueue<K extends JobName>(name: K, data: JobPayloads[K]) {
  if (env.JOBS_MODE === "inline") {
    const { handlers } = await import("./handlers");
    await handlers[name](data);
    return null;
  }
  const boss = await getProducer();
  return boss.send(name, data as object, { retryLimit: 5, retryBackoff: true });
}
