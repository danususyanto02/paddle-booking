import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const booking = await prisma.booking.findFirst({ where: { OR: [{ id }, { code: id }] } });
  if (!booking) return error("NOT_FOUND", "Booking not found", { status: 404 });

  const { getEffectivePermissions } = await import("@/lib/rbac/effectivePermissions");
  const { isSuperAdmin } = await getEffectivePermissions(auth.userId);
  if (booking.userId !== auth.userId && !isSuperAdmin) return error("FORBIDDEN", "Forbidden", { status: 403 });

  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return error("VALIDATION_ERROR", "Booking already cancelled or completed", { status: 422 });
  }

  // 24h policy: if slot is within 24h, deny (optional — spec says optional)
  // For now allow any time; uncomment to enforce:
  // const slotStart = new Date(booking.date.toISOString().slice(0, 10) + "T" + booking.start + ":00");
  // if (slotStart.getTime() - Date.now() < 24 * 3600 * 1000) return error("VALIDATION_ERROR", "Cannot cancel within 24 hours", { status: 422 });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
    include: { court: true },
  });

  return success(updated);
}
