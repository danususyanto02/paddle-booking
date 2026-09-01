import { prisma } from "@/lib/prisma";
import { success, error, validationError } from "@/lib/api/envelope";
import { requireFeaturePermission } from "@/lib/rbac/guards";
import { z } from "zod";

const roleBody = z.object({ roles: z.array(z.string().trim().min(1)).min(1).max(10) });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeaturePermission(req, "/dashboard/users", "AM0000001");
  if (guard instanceof Response) return guard;
  const { id } = await params;
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, include: { userRoles: { include: { role: true } } } });
  if (!user) return error("NOT_FOUND", "User not found", { status: 404 });
  return success({ id: user.id, username: user.username, displayName: user.displayName, email: user.email, status: user.status, isSystem: user.isSystem, roles: user.userRoles.map((ur) => ur.role.name) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeaturePermission(req, "/dashboard/users", "ED0000001");
  if (guard instanceof Response) return guard;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = roleBody.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());

  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) return error("NOT_FOUND", "User not found", { status: 404 });
  if (user.isSystem) return error("FORBIDDEN", "Cannot change roles of system user", { status: 403 });

  // Resolve roles by name (case-sensitive, only ACTIVE)
  const roleNames = [...new Set(parsed.data.roles)];
  const roles = await prisma.role.findMany({ where: { name: { in: roleNames }, deletedAt: null } });
  const found = new Set(roles.map((r) => r.name));
  const missing = roleNames.filter((n) => !found.has(n));
  if (missing.length) return error("NOT_FOUND", `Roles not found: ${missing.join(", ")}`, { status: 404 });
  const inactive = roles.filter((r) => r.status !== "ACTIVE").map((r) => r.name);
  if (inactive.length) return error("FORBIDDEN", `Roles inactive: ${inactive.join(", ")}`, { status: 403 });

  // Prevent removing last SUPER_ADMIN: ensure at least one remains if target currently SUPER_ADMIN and new set lacks it
  const hadSuper = (await prisma.userRole.findFirst({ where: { userId: id, role: { name: "SUPER_ADMIN" } } })) != null;
  const willHaveSuper = roleNames.includes("SUPER_ADMIN");
  if (hadSuper && !willHaveSuper) {
    const countSuper = await prisma.userRole.count({ where: { role: { name: "SUPER_ADMIN" } } });
    if (countSuper <= 1) return error("FORBIDDEN", "Cannot remove last SUPER_ADMIN", { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId: id } });
    await tx.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });
  });

  return success({ id, roles: roleNames });
}
