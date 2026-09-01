import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";
import { verifyLockToken } from "@/lib/locks/token";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const token = req.headers.get("x-record-lock-token");
  const lock = await prisma.recordLock.findUnique({ where: { id } });
  if (!lock) return success(null);
  // Force unlock path is separate: /force; here require owner token
  if (lock.ownerUserId !== auth.userId) return error("FORBIDDEN", "Not lock owner", { status: 403 });
  if (token) {
    const ok = await verifyLockToken(lock.lockTokenHash, token);
    if (!ok) return error("LOCKED", "Invalid lock token", { status: 423 });
  }
  await prisma.recordLock.delete({ where: { id } });
  return success(null);
}
