import { prisma } from "../prisma";
import { getEnv } from "../env";

function getIp(req: Request): string {
  const env = (() => { try { return getEnv(); } catch { return null; } })();
  const trustProxy = env?.TRUST_PROXY ?? false;
  if (trustProxy) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
  }
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export async function checkRateLimit(
  req: Request,
  rule: { key: string; max: number; windowSeconds: number },
): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> {
  let env: ReturnType<typeof getEnv> | null = null;
  try { env = getEnv(); } catch { return { allowed: true }; }
  if (!env.RATE_LIMIT_ENABLED) return { allowed: true };

  const ip = getIp(req);
  const key = `${rule.key}:ip:${ip}`;

  const now = new Date();
  const windowMs = rule.windowSeconds * 1000;

  // Fixed window via transaction
  const entry = await prisma.rateLimitEntry.findUnique({ where: { key } });
  if (!entry) {
    await prisma.rateLimitEntry.create({ data: { key, count: 1, windowStart: now } });
    return { allowed: true, remaining: rule.max - 1 };
  }
  const elapsed = now.getTime() - entry.windowStart.getTime();
  if (elapsed > windowMs) {
    await prisma.rateLimitEntry.update({ where: { key }, data: { count: 1, windowStart: now } });
    return { allowed: true, remaining: rule.max - 1 };
  }
  if (entry.count >= rule.max) {
    const retryAfter = Math.ceil((windowMs - elapsed) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }
  await prisma.rateLimitEntry.update({ where: { key }, data: { count: { increment: 1 } } });
  return { allowed: true, remaining: rule.max - entry.count - 1 };
}

export function rateLimitHeaders(remaining: number | undefined, retryAfter: number | undefined, max: number): Record<string, string> {
  const h: Record<string, string> = {};
  if (remaining !== undefined) h["X-RateLimit-Remaining"] = String(remaining);
  h["X-RateLimit-Limit"] = String(max);
  if (retryAfter !== undefined) h["Retry-After"] = String(retryAfter);
  return h;
}

export function isHealthOrDocs(path: string): boolean {
  return path.includes("/health") || path.includes("/openapi") || path.includes("/docs");
}
