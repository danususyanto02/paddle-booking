import { prisma } from "@/lib/prisma";
import { success, validationError } from "@/lib/api/envelope";
import { requireFeaturePermission } from "@/lib/rbac/guards";
import { z } from "zod";

const qs = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(100).optional().default(""),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  role: z.string().trim().max(64).optional(),
});

export async function GET(req: Request) {
  const guard = await requireFeaturePermission(req, "/dashboard/users", "AM0000001");
  if (guard instanceof Response) return guard;

  const url = new URL(req.url);
  const parsed = qs.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error.flatten());
  const { page, limit, q, status, role } = parsed.data;

  const where: Record<string, unknown> = { deletedAt: null };
  if (q) where.OR = [{ username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }];
  if (status) where.status = status;
  if (role) {
    const roleRow = await prisma.role.findFirst({ where: { name: role } });
    if (roleRow) where.userRoles = { some: { roleId: roleRow.id } };
    else where.userRoles = { some: { roleId: "__none" } };
  }

  const total = await prisma.user.count({ where: where as never });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (page > totalPages) return success([], { meta: { page, limit, total, totalPages } });
  const data = await prisma.user.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    select: { id: true, username: true, displayName: true, email: true, status: true, isSystem: true, createdAt: true, userRoles: { include: { role: { select: { name: true } } } } },
  });
  // Flatten roles for table
  const mapped = data.map((u) => ({ ...u, roles: u.userRoles.map((ur) => ur.role.name) }));
  return success(mapped, { meta: { page, limit, total, totalPages } });
}
