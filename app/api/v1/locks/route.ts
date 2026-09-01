import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/rbac/guards";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const locks = await prisma.recordLock.findMany({ include: { ownerUser: { select: { username: true } } }, orderBy: { acquiredAt: "desc" }, take: 50 });
  return success(locks);
}
