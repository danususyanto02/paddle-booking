/**
 * CSRF protection for cookie-auth mutations.
 * Spec: starter-kit-spec.md § CSRF Protection for Cookie-Auth Mutations
 *
 * Strategy (documented):
 *  - Default: Origin/Referer check for cookie-auth mutations.
 *  - Alternative: double-submit X-CSRF-Token (cookie vs header) — also supported.
 *  - Bearer mutations are NOT CSRF-vulnerable (Authorization header not auto-sent cross-site) and are EXEMPT.
 *
 * Implementation:
 *  - Call `assertCsrf(req)` at the top of every cookie-auth mutation (POST/PATCH/PUT/DELETE).
 *  - If Authorization: Bearer is present -> exempt (return null, no CSRF check).
 *  - For cookie mutations:
 *    a) If Origin header present -> must match app origin (NEXTAUTH_URL).
 *    b) Else if Referer header present -> must have same origin as NEXTAUTH_URL.
 *    c) Else if X-CSRF-Token header matches csrf cookie -> pass (double-submit).
 *    d) Else -> 403 FORBIDDEN.
 *
 * OpenAPI: security schemes cookie+bearer documented in lib/openapi/registry.ts (T32).
 */

import { randomBytes } from "crypto";
import { error } from "./envelope";

function getAppOrigin(): string {
  try {
    const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return new URL(url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function hasBearerAuth(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return !!auth && auth.toLowerCase().startsWith("bearer ");
}

function hasValidCsrfToken(req: Request): boolean {
  const headerToken = req.headers.get("x-csrf-token");
  if (!headerToken) return false;
  const cookieHeader = req.headers.get("cookie") ?? "";
  // csrf cookie name: kc_csrf (set at login, also readable by JS)
  const match = cookieHeader.match(/(?:^|;\s*)kc_csrf=([^;]+)/);
  const cookieToken = match?.[1] ?? null;
  if (!cookieToken) return false;
  // timing-safe compare not critical for demo; use strict equality (both random opaque)
  if (headerToken.length !== cookieToken.length) return false;
  let diff = 0;
  for (let i = 0; i < headerToken.length; i++) diff |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  return diff === 0;
}

export function assertCsrf(req: Request): Response | null {
  const method = req.method.toUpperCase();
  // Only mutations need CSRF
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  // Bearer -> exempt (spec)
  if (hasBearerAuth(req)) return null;

  const appOrigin = getAppOrigin();

  // 1) Origin header check
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin === appOrigin) return null;
    } catch {
      // invalid origin -> fail
    }
    return error("FORBIDDEN", "CSRF check failed: invalid Origin", { status: 403 });
  }

  // 2) Referer fallback
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin === appOrigin) return null;
    } catch {
      // invalid referer -> fail
    }
    return error("FORBIDDEN", "CSRF check failed: invalid Referer", { status: 403 });
  }

  // 3) Double-submit token fallback
  if (hasValidCsrfToken(req)) return null;

  // No valid CSRF signal for cookie mutation -> reject
  return error("FORBIDDEN", "CSRF check failed", { status: 403 });
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export const CSRF_COOKIE_NAME = "kc_csrf";
