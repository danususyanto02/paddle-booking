import { prisma } from "@/lib/prisma";
import { refreshBodySchema } from "@/lib/auth/validation";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { getSessionUserId, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { error, success } from "@/lib/api/envelope";
import * as argon2 from "argon2";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  // Accept either: { refreshToken } (Bearer client) or cookie session (dashboard)
  let body: unknown = null;
  try { body = await req.json(); } catch { /* allow empty body for cookie logout */ }

  const parsed = body ? refreshBodySchema.safeParse(body) : { success: false as const };

  // Case 1: refreshToken provided — revoke that token (+ optionally reveal user via Bearer in header)
  if (parsed.success) {
    const raw = parsed.data.refreshToken;
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
    // Also revoke all if Bearer identifies user (optional: full logout)
    const auth = req.headers.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const res = verifyAccessToken(auth.slice(7).trim());
      if (res.ok) {
        await prisma.refreshToken.updateMany({ where: { userId: res.claims.sub, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    }
    // Clear cookie if present
    const jar = await cookies();
    jar.delete(SESSION_COOKIE_NAME);
    return success(null);
  }

  // Case 2: Bearer header logout (no body) — revoke all for that user
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const res = verifyAccessToken(auth.slice(7).trim());
    if (res.ok) {
      await prisma.refreshToken.updateMany({ where: { userId: res.claims.sub, revokedAt: null }, data: { revokedAt: new Date() } });
      const jar = await cookies();
      jar.delete(SESSION_COOKIE_NAME);
      return success(null);
    }
  }

  // Case 3: Cookie session logout — clear cookie + revoke all refresh tokens for that user, release locks
  const userId = await getSessionUserId();
  if (userId) {
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.recordLock.deleteMany({ where: { ownerUserId: userId } });
    const jar = await cookies();
    jar.delete(SESSION_COOKIE_NAME);
    return success(null);
  }

  // Idempotent: even if no session, return 200
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
  return success(null);
}
