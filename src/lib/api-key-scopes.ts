export const API_KEY_SCOPES = ["projects:read", "projects:write"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
