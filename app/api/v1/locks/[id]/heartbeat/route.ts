import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";
import { verifyLockToken } from "@/lib/locks/token";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const token = req.headers.get("x-record-lock-token");
  if (!token) return error("LOCKED", "Missing lock token", { status: 423 });
  const lock = await prisma.recordLock.findUnique({ where: { id } });
  if (!lock || lock.expiresAt < new Date()) return error("LOCKED", "Lock not found or expired", { status: 423 });
  if (lock.ownerUserId !== auth.userId) return error("FORBIDDEN", "Not lock owner", { status: 403 });
  const ok = await verifyLockToken(lock.lockTokenHash, token);
  if (!ok) return error("LOCKED", "Invalid lock token", { status: 423 });
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await prisma.recordLock.update({ where: { id }, data: { heartbeatAt: new Date(), expiresAt } });
  return success({ id, expiresAt });
}
