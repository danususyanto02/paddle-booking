import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api/envelope";
import { requireFeaturePermission } from "@/lib/rbac/guards";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeaturePermission(req, "/dashboard/audit-logs", "AM0000007");
  if (guard instanceof Response) return guard;
  const { id } = await params;
  const row = await prisma.auditLog.findUnique({ where: { id } });
  if (!row) return error("NOT_FOUND", "Not found", { status: 404 });
  return success(row);
}
