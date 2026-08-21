import { prisma } from "@/lib/prisma";
import { success, error, validationError } from "@/lib/api/envelope";
import { bulkDeleteSchema } from "@/lib/validations/court";
import { requireFeaturePermission } from "@/lib/rbac/guards";
import { assertCsrf } from "@/lib/api/auth-helpers";

// POST /api/v1/courts/delete — bulk soft-delete — DD0000008
// Body: { ids: string[] } max 2000, deduped, partial success 200

export async function POST(req: Request) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const guard = await requireFeaturePermission(req, "/dashboard/courts", "DD0000008");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());

  const ids = parsed.data.ids; // already deduped & trimmed
  if (ids.length === 0) return validationError({ formErrors: ["ids must not be empty"], fieldErrors: {} });
  if (ids.length > 2000) return validationError({ formErrors: ["ids max 2000"], fieldErrors: {} });

  // Per spec: partial success — each id independently; overall HTTP 200 unless whole-request error
  const results: Array<{ id: string; status: "deleted" | "failed"; error?: { code: string; message: string } }> = [];

  // Need to check locks globally
  const setting = await prisma.systemSetting.findUnique({ where: { key: "recordLockEnabled" } });
  const globalEnabled = (setting?.value as boolean) ?? true;
  const feature = await prisma.menuFeature.findFirst({ where: { route: "/dashboard/courts", deletedAt: null } });
  const lockEnabled = globalEnabled && (feature ? feature.recordLockEnabled : true);

  // Resolve auth user for lock ownership check (extract from guards helper path)
  const { resolveUserFromRequest } = await import("@/lib/auth/session");
  const resolved = await resolveUserFromRequest(req);
  const callerUserId = resolved?.userId ?? null;
  const lockToken = req.headers.get("x-record-lock-token");

  for (const id of ids) {
    // Validate cuid-like (simple check: 20+ chars; Prisma cuid is ~25)
    // Zod already ensures string min 1; we treat invalid id as NOT_FOUND
    const existing = await prisma.court.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      results.push({ id, status: "failed", error: { code: "NOT_FOUND", message: "Not found" } });
      continue;
    }

    // Lock check per id
    if (lockEnabled) {
      const lock = await prisma.recordLock.findUnique({
        where: { resourceType_resourceId: { resourceType: "COURT" as never, resourceId: id } },
        include: { ownerUser: { select: { id: true, username: true } } },
      });
      if (lock && lock.expiresAt > new Date()) {
        // If caller owns lock and token matches, allow
        let allow = false;
        if (callerUserId && lock.ownerUserId === callerUserId && lockToken) {
          const { verifyLockToken } = await import("@/lib/locks/token");
          if (await verifyLockToken(lock.lockTokenHash, lockToken)) allow = true;
        }
        // If owned by self without token -> still block (spec: requires valid token)
        if (!allow) {
          results.push({ id, status: "failed", error: { code: "LOCKED", message: "Resource is locked by another user" } });
          continue;
        }
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.court.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            code: `${existing.code}_deleted_${id}`,
          },
        });
      });
      results.push({ id, status: "deleted" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      if (msg.includes("Unique constraint") || msg.includes("unique")) {
        results.push({ id, status: "failed", error: { code: "CONFLICT", message: msg } });
      } else {
        results.push({ id, status: "failed", error: { code: "NOT_FOUND", message: msg } });
      }
    }
  }

  // Audit: one row per bulk request will be added in T31 writeAuditLog; for now no-op

  return success(results);
}
