import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";
import { getEffectivePermissions } from "@/lib/rbac/effectivePermissions";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { isSuperAdmin, permissions } = await getEffectivePermissions(auth.userId);
  const needed = ["AM0000008", "AM0000009", "AM0000010", "AM0000011"];
  const hasAdmin = isSuperAdmin || needed.some((c) => permissions.has(c));
  if (!hasAdmin) return success({ revenue: 0, activeMembers: 0, todayBookings: 0, pending: 0, activities: [], weekly: Array(7).fill(0) });

  const bookings = await prisma.booking.findMany({ include: { court: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const revenue = bookings.reduce((s, b) => s + (b.status === "CANCELLED" ? 0 : b.total), 0);
  // Active members = count of users with status ACTIVE and not system; fallback to Booking distinct userIds + member mock not yet separate
  const activeMembers = await prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } });
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.date.toISOString().slice(0, 10) === todayStr).length;
  const pending = bookings.filter((b) => b.status === "CONFIRMED").length;
  const activities = bookings.slice(0, 4);
  const counts = Array(7).fill(0) as number[];
  bookings.forEach((b) => {
    const d = new Date(b.date.toISOString().slice(0, 10) + "T12:00:00");
    let wd = d.getDay();
    wd = wd === 0 ? 6 : wd - 1;
    (counts[wd] as number)++;
  });

  return success({ revenue, activeMembers, todayBookings, pending, activities, weekly: counts });
}
