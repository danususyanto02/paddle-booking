import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api/envelope";
import { requireFeaturePermission } from "@/lib/rbac/guards";

export async function GET(req: Request) {
  const guard = await requireFeaturePermission(req, "/dashboard/users", "AM0000001");
  if (guard instanceof Response) return guard;
  const roles = await prisma.role.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, status: true, isSystem: true } });
  return success(roles);
}
