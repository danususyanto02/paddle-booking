import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton — spec: `lib/prisma.ts`
 * Reuse client across hot-reloads in dev; single instance in production.
 * Must be imported AFTER lib/env.ts validation (caller responsibility).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
