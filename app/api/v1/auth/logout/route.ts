import { prisma } from "@/lib/prisma";
import { refreshBodySchema } from "@/lib/auth/validation";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { getSessionUserId, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { CSRF_COOKIE_NAME } from "@/lib/api/auth-helpers";
import { success } from "@/lib/api/envelope";
import * as argon2 from "argon2";
import { cookies } from "next/headers";

async function clearSessionCookies() {
  const jar = await cookies();
  // next/headers cookies().delete() may not emit Set-Cookie if jar is request-only; do both
  try { jar.delete(SESSION_COOKIE_NAME); } catch {}
  try { jar.delete(CSRF_COOKIE_NAME); } catch {}
  // Also set explicit expired cookies to force browser deletion (path/domain must match sessionCookieOptions)
  try { jar.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0, expires: new Date(0) } as never); } catch {}
  try { jar.set(CSRF_COOKIE_NAME, "", { path: "/", maxAge: 0, expires: new Date(0) } as never); } catch {}
}

export async function POST(req: Request) {
  // Note: NOT CSRF-guarded intentionally — logout is safe to exempt;
  // we still clear cookies and revoke tokens regardless.

  let body: unknown = null;
  try { body = await req.json(); } catch { /* allow empty body for cookie logout */ }

  const parsed = body && typeof body === "object" ? refreshBodySchema.safeParse(body) : { success: false as const };

  // Case 1: refreshToken provided — revoke that token (+ optionally revoke all for Bearer user)
  if ((parsed as { success: boolean }).success) {
    const raw = (parsed as { data: { refreshToken: string } }).data.refreshToken;
    const candidates = await prisma.refreshToken.findMany({
      where: { revokedAt: null },
      take: 500,
    });
    for (const c of candidates) {
      try {
        if (await argon2.verify(c.tokenHash, raw)) {
          await prisma.refreshToken.update({ where: { id: c.id }, data: { revokedAt: new Date() } });
          break;
        }
      } catch { /* ignore */ }
    }
    const auth = req.headers.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const res = verifyAccessToken(auth.slice(7).trim());
      if (res.ok) {
        await prisma.refreshToken.updateMany({ where: { userId: res.claims.sub, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    }
    await clearSessionCookies();
    return success(null);
  }

  // Case 2: Bearer header logout (no body) — revoke all for that user
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const res = verifyAccessToken(auth.slice(7).trim());
    if (res.ok) {
      await prisma.refreshToken.updateMany({ where: { userId: res.claims.sub, revokedAt: null }, data: { revokedAt: new Date() } });
      await clearSessionCookies();
      return success(null);
    }
  }

  // Case 3: Cookie session logout — revoke all refresh tokens for that user, release locks
  const userId = await getSessionUserId();
  if (userId) {
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.recordLock.deleteMany({ where: { ownerUserId: userId } });
    await clearSessionCookies();
    return success(null);
  }

  // Idempotent: even if no session, still clear cookies and return 200
  await clearSessionCookies();
  return success(null);
}
