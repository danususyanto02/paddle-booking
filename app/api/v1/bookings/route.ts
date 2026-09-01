import { prisma } from "@/lib/prisma";
import { success, error, validationError } from "@/lib/api/envelope";
import { createBookingSchema } from "@/lib/validations/booking";
import { calcTotal, PROCESSING_FEE } from "@/lib/pricing";
import { endTime, canFit, toMinutes } from "@/lib/slots";
import { requireAuth } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";
import { z } from "zod";

function bookingCode(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK-${d}-${rnd}`;
}

// GET /api/v1/bookings — admin list (AM0000009)
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  // RBAC: check feature active & permission (allow SUPER_ADMIN bypass inside guards helper)
  const { requireFeaturePermission } = await import("@/lib/rbac/guards");
  const guard = await requireFeaturePermission(req, "/dashboard/bookings", "AM0000009");
  if (guard instanceof Response) return guard;

  const url = new URL(req.url);
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
    q: z.string().trim().max(100).optional().default(""),
    sortBy: z.enum(["date", "createdAt", "total"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  });
  const parsed = schema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortOrder: url.searchParams.get("sortOrder") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error.flatten());
  const { page, limit, status, q, sortBy, sortOrder } = parsed.data;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) where.OR = [{ code: { contains: q, mode: "insensitive" } }, { start: { contains: q, mode: "insensitive" } }];
  const total = await prisma.booking.count({ where: where as never });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (page > totalPages) return success([], { meta: { page, limit, total, totalPages } });
  const data = await prisma.booking.findMany({ where: where as never, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit, include: { court: true, user: { select: { username: true, displayName: true } } } });
  return success(data, { meta: { page, limit, total, totalPages } });
}


// POST /api/v1/bookings — create mock booking (CONFIRMED directly)
export async function POST(req: Request) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const userId = auth.userId;

  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());

  const { courtId, date, slot, duration, paymentMethod } = parsed.data;

  // Validate canFit
  if (!canFit(slot, duration)) {
    return error("VALIDATION_ERROR", "Slot does not fit: exceeds closing time 22:00", { status: 422, details: { field: "slot", message: "Exceeds 22:00" } });
  }

  // Resolve court by id or code
  const court = await prisma.court.findFirst({ where: { OR: [{ id: courtId }, { code: courtId }], deletedAt: null } });
  if (!court) return error("NOT_FOUND", "Court not found", { status: 404 });
  if (court.status === "MAINTENANCE") return error("LOCKED", "Court is under maintenance", { status: 423 });

  const end = endTime(slot, duration);
  const slotStartMin = toMinutes(slot);
  const slotEndMin = toMinutes(end);
  const bookingDate = new Date(date);

  // Server recalculate price (do not trust client)
  const { courtFee, total } = calcTotal(court.pricePerHour, duration);

  // Transactional overlap check + create (prevent race)
  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Lock check: find overlapping bookings for same court+date (FOR SHARE via transaction isolation)
      const existing = await tx.booking.findMany({
        where: {
          courtId: court.id,
          date: bookingDate,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { start: true, end: true },
      });

      for (const b of existing) {
        const bStart = toMinutes(b.start);
        const bEnd = toMinutes(b.end);
        if (slotStartMin < bEnd && slotEndMin > bStart) {
          throw Object.assign(new Error("Slot conflict"), { code: "CONFLICT" as const });
        }
      }

      // Generate unique code (retry if collision unlikely)
      let code = bookingCode();
      for (let attempt = 0; attempt < 3; attempt++) {
        const dup = await tx.booking.findUnique({ where: { code } });
        if (!dup) break;
        code = bookingCode();
      }

      return tx.booking.create({
        data: {
          code,
          userId,
          courtId: court.id,
          date: bookingDate,
          start: slot,
          end,
          duration,
          courtFee,
          processingFee: PROCESSING_FEE,
          total,
          status: "CONFIRMED",
          paymentMethod: paymentMethod ?? "Mock",
        },
      });
    });

    return success(booking, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "CONFLICT") return error("CONFLICT", "Slot already booked", { status: 409 });
    if (err?.message?.includes("Unique constraint")) return error("CONFLICT", "Duplicate booking code, retry", { status: 409 });
    throw e;
  }
}
