import { prisma } from "./prisma";

export async function isAdminUser(userId: string): Promise<boolean> {
  const direct = await prisma.userRole.findFirst({
    where: { userId, role: { name: { in: ["SUPER_ADMIN", "ADMIN"] }, status: "ACTIVE", deletedAt: null } },
    include: { role: true },
  });
  if (direct) return true;
  // Org-derived admin
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, organization: { status: "ACTIVE", deletedAt: null } },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length) {
    const orgRole = await prisma.organizationRole.findFirst({
      where: { organizationId: { in: orgIds }, role: { name: { in: ["SUPER_ADMIN", "ADMIN"] }, status: "ACTIVE", deletedAt: null } },
    });
    if (orgRole) return true;
  }
  // Inline: check SUPER_ADMIN via getAccess earlier; simpler fallback: if any role name is SUPER_ADMIN via userRole
  return false;
}

// Helper for server pages
export async function resolveUserIdFromHeaders(): Promise<string | null> {
  const { getSessionUserId, resolveUserFromRequest } = await import("./auth/session");
  const fromCookie = await getSessionUserId();
  if (fromCookie) return fromCookie;
  const { headers } = await import("next/headers");
  const hdrs = await headers();
  const auth = hdrs.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const { verifyAccessToken } = await import("./auth/jwt");
    const v = verifyAccessToken(auth.slice(7).trim());
    if (v.ok) return v.claims.sub;
  }
  return null;
}
