import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { error } from "@/lib/api/envelope";

/**
 * Rate-limit guard for Route Handlers (spec: Epic E8 T29).
 * Returns a 429 Response when the rule is exceeded, else null.
 * Rules come from env (RATE_LIMIT_{LOGIN,REGISTER,API}_{MAX,WINDOW_SECONDS}).
 * Health/docs paths are exempt (see lib/rate-limit isHealthOrDocs).
 */
export async function assertRateLimit(
  req: Request,
  rule: "login" | "register" | "api",
): Promise<Response | null> {
  let env: ReturnType<typeof getEnv>;
  try {
    env = getEnv();
  } catch {
    return null; // env misconfigured — let caller handle 500
  }
  if (!env.RATE_LIMIT_ENABLED) return null;

  const rules = {
    login: {
      key: "login",
      max: env.RATE_LIMIT_LOGIN_MAX,
      windowSeconds: env.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
    },
    register: {
      key: "register",
      max: env.RATE_LIMIT_REGISTER_MAX,
      windowSeconds: env.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
    },
    api: {
      key: "api",
      max: env.RATE_LIMIT_API_MAX,
      windowSeconds: env.RATE_LIMIT_API_WINDOW_SECONDS,
    },
  } as const;

  const r = rules[rule];
  const res = await checkRateLimit(req, r);
  if (!res.allowed) {
    return error("RATE_LIMITED", "Too many requests", {
      status: 429,
      headers: rateLimitHeaders(res.remaining, res.retryAfter, r.max),
    });
  }
  return null;
}
