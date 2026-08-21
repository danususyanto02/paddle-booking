import { prisma } from "@/lib/prisma";
import { success, error, validationError } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";
import { z } from "zod";
import { hashLockToken, generateLockToken } from "@/lib/locks/token";

const bodySchema = z.object({ resourceType: z.enum(["COURT", "BOOKING", "USER", "ROLE", "ORGANIZATION", "FEATURE"]), resourceId: z.string().min(1) });

export async function POST(req: Request) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());
  const { resourceType, resourceId } = parsed.data;

  const globalEnabled = (await prisma.systemSetting.findUnique({ where: { key: "recordLockEnabled" } }))?.value as boolean ?? true;
  if (!globalEnabled) return error("FORBIDDEN", "Record locking disabled", { status: 403 });

  const existing = await prisma.recordLock.findUnique({ where: { resourceType_resourceId: { resourceType: resourceType as never, resourceId } } });
  if (existing && existing.expiresAt > new Date()) {
    if (existing.ownerUserId !== auth.userId) {
      return error("LOCKED", "Resource is locked by another user", { status: 423, details: { owner: existing.ownerUserId, expiresAt: existing.expiresAt } });
    }
    // Already owned by self
    return success({ id: existing.id, resourceType, resourceId, expiresAt: existing.expiresAt });
  }

  const token = generateLockToken();
  const lockTokenHash = await hashLockToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);

  // Upsert: replace expired or create
  const lock = await prisma.recordLock.upsert({
    where: { resourceType_resourceId: { resourceType: resourceType as never, resourceId } },
    update: { lockTokenHash, ownerUserId: auth.userId, acquiredAt: now, heartbeatAt: now, expiresAt },
    create: { resourceType: resourceType as never, resourceId, lockTokenHash, ownerUserId: auth.userId, acquiredAt: now, heartbeatAt: now, expiresAt },
  });

  return success({ id: lock.id, resourceType, resourceId, expiresAt, lockToken: token });
}
