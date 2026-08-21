import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";
import { getEffectivePermissions } from "@/lib/rbac/effectivePermissions";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { isSuperAdmin, permissions } = await getEffectivePermissions(auth.userId);
  if (!isSuperAdmin && !permissions.has("DD0000005")) return success(null, { status: 403 }) as unknown as Response;
  const { id } = await params;
  await prisma.recordLock.deleteMany({ where: { id } });
  return success(null);
}
