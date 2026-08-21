import { prisma } from "@/lib/prisma";
import { success, validationError } from "@/lib/api/envelope";
import { requireFeaturePermission } from "@/lib/rbac/guards";
import { z } from "zod";

const qs = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(100).optional().default(""),
  authMethod: z.enum(["BEARER", "COOKIE", "NONE"]).optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(req: Request) {
  const guard = await requireFeaturePermission(req, "/dashboard/audit-logs", "AM0000007");
  if (guard instanceof Response) return guard;

  const url = new URL(req.url);
  const parsed = qs.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    authMethod: url.searchParams.get("authMethod") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    resourceType: url.searchParams.get("resourceType") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error.flatten());
  const { page, limit, q, authMethod, action, resourceType, status } = parsed.data;
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ actorUsername: { contains: q, mode: "insensitive" } }, { resourceId: { contains: q, mode: "insensitive" } }];
  if (authMethod) where.authMethod = authMethod;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (status) where.status = status;
  const total = await prisma.auditLog.count({ where: where as never });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (page > totalPages) return success([], { meta: { page, limit, total, totalPages } });
  const data = await prisma.auditLog.findMany({ where: where as never, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit });
  return success(data, { meta: { page, limit, total, totalPages } });
}
