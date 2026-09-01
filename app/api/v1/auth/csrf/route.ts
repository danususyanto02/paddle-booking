import { cookies } from "next/headers";
import { getSessionUserId } from "@/lib/auth/session";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "@/lib/api/auth-helpers";
import { error, success } from "@/lib/api/envelope";

// GET /api/v1/auth/csrf — issues a CSRF token for cookie-auth clients
// Requires authenticated session (Bearer or cookie); returns { csrfToken } and sets kc_csrf cookie
export async function GET(req: Request) {
  // Light auth check — reuse getSessionUserId or Bearer via cookie header check
  const auth = req.headers.get("authorization");
  let authed = false;
  if (auth?.toLowerCase().startsWith("bearer ")) {
    // Cheap check: verify token via session helper indirectly (avoid importing jwt verify)
    const { verifyAccessToken } = await import("@/lib/auth/jwt");
    const res = verifyAccessToken(auth.slice(7).trim());
    if (res.ok) authed = true;
  }
  if (!authed) {
    const userId = await getSessionUserId();
    if (userId) authed = true;
  }
  if (!authed) return error("UNAUTHENTICATED", "Unauthorized", { status: 401 });

  const csrfToken = generateCsrfToken();
  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  jar.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  } as never);

  return success({ csrfToken });
}
