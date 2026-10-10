import { NextResponse } from "next/server";
import * as z from "zod";

import { hasScope, verifyApiKey, type ApiKeyPrincipal, type ApiKeyScope } from "@/lib/api-keys";
import { PlanLimitError } from "@/lib/billing/entitlements";
import { logger } from "@/lib/logger";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Handler<P> = (ctx: { request: Request; principal: ApiKeyPrincipal; params: P }) => Promise<Response>;

/**
 * Wraps a public REST endpoint: authenticates the `Authorization: Bearer sk_live_...` API key,
 * checks the required scope and maps errors to a consistent JSON shape.
 */
export function apiRoute<P = Record<string, never>>(scope: ApiKeyScope | null, handler: Handler<P>) {
  return async (request: Request, ctx: { params: Promise<P> }) => {
    const header = request.headers.get("authorization");
    const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
    const principal = await verifyApiKey(token);
    if (!principal) return apiError(401, "unauthorized", "Missing or invalid API key");
    if (scope && !hasScope(principal, scope)) return apiError(403, "forbidden", `API key lacks the '${scope}' scope`);
    try {
      return await handler({ request, principal, params: await ctx.params });
    } catch (err) {
      if (err instanceof ApiError) return apiError(err.status, err.code, err.message);
      if (err instanceof z.ZodError)
        return NextResponse.json(
          { error: { code: "invalid_request", message: "Invalid request body", issues: err.issues } },
          { status: 422 },
        );
      if (err instanceof PlanLimitError) return apiError(402, "plan_limit", err.message);
      if (err instanceof SyntaxError) return apiError(400, "invalid_json", "Request body must be valid JSON");
      logger.error({ err, url: request.url }, "API request failed");
      return apiError(500, "internal_error", "Internal server error");
    }
  };
}
