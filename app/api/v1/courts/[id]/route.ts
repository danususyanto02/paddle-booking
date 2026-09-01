import { prisma } from "@/lib/prisma";
import { success, error, validationError } from "@/lib/api/envelope";
import { updateCourtSchema } from "@/lib/validations/court";
import { requireFeaturePermission } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/courts/:id — public read, 404 if soft-deleted or feature inactive
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const feature = await prisma.menuFeature.findFirst({ where: { route: "/dashboard/courts", deletedAt: null } });
  if (feature?.status === "INACTIVE") return error("NOT_FOUND", "Not found", { status: 404 });

  const court = await prisma.court.findFirst({ where: { id, deletedAt: null } });
  if (!court) return error("NOT_FOUND", "Not found", { status: 404 });
  return success(court);
}

// PATCH /api/v1/courts/:id — ED0000008
export async function PATCH(req: Request, { params }: Params) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const guard = await requireFeaturePermission(req, "/dashboard/courts", "ED0000008");
  if (guard instanceof Response) return guard;

  const { id } = await params;

  const existing = await prisma.court.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return error("NOT_FOUND", "Not found", { status: 404 });

  // Record locking per-item check (if enabled globally + per-feature)
  const lock = await checkLock("COURT", id, req);
  if (lock) return lock;

  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }
  const parsed = updateCourtSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());

  // If code change requested, ensure uniqueness (non-deleted)
  if (parsed.data.code && parsed.data.code !== existing.code) {
    const dup = await prisma.court.findFirst({ where: { code: parsed.data.code, deletedAt: null } });
    if (dup) return error("CONFLICT", "Court code already taken", { status: 409 });
  }

  const updated = await prisma.court.update({
    where: { id },
    data: parsed.data as never,
  });

  return success(updated);
}

async function checkLock(resourceType: string, resourceId: string, req: Request) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "recordLockEnabled" } });
  const globalEnabled = (setting?.value as boolean) ?? true;
  if (!globalEnabled) return null;

  // Per-feature flag: courts feature
  const feature = await prisma.menuFeature.findFirst({ where: { route: "/dashboard/courts", deletedAt: null } });
  if (feature && !feature.recordLockEnabled) return null;

  const token = req.headers.get("x-record-lock-token");
  const lock = await prisma.recordLock.findUnique({
    where: { resourceType_resourceId: { resourceType: resourceType as never, resourceId } },
    include: { ownerUser: { select: { id: true, username: true } } },
  });
  if (!lock) return null;
  if (lock.expiresAt < new Date()) return null; // expired -> treat as unlocked

  // If token matches owner, allow
  if (token) {
    const { verifyLockToken } = await import("@/lib/locks/token");
    const ok = await verifyLockToken(lock.lockTokenHash, token);
    if (ok) return null;
  }

  // Owned by someone else or no valid token
  return error("LOCKED", "Resource is locked by another user", {
    status: 423,
    details: { owner: { id: lock.ownerUser.id, username: lock.ownerUser.username }, expiresAt: lock.expiresAt },
  });
}
