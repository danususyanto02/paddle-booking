import { describe, it, expect, vi, beforeEach } from "vitest";

// ── rate-limit headers helper (pure) ─────────────────────────────────────
import { rateLimitHeaders, isHealthOrDocs } from "../../lib/rate-limit/index";

describe("rateLimitHeaders", () => {
  it("sets limit + remaining + retry-after", () => {
    expect(rateLimitHeaders(3, 42, 5)).toEqual({
      "X-RateLimit-Remaining": "3",
      "X-RateLimit-Limit": "5",
      "Retry-After": "42",
    });
  });

  it("omits retry-after when allowed", () => {
    const h = rateLimitHeaders(4, undefined, 5);
    expect(h["Retry-After"]).toBeUndefined();
    expect(h["X-RateLimit-Limit"]).toBe("5");
  });
});

describe("isHealthOrDocs", () => {
  it("exempts health/docs/openapi paths", () => {
    expect(isHealthOrDocs("/api/v1/health")).toBe(true);
    expect(isHealthOrDocs("/api/docs")).toBe(true);
    expect(isHealthOrDocs("/api/openapi.json")).toBe(true);
    expect(isHealthOrDocs("/api/v1/auth/login")).toBe(false);
  });
});

// ── checkRateLimit with mocked prisma + env ──────────────────────────────
describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock("@/lib/rate-limit/index");
  });

  it("allows when RATE_LIMIT_ENABLED=false without touching db", async () => {
    vi.doMock("../../lib/env", () => ({
      getEnv: () => ({ RATE_LIMIT_ENABLED: false, TRUST_PROXY: false }),
    }));
    const prismaMock = { rateLimitEntry: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } };
    vi.doMock("../../lib/prisma", () => ({ prisma: prismaMock }));
    const { checkRateLimit } = await import("../../lib/rate-limit/index");
    const res = await checkRateLimit(new Request("http://x/api/v1/auth/login"), {
      key: "login",
      max: 5,
      windowSeconds: 900,
    });
    expect(res).toEqual({ allowed: true });
    expect(prismaMock.rateLimitEntry.findUnique).not.toHaveBeenCalled();
  });

  it("creates entry on first hit, blocks over max, resets after window", async () => {
    vi.doMock("../../lib/env", () => ({
      getEnv: () => ({ RATE_LIMIT_ENABLED: true, TRUST_PROXY: false }),
    }));
    const store = new Map<string, { count: number; windowStart: Date }>();
    const prismaMock = {
      rateLimitEntry: {
        findUnique: vi.fn(async ({ where }: { where: { key: string } }) => store.get(where.key) ?? null),
        create: vi.fn(async ({ data }: { data: { key: string; count: number; windowStart: Date } }) => {
          store.set(data.key, { count: data.count, windowStart: data.windowStart });
        }),
        update: vi.fn(async ({ where, data }: { where: { key: string }; data: { count?: number | { increment: number }; windowStart?: Date } }) => {
          const cur = store.get(where.key)!;
          if (typeof data.count === "number") cur.count = data.count;
          else if (data.count && typeof data.count === "object") cur.count += data.count.increment;
          if (data.windowStart) cur.windowStart = data.windowStart;
        }),
      },
    };
    vi.doMock("../../lib/prisma", () => ({ prisma: prismaMock }));
    const { checkRateLimit } = await import("../../lib/rate-limit/index");
    const rule = { key: "login", max: 2, windowSeconds: 60 };
    const req = () => new Request("http://x/api/v1/auth/login");

    expect((await checkRateLimit(req(), rule)).allowed).toBe(true);
    expect((await checkRateLimit(req(), rule)).allowed).toBe(true);
    const blocked = await checkRateLimit(req(), rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);

    // force window expiry then allow again
    const k = "login:ip:0.0.0.0";
    store.get(k)!.windowStart = new Date(Date.now() - 61_000);
    expect((await checkRateLimit(req(), rule)).allowed).toBe(true);
  });
});
