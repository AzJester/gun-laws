// Shared admin-token guard for write endpoints (review approve/reject/edit).
//
// Auth model:
//  - ADMIN_TOKEN set   → writes require it via `Authorization: Bearer <token>`
//                        or the `x-admin-token` header. Reads (GET) are allowed
//                        without it (the queue is internal-tooling, not PII).
//  - ADMIN_TOKEN unset → writes are refused (safe default; never publish without
//                        an explicit token configured).
//
// Nothing here touches the DB.

import { getEnv } from "./env";

export function tokenFromRequest(req: Request): string | null {
  return (
    req.headers.get("x-admin-token") ??
    (req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null)
  );
}

export interface AuthResult {
  ok: boolean;
  /** HTTP status to return when !ok. */
  status: number;
  /** Human-readable reason when !ok. */
  reason?: string;
}

/** Authorize a WRITE action against ADMIN_TOKEN. */
export function authorizeWrite(req: Request): AuthResult {
  const configured = getEnv(process.env).ADMIN_TOKEN;
  if (!configured) {
    return {
      ok: false,
      status: 503,
      reason:
        "ADMIN_TOKEN is not configured; review actions are disabled. Set " +
        "ADMIN_TOKEN and send it as a Bearer token (or x-admin-token header).",
    };
  }
  const provided = tokenFromRequest(req);
  if (provided !== configured) {
    return { ok: false, status: 401, reason: "Invalid or missing admin token." };
  }
  return { ok: true, status: 200 };
}
