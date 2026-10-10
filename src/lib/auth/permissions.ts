import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";

/**
 * Organization-level RBAC. Extend `statements` with your own resources; roles are checked
 * on the server (Server Actions, Route Handlers) and can be reused in the UI to hide controls.
 */
export const statements = {
  ...defaultStatements,
  project: ["create", "read", "update", "delete"],
  file: ["upload", "read", "delete"],
  billing: ["read", "manage"],
  apiKey: ["read", "create", "revoke"],
  auditLog: ["read"],
} as const;

export const ac = createAccessControl(statements);

export const member = ac.newRole({
  ...memberAc.statements,
  project: ["create", "read", "update"],
  file: ["upload", "read"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  project: ["create", "read", "update", "delete"],
  file: ["upload", "read", "delete"],
  billing: ["read"],
  apiKey: ["read", "create", "revoke"],
  auditLog: ["read"],
});

export const owner = ac.newRole({
  ...ownerAc.statements,
  project: ["create", "read", "update", "delete"],
  file: ["upload", "read", "delete"],
  billing: ["read", "manage"],
  apiKey: ["read", "create", "revoke"],
  auditLog: ["read"],
});

export const roles = { owner, admin, member } as const;
export type OrgRole = keyof typeof roles;
export const ORG_ROLES = Object.keys(roles) as OrgRole[];

type Statements = typeof statements;
export type PermissionRequest = { [K in keyof Statements]?: Array<Statements[K][number]> };

export function can(role: string | null | undefined, request: PermissionRequest): boolean {
  if (!role) return false;
  // A member can hold several comma-separated roles; any one granting access is enough.
  return role.split(",").some((r) => {
    const def = roles[r.trim() as OrgRole];
    return def ? def.authorize(request as never).success : false;
  });
}
