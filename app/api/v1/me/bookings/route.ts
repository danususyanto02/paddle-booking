import { prisma } from "@/lib/prisma";
import { success, validationError } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  q: z.string().trim().max(100).optional().default(""),
  sortBy: z.enum(["date", "createdAt"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortOrder: url.searchParams.get("sortOrder") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error.flatten());

  const { page, limit, status, q, sortBy, sortOrder } = parsed.data;

  const where: Record<string, unknown> = { userId: auth.userId };
  if (status) where.status = status;
  if (q) {
    where.court = { name: { contains: q, mode: "insensitive" } };
  }

  const total = await prisma.booking.count({ where: where as never });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (page > totalPages) return success([], { meta: { page, limit, total, totalPages } });

  const data = await prisma.booking.findMany({
    where: where as never,
    orderBy: { [sortBy]: sortOrder },
    include: { court: true },
    skip: (page - 1) * limit,
    take: limit,
  });

  return success(data, { meta: { page, limit, total, totalPages } });
}
