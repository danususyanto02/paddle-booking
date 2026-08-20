import { cookies } from "next/headers";
import { getEnv } from "../env";
import { prisma } from "../prisma";
import { verifyAccessToken } from "./jwt";

// Cookie session (dashboard) — simple signed cookie via Auth.js-like approach
// We use a minimal session cookie without full Auth.js dep for T08; T09 may add Auth.js if needed.
// Cookie value: base64url(JSON { sub, exp }) + "." + HMAC(AUTH_SECRET)
// Keeps HttpOnly/Secure/SameSite=Lax invariants from spec.

import { createHmac } from "crypto";

function b64url(s: string): string {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from((s + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

const COOKIE_NAME = "kc_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export function signSession(userId: string): string {
  const env = getEnv();
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = b64url(JSON.stringify({ sub: userId, exp }));
  const sig = Buffer.from(createHmac("sha256", env.AUTH_SECRET).update(payload).digest())
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${payload}.${sig}`;
}

export function verifySessionCookie(raw: string | null | undefined): { sub: string } | null {
  if (!raw) return null;
  const env = (() => { try { return getEnv(); } catch { return null; } })();
  if (!env) return null;
  const idx = raw.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = Buffer.from(createHmac("sha256", env.AUTH_SECRET).update(payload).digest())
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const { sub, exp } = JSON.parse(b64urlDecode(payload));
    if (!sub || typeof exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > exp + 30) return null; // 30s skew
    return { sub };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SEC,
  };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// Resolve current user from either Bearer or cookie (for POST /api/v1/auth/* + GET me/access)
export async function resolveUserFromRequest(req: Request): Promise<{ userId: string; authMethod: "BEARER" | "COOKIE" } | null> {
  // Bearer first
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    const res = verifyAccessToken(token);
    if (res.ok) return { userId: res.claims.sub, authMethod: "BEARER" };
    return null;
  }
  // Cookie fallback (dashboard)
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const verified = verifySessionCookie(match?.[1] ?? null);
  if (verified) return { userId: verified.sub, authMethod: "COOKIE" };
  return null;
}

// Helper for Route Handlers using next/headers cookies()
export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value ?? null;
  const v = verifySessionCookie(raw);
  return v?.sub ?? null;
}

// Fetch fresh user + roles + effective permissions (source of truth for /me/access)
export async function getAccessData(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user || user.status !== "ACTIVE") return null;

  // Direct roles
  const directRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const orgMemberships = await prisma.organizationMember.findMany({
    where: { userId, organization: { status: "ACTIVE", deletedAt: null } },
    include: { organization: true },
  });
  const orgIds = orgMemberships.map((m) => m.organizationId);
  const orgRoles = orgIds.length
    ? await prisma.organizationRole.findMany({
        where: { organizationId: { in: orgIds }, role: { status: "ACTIVE", deletedAt: null } },
        include: { role: true },
      })
    : [];

  // Collect effective permissions (direct + org) filtered ACTIVE only
  const roleIds = new Set<string>();
  for (const ur of directRoles) if (ur.role.status === "ACTIVE" && !ur.role.deletedAt) roleIds.add(ur.roleId);
  for (const or of orgRoles) if (or.role.status === "ACTIVE" && !or.role.deletedAt) roleIds.add(or.roleId);

  const rolePermissions = roleIds.size
    ? await prisma.rolePermission.findMany({
        where: { roleId: { in: [...roleIds] } },
        include: { permission: { include: { feature: true } } },
      })
    : [];

  // Deduplicate by permission code, and filter where feature is ACTIVE & not deleted
  const permMap = new Map<string, (typeof rolePermissions)[number]["permission"]>();
  for (const rp of rolePermissions) {
    const p = rp.permission;
    if (!p.feature || p.feature.deletedAt || p.feature.status !== "ACTIVE") continue;
    if (!permMap.has(p.code)) permMap.set(p.code, p);
  }

  // SUPER_ADMIN bypass: return all permissions (no filter) — check role name
  const isSuperAdmin = [...directRoles, ...orgRoles].some((r) => (r as { role: { name: string } }).role.name === "SUPER_ADMIN");
  let effectivePermissions: string[];
  if (isSuperAdmin) {
    const all = await prisma.permission.findMany({ select: { code: true } });
    effectivePermissions = all.map((p) => p.code);
  } else {
    effectivePermissions = [...permMap.keys()].sort();
  }

  const roles = [...new Set([...directRoles.map((r) => r.role.name), ...orgRoles.map((r) => r.role.name)])];

  return {
    user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email, status: user.status },
    roles,
    effectivePermissions,
    organizations: orgMemberships.map((m) => ({ id: m.organization.id, name: m.organization.name, code: m.organization.code })),
  };
}
