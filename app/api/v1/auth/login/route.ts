import { prisma } from "@/lib/prisma";
import { loginBodySchema } from "@/lib/auth/validation";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, generateRefreshToken, refreshExpiresAt } from "@/lib/auth/jwt";
import { signSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "@/lib/api/auth-helpers";
import { error, success } from "@/lib/api/envelope";
import * as argon2 from "argon2";
import { cookies } from "next/headers";

const GENERIC = "Invalid credentials";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }
  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) return error("UNAUTHENTICATED", GENERIC, { status: 401 });

  const { username, password } = parsed.data;

  const user = await prisma.user.findFirst({ where: { username, deletedAt: null } });
  if (!user) {
    await verifyPassword("$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash", password).catch(() => {});
    return error("UNAUTHENTICATED", GENERIC, { status: 401 });
  }
  if (user.status !== "ACTIVE") return error("UNAUTHENTICATED", GENERIC, { status: 401 });

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return error("UNAUTHENTICATED", GENERIC, { status: 401 });

  const { token: accessToken, exp } = signAccessToken(user.id, user.username);
  const rawRefresh = generateRefreshToken();
  const refreshHash = await argon2.hash(rawRefresh, { type: argon2.argon2id });
  const expiresAt = refreshExpiresAt();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: refreshHash, expiresAt },
  });

  const cookieValue = signSession(user.id);
  const csrfToken = generateCsrfToken();
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, cookieValue, sessionCookieOptions() as never);
  const isProd = process.env.NODE_ENV === "production";
  jar.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  } as never);

  return success({
    accessToken,
    refreshToken: rawRefresh,
    tokenType: "Bearer",
    expiresIn: 900,
    expiresAt: new Date(exp * 1000).toISOString(),
    csrfToken,
  });
}
