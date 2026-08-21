import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";

// GET /api/v1/bookings/:id or :code — owner or admin (SUPER_ADMIN bypass)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: { OR: [{ id }, { code: id }] },
    include: { court: true },
  });
  if (!booking) return error("NOT_FOUND", "Booking not found", { status: 404 });

  // Owner check or SUPER_ADMIN
  const { getEffectivePermissions } = await import("@/lib/rbac/effectivePermissions");
  const { isSuperAdmin } = await getEffectivePermissions(auth.userId);
  if (booking.userId !== auth.userId && !isSuperAdmin) {
    return error("FORBIDDEN", "Forbidden", { status: 403 });
  }

  return success(booking);
}
