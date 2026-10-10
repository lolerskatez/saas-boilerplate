import { auditLog } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { Transaction } from "@/lib/db";

export type AuditActor =
  { type: "user"; id: string; label?: string } | { type: "api_key"; id: string; label?: string } | { type: "system" };

export interface AuditEntry {
  organizationId: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const IGNORED_FIELDS = new Set(["updatedAt", "createdAt"]);

/** Computes a field-level diff `{ field: { from, to } }` between two snapshots. */
export function diff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const from = normalize(before?.[key]);
    const to = normalize(after?.[key]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
  }
  return changes;
}

function normalize(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : value;
}

/**
 * Appends an entry to the organization's audit log. Pass `tx` to write inside an existing
 * tenant transaction so the log entry commits atomically with the change it describes.
 */
export async function recordAudit(entry: AuditEntry, tx?: Transaction) {
  const values = {
    organizationId: entry.organizationId,
    actorType: entry.actor.type,
    actorId: entry.actor.type === "system" ? null : entry.actor.id,
    actorLabel: entry.actor.type === "system" ? "System" : (entry.actor.label ?? null),
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    changes: diff(entry.before, entry.after),
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
  };
  if (tx) {
    await tx.insert(auditLog).values(values);
    return;
  }
  await withTenant(entry.organizationId, (t) =>
    t
      .insert(auditLog)
      .values(values)
      .then(() => undefined),
  );
}
