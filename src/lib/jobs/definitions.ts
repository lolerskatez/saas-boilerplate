import type { SendEmailInput } from "@/lib/email";

/** Every background job and its payload type. */
export interface JobPayloads {
  "email.send": SendEmailInput;
  "maintenance.cleanup": Record<string, never>;
}

export type JobName = keyof JobPayloads;

export const JOB_NAMES: JobName[] = ["email.send", "maintenance.cleanup"];

/** Recurring jobs registered by the worker (cron syntax, UTC). */
export const SCHEDULES: Array<{ name: JobName; cron: string }> = [{ name: "maintenance.cleanup", cron: "0 3 * * *" }];
