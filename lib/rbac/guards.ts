import { prisma } from "../prisma";
import { resolveUserFromRequest } from "../auth/session";
import { hasPermission, getEffectivePermissions } from "./effectivePermissions";
import { error } from "../api/envelope";

// Guards for Route Handlers — return Response on failure, null on success

export async function requireAuth(req: Request): Promise<{ userId: string; authMethod: "BEARER" | "COOKIE" } | Response> {
  const resolved = await resolveUserFromRequest(req);
  if (!resolved) return error("UNAUTHENTICATED", "Unauthorized", { status: 401 });
  // Block inactive users (spec: User INACTIVE -> 401 even with valid token)
  const user = await prisma.user.findFirst({ where: { id: resolved.userId, deletedAt: null } });
  if (!user || user.status !== "ACTIVE") return error("UNAUTHENTICATED", "Unauthorized", { status: 401 });
  return resolved;
}

export async function requirePermission(
  req: Request,
  code: string,
): Promise<{ userId: string } | Response> {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { isSuperAdmin, permissions } = await getEffectivePermissions(auth.userId);
  if (isSuperAdmin) return { userId: auth.userId };
  if (!permissions.has(code)) return error("FORBIDDEN", "Forbidden", { status: 403 });
  return { userId: auth.userId };
}

// Feature status gate: if feature is INACTIVE -> return 404 (hide existence), else proceed
export async function requireFeatureActive(route: string): Promise<Response | null> {
  const feature = await prisma.menuFeature.findFirst({ where: { route, deletedAt: null } });
  if (!feature) return null; // feature not in registry -> caller decides (no 404 for non-feature routes)
  if (feature.status === "INACTIVE") return error("NOT_FOUND", "Not found", { status: 404 });
  return null;
}

export async function requireFeaturePermission(
  req: Request,
  featureRoute: string,
  permissionCode: string,
): Promise<{ userId: string } | Response> {
  // Inactive feature -> 404 regardless of permission (spec)
  const inactive = await requireFeatureActive(featureRoute);
  if (inactive) return inactive;
  return requirePermission(req, permissionCode);
}
