import { prisma } from "@/lib/prisma";
import { success, error, validationError } from "@/lib/api/envelope";
import { z } from "zod";
import { SLOT_STARTS, periodOf, toMinutes, canFit } from "@/lib/slots";

const querySchema = z.object({
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  duration: z.coerce.number().int().min(30).max(240).optional().default(60),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    courtId: url.searchParams.get("courtId") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    duration: url.searchParams.get("duration") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error.flatten());

  const { courtId, date, duration } = parsed.data;

  // Resolve court by id or code
  const court = await prisma.court.findFirst({ where: { OR: [{ id: courtId }, { code: courtId }], deletedAt: null } });
  if (!court) return error("NOT_FOUND", "Court not found", { status: 404 });

  const bookings = await prisma.booking.findMany({
    where: {
      courtId: court.id,
      date: new Date(date),
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { start: true, end: true },
  });

  // Build occupied Set via overlap: slot [s, s+duration) overlaps existing [b.start, b.end)
  const occupiedSet = new Set<string>();

  // Pre-compute existing intervals in minutes
  const existingIntervals = bookings.map((b) => ({ startMin: toMinutes(b.start), endMin: toMinutes(b.end) }));

  for (const start of SLOT_STARTS) {
    const sMin = toMinutes(start);
    const eMin = sMin + duration;
    // First check canFit (exceeds 22:00) — still return but marked not fittable via canFit field; occupied false but canFit false
    // Overlap check:
    let occupied = false;
    for (const ex of existingIntervals) {
      if (sMin < ex.endMin && eMin > ex.startMin) {
        occupied = true;
        break;
      }
    }
    if (occupied) occupiedSet.add(start);
  }

  const data = SLOT_STARTS.map((start) => ({
    start,
    period: periodOf(start) as string,
    occupied: occupiedSet.has(start),
    canFit: canFit(start, duration),
  }));

  return success(data);
}
