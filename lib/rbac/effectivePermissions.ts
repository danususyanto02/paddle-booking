import { prisma } from "../prisma";

/**
 * Effective permissions helper — single responsibility extracted from lib/auth/session.ts:getAccessData
 * for reuse in middleware / RBAC guards without coupling to session shape.
 * Spec: union direct UserRole + OrganizationMember→OrganizationRole, filter ACTIVE only,
 * SUPER_ADMIN bypass returns all perms, MenuFeature INACTIVE = hidden (404) semantics handled by caller.
 */

export async function getEffectivePermissions(userId: string): Promise<{
  isSuperAdmin: boolean;
  permissions: Set<string>;
  roles: string[];
}> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user || user.status !== "ACTIVE") return { isSuperAdmin: false, permissions: new Set(), roles: [] };

  const directRoles = await prisma.userRole.findMany({ where: { userId }, include: { role: true } });
  const orgMemberships = await prisma.organizationMember.findMany({
    where: { userId, organization: { status: "ACTIVE", deletedAt: null } },
    include: { organization: true },
  });
  const orgIds = orgMemberships.map((m) => m.organizationId);
  const orgRoles = orgIds.length
    ? await prisma.organizationRole.findMany({
        where: { organizationId: { in: orgIds }, role: { status: "ACTIVE", deletedAt: null } },
        include: { role: true },
      })
    : [];

  const isSuperAdmin = [...directRoles, ...orgRoles].some((r) => (r as { role: { name: string } }).role.name === "SUPER_ADMIN");
  if (isSuperAdmin) {
    const all = await prisma.permission.findMany({ select: { code: true } });
    return { isSuperAdmin: true, permissions: new Set(all.map((p) => p.code)), roles: [...new Set([...directRoles.map((r) => r.role.name), ...orgRoles.map((r) => r.role.name)])] };
  }

  const roleIds = new Set<string>();
  for (const ur of directRoles) if (ur.role.status === "ACTIVE" && !ur.role.deletedAt) roleIds.add(ur.roleId);
  for (const or of orgRoles) if (or.role.status === "ACTIVE" && !or.role.deletedAt) roleIds.add(or.roleId);

  if (!roleIds.size) return { isSuperAdmin: false, permissions: new Set(), roles: [...new Set([...directRoles.map((r) => r.role.name), ...orgRoles.map((r) => r.role.name)])] };

  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId: { in: [...roleIds] } },
    include: { permission: { include: { feature: true } } },
  });

  const perms = new Set<string>();
  for (const rp of rolePerms) {
    const p = rp.permission;
    if (!p.feature || p.feature.deletedAt || p.feature.status !== "ACTIVE") continue;
    perms.add(p.code);
  }

  return { isSuperAdmin, permissions: perms, roles: [...new Set([...directRoles.map((r) => r.role.name), ...orgRoles.map((r) => r.role.name)])] };
}

export async function hasPermission(userId: string, code: string): Promise<boolean> {
  const { isSuperAdmin, permissions } = await getEffectivePermissions(userId);
  if (isSuperAdmin) return true;
  return permissions.has(code);
}

export async function requirePermissionOrThrow(userId: string, code: string): Promise<void> {
  const ok = await hasPermission(userId, code);
  if (!ok) {
    const err = new Error(`Missing permission ${code}`) as Error & { code: string; status: number };
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }
}
