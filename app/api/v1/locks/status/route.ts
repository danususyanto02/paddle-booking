import { prisma } from "@/lib/prisma";
import { success, validationError } from "@/lib/api/envelope";
import { z } from "zod";

const qs = z.object({ resourceType: z.string().min(1), resourceId: z.string().min(1) });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = qs.safeParse({ resourceType: url.searchParams.get("resourceType") ?? undefined, resourceId: url.searchParams.get("resourceId") ?? undefined });
  if (!parsed.success) return validationError(parsed.error.flatten());
  const { resourceType, resourceId } = parsed.data;
  const lock = await prisma.recordLock.findUnique({ where: { resourceType_resourceId: { resourceType: resourceType as never, resourceId } }, include: { ownerUser: { select: { id: true, username: true } } } });
  if (!lock || lock.expiresAt < new Date()) return success({ locked: false });
  return success({ locked: true, owner: { id: lock.ownerUser.id, username: lock.ownerUser.username }, expiresAt: lock.expiresAt });
}
