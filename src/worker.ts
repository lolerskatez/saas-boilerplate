/**
 * Background worker: `npm run worker`. Processes pg-boss queues and registers cron schedules.
 * Run one or more instances alongside the web app (see Dockerfile / docker-compose).
 */
import { PgBoss } from "pg-boss";

import { env } from "@/lib/env";
import { JOB_NAMES, SCHEDULES, type JobName, type JobPayloads } from "@/lib/jobs/definitions";
import { handlers } from "@/lib/jobs/handlers";
import { ensureQueues } from "@/lib/jobs";
import { logger } from "@/lib/logger";

async function main() {
  const boss = new PgBoss({ connectionString: env.DATABASE_URL });
  boss.on("error", (err) => logger.error({ err }, "pg-boss error"));
  await boss.start();
  await ensureQueues(boss);

  for (const name of JOB_NAMES) {
    await boss.work(name, { batchSize: 5 }, async (jobs) => {
      for (const job of jobs) {
        const log = logger.child({ job: name, jobId: job.id });
        log.debug("Processing job");
        await (handlers[name] as (d: JobPayloads[JobName]) => Promise<void>)(job.data as JobPayloads[JobName]);
      }
    });
  }
  for (const { name, cron } of SCHEDULES) await boss.schedule(name, cron, {});

  logger.info({ queues: JOB_NAMES }, "Worker started");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Worker shutting down");
    await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.fatal({ err }, "Worker failed to start");
  process.exit(1);
});
