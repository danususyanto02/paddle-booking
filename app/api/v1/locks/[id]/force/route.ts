import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";
import { getEffectivePermissions } from "@/lib/rbac/effectivePermissions";
import { audit } from "@/lib/api/audit";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { isSuperAdmin, permissions } = await getEffectivePermissions(auth.userId);
  if (!isSuperAdmin && !permissions.has("DD0000005")) return success(null, { status: 403 }) as unknown as Response;
  const { id } = await params;
  const target = await prisma.recordLock.findUnique({ where: { id } });
  await prisma.recordLock.deleteMany({ where: { id } });
  await audit(req, { action: "LOCK_FORCE", resourceType: "LOCK", resourceId: id, permissionCode: "DD0000005", before: target });
  return success(null);
}
