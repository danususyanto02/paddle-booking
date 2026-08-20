import { createHmac, randomBytes, randomUUID } from "crypto";
import { getEnv } from "../env";

// — HS256 helpers (no external dep; avoids jsonwebtoken version drift) —

// base64url without padding
function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from((s + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export type AccessClaims = {
  sub: string; // user id
  jti: string;
  iat: number; // seconds
  exp: number;
  iss: string;
  aud: string;
  username?: string;
};

const ACCESS_TTL_SEC = 15 * 60; // 15 minutes
const CLOCK_SKEW_SEC = 30;

function getIss(): string {
  // Prefer NEXTAUTH_URL / app origin; fallback to localhost
  const env = (() => {
    try { return getEnv(); } catch { return null; }
  })();
  return env?.NEXTAUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export function signAccessToken(userId: string, username?: string): { token: string; jti: string; exp: number; iat: number } {
  const env = getEnv();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ACCESS_TTL_SEC;
  const jti = randomUUID();
  const iss = getIss();
  const payload: AccessClaims = { sub: userId, jti, iat, exp, iss, aud: "api", ...(username ? { username } : {}) };
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", env.JWT_SECRET).update(`${h}.${p}`).digest());
  return { token: `${h}.${p}.${sig}`, jti, exp, iat };
}

export type VerifyResult =
  | { ok: true; claims: AccessClaims }
  | { ok: false; code: "TOKEN_EXPIRED" | "UNAUTHENTICATED"; message: string };

export function verifyAccessToken(token: string): VerifyResult {
  const env = (() => { try { return getEnv(); } catch { return null; } })();
  if (!env) return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  const [h, p, sig] = parts as [string, string, string];
  const expected = b64url(createHmac("sha256", env.JWT_SECRET).update(`${h}.${p}`).digest());
  // timing-safe compare (length check first)
  if (sig.length !== expected.length) return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };

  let claims: AccessClaims;
  try {
    claims = JSON.parse(b64urlDecode(p).toString("utf8"));
  } catch {
    return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  }
  const iss = getIss();
  if (claims.iss !== iss) return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  if (claims.aud !== "api") return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || now > claims.exp + CLOCK_SKEW_SEC) {
    return { ok: false, code: "TOKEN_EXPIRED", message: "Token expired" };
  }
  if (typeof claims.iat !== "number" || claims.iat > now + CLOCK_SKEW_SEC) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  }
  if (!claims.sub || !claims.jti) return { ok: false, code: "UNAUTHENTICATED", message: "Invalid token" };
  return { ok: true, claims };
}

// ── Opaque refresh token helpers ─────────────────────────────────────

export function generateRefreshToken(): string {
  // 32+ bytes hex (64 hex chars) — opaque
  return randomBytes(32).toString("hex");
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
}
