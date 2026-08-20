import { z } from "zod";

/**
 * Kinetic Court — Env validation (fail-fast, sebelum Prisma init)
 * Spec: starter-kit-spec.md § Configuration
 *
 * - Dipanggil sekali saat import. Throw => process exit 1 (Docker restart).
 * - Log effective config tanpa secret (redacted).
 * - Warn jika DATABASE_URL pakai sslmode=disable di production.
 */

const NODE_ENV = (process.env.NODE_ENV ?? "development") as
  | "development"
  | "production"
  | "test";

// Helpers: env string → typed value

function boolFromString(
  raw: string | undefined,
  fallback: boolean,
): boolean {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  // Biar Zod yang komplain — return fallback tapi akan di-validate via superRefine jika perlu strict
  return fallback;
}

const weakPasswords = new Set(["superadmin", "password", "admin"]);

const envSchema = z
  .object({
    // ── Core (required) ──────────────────────────────────────────
    DATABASE_URL: z
      .string({ message: "[env] DATABASE_URL is required" })
      .min(1, "[env] DATABASE_URL is required"),

    AUTH_SECRET: z
      .string({ message: "[env] AUTH_SECRET is required" })
      .min(32, "[env] Invalid AUTH_SECRET: must be >=32 chars"),

    JWT_SECRET: z
      .string({ message: "[env] JWT_SECRET is required" })
      .min(32, "[env] Invalid JWT_SECRET: must be >=32 chars"),

    // ── Super admin ──────────────────────────────────────────────
    SUPER_ADMIN_USERNAME: z
      .string()
      .trim()
      .min(1)
      .default("superadmin"),

    SUPER_ADMIN_PASSWORD: z
      .string()
      .default("superadmin"),

    // ── Registration ─────────────────────────────────────────────
    PUBLIC_REGISTRATION_ENABLED: z
      .string()
      .optional()
      .default("false")
      .transform((v) => boolFromString(v, false))
      .pipe(z.boolean()),

    // ── Rate limit ───────────────────────────────────────────────
    RATE_LIMIT_ENABLED: z
      .string()
      .optional()
      .default("true")
      .transform((v) => boolFromString(v, true))
      .pipe(z.boolean()),

    RATE_LIMIT_LOGIN_MAX: z
      .string()
      .optional()
      .default("5")
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1)),

    RATE_LIMIT_LOGIN_WINDOW_SECONDS: z
      .string()
      .optional()
      .default("900")
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1)),

    RATE_LIMIT_REGISTER_MAX: z
      .string()
      .optional()
      .default("5")
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1)),

    RATE_LIMIT_REGISTER_WINDOW_SECONDS: z
      .string()
      .optional()
      .default("3600")
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1)),

    RATE_LIMIT_API_MAX: z
      .string()
      .optional()
      .default("120")
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1)),

    RATE_LIMIT_API_WINDOW_SECONDS: z
      .string()
      .optional()
      .default("60")
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1)),

    // ── External API demo ────────────────────────────────────────
    RESTFUL_API_DEV_BASE_URL: z
      .string()
      .optional()
      .default("https://api.restful-api.dev")
      .transform((v) => v.trim())
      .pipe(z.string().url("[env] RESTFUL_API_DEV_BASE_URL must be a valid URL")),

    RESTFUL_API_DEV_API_KEY: z.string().optional().default(""),

    RESTFUL_API_DEV_TIMEOUT_MS: z
      .string()
      .optional()
      .default("5000")
      .transform((v) => Number(v))
      .pipe(z.number().int().min(100)),

    // ── Proxy ────────────────────────────────────────────────────
    TRUST_PROXY: z
      .string()
      .optional()
      .default("false")
      .transform((v) => boolFromString(v, false))
      .pipe(z.boolean()),

    // ── App ──────────────────────────────────────────────────────
    NEXTAUTH_URL: z
      .string()
      .optional()
      .default("http://localhost:3000"),

    NODE_ENV: z
      .enum(["development", "production", "test"])
      .optional()
      .default("development"),
  })
  .superRefine((data, ctx) => {
    // AUTH_SECRET vs JWT_SECRET must differ (always — spec says production fail-fast, we enforce always)
    if (data.AUTH_SECRET === data.JWT_SECRET) {
      ctx.addIssue({
        code: "custom" as const,
        path: ["JWT_SECRET"],
        message: "[env] Invalid AUTH_SECRET/JWT_SECRET: must be distinct values",
      });
    }

    // SUPER_ADMIN_PASSWORD rules
    const pwd = data.SUPER_ADMIN_PASSWORD;
    if (pwd.length < 8) {
      ctx.addIssue({
        code: "custom" as const,
        path: ["SUPER_ADMIN_PASSWORD"],
        message: "[env] SUPER_ADMIN_PASSWORD must be >=8 chars",
      });
    }
    if (NODE_ENV === "production") {
      if (!pwd || weakPasswords.has(pwd.toLowerCase())) {
        ctx.addIssue({
          code: "custom" as const,
          path: ["SUPER_ADMIN_PASSWORD"],
          message:
            '[env] SUPER_ADMIN_PASSWORD must not be "superadmin"/"password"/"admin" in production',
        });
      }
      // In production, password must exist (no fallback ke superadmin tanpa env)
      if (!process.env.SUPER_ADMIN_PASSWORD) {
        ctx.addIssue({
          code: "custom" as const,
          path: ["SUPER_ADMIN_PASSWORD"],
          message: "[env] SUPER_ADMIN_PASSWORD is required in production",
        });
      }
    }

    // RESTFUL_API_DEV_BASE_URL already validated as URL; extra guard for empty string
    if (data.RESTFUL_API_DEV_BASE_URL === "") {
      ctx.addIssue({
        code: "custom" as const,
        path: ["RESTFUL_API_DEV_BASE_URL"],
        message: "[env] RESTFUL_API_DEV_BASE_URL must be a valid URL if set",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function redactedDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    // Fallback: mask after ://...@ pattern
    return url.replace(/:\/\/[^@]+@/, "://***:***@");
  }
}

function logEffectiveConfig(env: Env) {
  const redacted = {
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: redactedDatabaseUrl(env.DATABASE_URL),
    AUTH_SECRET: "***REDACTED***",
    JWT_SECRET: "***REDACTED***",
    SUPER_ADMIN_USERNAME: env.SUPER_ADMIN_USERNAME,
    SUPER_ADMIN_PASSWORD: "***REDACTED***",
    PUBLIC_REGISTRATION_ENABLED: env.PUBLIC_REGISTRATION_ENABLED,
    RATE_LIMIT_ENABLED: env.RATE_LIMIT_ENABLED,
    RATE_LIMIT_LOGIN_MAX: env.RATE_LIMIT_LOGIN_MAX,
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: env.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
    RATE_LIMIT_REGISTER_MAX: env.RATE_LIMIT_REGISTER_MAX,
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: env.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
    RATE_LIMIT_API_MAX: env.RATE_LIMIT_API_MAX,
    RATE_LIMIT_API_WINDOW_SECONDS: env.RATE_LIMIT_API_WINDOW_SECONDS,
    RESTFUL_API_DEV_BASE_URL: env.RESTFUL_API_DEV_BASE_URL,
    RESTFUL_API_DEV_API_KEY: env.RESTFUL_API_DEV_API_KEY
      ? "***REDACTED***"
      : "(empty)",
    RESTFUL_API_DEV_TIMEOUT_MS: env.RESTFUL_API_DEV_TIMEOUT_MS,
    TRUST_PROXY: env.TRUST_PROXY,
    NEXTAUTH_URL: env.NEXTAUTH_URL,
  };

  // Use console.log — visible in dev & Docker logs; never log raw secrets
  console.log("[env] Effective config:", JSON.stringify(redacted, null, 2));

  // Production warnings (non-fatal)
  if (env.NODE_ENV === "production") {
    if (env.DATABASE_URL.includes("sslmode=disable")) {
      console.warn(
        "[env] WARNING: DATABASE_URL uses sslmode=disable in production — use sslmode=require",
      );
    }
    if (env.PUBLIC_REGISTRATION_ENABLED) {
      console.warn(
        "[env] WARNING: PUBLIC_REGISTRATION_ENABLED=true in production — ensure this is intentional",
      );
    }
    if (!env.RESTFUL_API_DEV_API_KEY) {
      console.warn(
        "[env] WARNING: RESTFUL_API_DEV_API_KEY is empty — external integration will return 503",
      );
    }
  }
}

export function getEnv(): Env {
  if (cached) return cached;

  const raw = {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    SUPER_ADMIN_USERNAME: process.env.SUPER_ADMIN_USERNAME,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
    PUBLIC_REGISTRATION_ENABLED: process.env.PUBLIC_REGISTRATION_ENABLED,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    RATE_LIMIT_LOGIN_MAX: process.env.RATE_LIMIT_LOGIN_MAX,
    RATE_LIMIT_LOGIN_WINDOW_SECONDS:
      process.env.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
    RATE_LIMIT_REGISTER_MAX: process.env.RATE_LIMIT_REGISTER_MAX,
    RATE_LIMIT_REGISTER_WINDOW_SECONDS:
      process.env.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
    RATE_LIMIT_API_MAX: process.env.RATE_LIMIT_API_MAX,
    RATE_LIMIT_API_WINDOW_SECONDS: process.env.RATE_LIMIT_API_WINDOW_SECONDS,
    RESTFUL_API_DEV_BASE_URL: process.env.RESTFUL_API_DEV_BASE_URL,
    RESTFUL_API_DEV_API_KEY: process.env.RESTFUL_API_DEV_API_KEY,
    RESTFUL_API_DEV_TIMEOUT_MS: process.env.RESTFUL_API_DEV_TIMEOUT_MS,
    TRUST_PROXY: process.env.TRUST_PROXY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    // Fail-fast: throw with [env] prefix — entrypoint/Docker will exit 1
    throw new Error(`[env] Invalid environment: ${details}`);
  }

  cached = parsed.data;
  logEffectiveConfig(cached);
  return cached;
}

// Auto-validate on import (fail-fast sebelum Prisma init).
// Di Next.js, import ini akan dieksekusi di server saat boot.
// Untuk test, set env vars sebelum import atau mock getEnv().
const _isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

let _autoValidated = false;
try {
  // Skip auto-validate during `next build` prerender (collect page data) — it sets NODE_ENV=production
  // but .env still has dev defaults (superadmin/superadmin). Runtime (dev/start/Docker) will still fail-fast via register() / getEnv().
  if (!_isBuildPhase && (process.env.DATABASE_URL || process.env.AUTH_SECRET)) {
    getEnv();
    _autoValidated = true;
  }
} catch (err) {
  // During build, log warning instead of throwing to avoid breaking prerender
  if (_isBuildPhase) {
    console.warn((err as Error).message, "(ignored during build)");
  } else {
    console.error((err as Error).message);
    throw err;
  }
}

// For testing: reset cache
export function __resetEnvCache() {
  cached = null;
  _autoValidated = false;
}

export const _isAutoValidated = () => _autoValidated;
