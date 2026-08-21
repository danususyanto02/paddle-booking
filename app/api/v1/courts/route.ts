import { prisma } from "@/lib/prisma";
import { success, error, validationError } from "@/lib/api/envelope";
import { createCourtSchema, listQuerySchema } from "@/lib/validations/court";
import { requireFeaturePermission } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";

// GET /api/v1/courts — public read (but if inactive feature, 404)
// No auth required for public listing; admin filtering via same endpoint (auth optional)
// For now: if Authorization/cookie present and feature inactive -> 404 handled; otherwise public 200 with deletedAt filter
export async function GET(req: Request) {
  // 404 if Courts feature is INACTIVE (hide existence)
  const feature = await prisma.menuFeature.findFirst({ where: { route: "/dashboard/courts", deletedAt: null } });
  if (feature?.status === "INACTIVE") return error("NOT_FOUND", "Not found", { status: 404 });

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortOrder: url.searchParams.get("sortOrder") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error.flatten());

  const { page, limit, q, sortBy, sortOrder, status } = parsed.data;

  const where: Record<string, unknown> = { deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const total = await prisma.court.count({ where: where as never });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Out-of-range page -> data: [] with correct meta (spec)
  if (page > totalPages) {
    return success([], { meta: { page, limit, total, totalPages } });
  }

  const data = await prisma.court.findMany({
    where: where as never,
    orderBy: { [sortBy]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
  });

  return success(data, { meta: { page, limit, total, totalPages } });
}

// POST /api/v1/courts — create — AD0000008
export async function POST(req: Request) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const guard = await requireFeaturePermission(req, "/dashboard/courts", "AD0000008");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }
  const parsed = createCourtSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());

  // Unique code check (only non-deleted — deleted rows have suffix)
  const existing = await prisma.court.findFirst({ where: { code: parsed.data.code, deletedAt: null } });
  if (existing) return error("CONFLICT", "Court code already taken", { status: 409 });

  const court = await prisma.court.create({ data: parsed.data as never });

  // Audit: best-effort after commit (T31); for now no-op (will add writeAuditLog later)
  return success(court, { status: 201 });
}
