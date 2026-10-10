import { relations, sql } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, text, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

const id = () =>
  text()
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};
const orgRef = () =>
  text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" });

// ---------------------------------------------------------------------------
// Billing (one subscription per organization; written only by webhooks)
// ---------------------------------------------------------------------------
export const subscription = pgTable(
  "subscription",
  {
    id: id(),
    organizationId: orgRef().unique(),
    provider: text().notNull().default("stripe"),
    customerId: text(),
    subscriptionId: text().unique(),
    priceId: text(),
    plan: text().notNull().default("free"),
    status: text().notNull().default("inactive"),
    interval: text(),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    cancelAtPeriodEnd: boolean().notNull().default(false),
    /** Creation time of the last applied provider event; older events are ignored. */
    lastEventAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("subscription_customer_idx").on(t.customerId)],
);

/** Webhook idempotency: each provider event is processed at most once. */
export const processedWebhookEvent = pgTable(
  "processed_webhook_event",
  {
    id: id(),
    provider: text().notNull(),
    eventId: text().notNull(),
    eventType: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("processed_webhook_event_provider_event_idx").on(t.provider, t.eventId)],
);

// ---------------------------------------------------------------------------
// Tenant-scoped tables (protected by Row-Level Security, see drizzle/*_rls.sql)
// ---------------------------------------------------------------------------

/** Example domain entity. Copy this pattern for your own tenant-scoped resources. */
export const project = pgTable(
  "project",
  {
    id: id(),
    organizationId: orgRef(),
    name: text().notNull(),
    description: text(),
    status: text({ enum: ["active", "paused", "archived"] })
      .notNull()
      .default("active"),
    createdById: text().references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("project_org_idx").on(t.organizationId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    organizationId: orgRef(),
    actorType: text({ enum: ["user", "api_key", "system"] }).notNull(),
    actorId: text(),
    actorLabel: text(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text(),
    /** Field-level diff: `{ field: { from, to } }` */
    changes: jsonb().$type<Record<string, { from: unknown; to: unknown }>>(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_log_org_created_idx").on(t.organizationId, t.createdAt)],
);

export const apiKey = pgTable(
  "api_key",
  {
    id: id(),
    organizationId: orgRef(),
    name: text().notNull(),
    /** First characters of the key, safe to display (e.g. `sk_live_ab12`). */
    prefix: text().notNull(),
    /** SHA-256 of the full key. The plaintext key is shown once and never stored. */
    hashedKey: text().notNull().unique(),
    scopes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdById: text().references(() => user.id, { onDelete: "set null" }),
    lastUsedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("api_key_org_idx").on(t.organizationId)],
);

export const file = pgTable(
  "file",
  {
    id: id(),
    organizationId: orgRef(),
    uploadedById: text().references(() => user.id, { onDelete: "set null" }),
    name: text().notNull(),
    contentType: text().notNull(),
    size: bigint({ mode: "number" }).notNull(),
    storageKey: text().notNull().unique(),
    /** `pending` until the browser's direct upload is confirmed by `confirmUpload`. */
    status: text({ enum: ["pending", "ready"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("file_org_idx").on(t.organizationId)],
);

// ---------------------------------------------------------------------------
// User-scoped
// ---------------------------------------------------------------------------
export const notification = pgTable(
  "notification",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text().references(() => organization.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text().notNull(),
    body: text(),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notification_user_created_idx").on(t.userId, t.createdAt)],
);

export const projectRelations = relations(project, ({ one }) => ({
  organization: one(organization, { fields: [project.organizationId], references: [organization.id] }),
  createdBy: one(user, { fields: [project.createdById], references: [user.id] }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  organization: one(organization, { fields: [subscription.organizationId], references: [organization.id] }),
}));
