/**
 * Next.js instrumentation hook — runs once when the server boots.
 * Validates env BEFORE any route handler / Prisma init can run.
 * Spec: fail-fast; throw => process exit 1 (Docker restart handles it).
 */
export async function register() {
  // Only run on server (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to ensure lib/env.ts fail-fast logic executes
    await import("./lib/env");
  }
}
