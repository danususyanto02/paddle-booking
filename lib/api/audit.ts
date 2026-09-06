import { resolveUserFromRequest } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/writeAuditLog";

/**
 * Audit helper — call AFTER the business transaction commits (spec: Epic E8 T31).
 * Best-effort: never throws, never blocks the response. Sensitive fields are
 * redacted inside writeAuditLog (passwordHash, lockTokenHash, ...).
 */
export async function audit(
  req: Request,
  input: {
    action:
      | "CREATE"
      | "UPDATE"
      | "DELETE"
      | "ROLE_ASSIGN"
      | "PERMISSION_ASSIGN"
      | "MEMBER_ASSIGN"
      | "LOCK_ACQUIRE"
      | "LOCK_HEARTBEAT"
      | "LOCK_RELEASE"
      | "LOCK_FORCE";
    resourceType:
      | "USER"
      | "ROLE"
      | "ORGANIZATION"
      | "FEATURE"
      | "ORGANIZATION_ROLE"
      | "ORGANIZATION_MEMBER"
      | "USER_ROLE"
      | "ROLE_PERMISSION"
      | "LOCK"
      | "AUDIT_LOG"
      | "COURT"
      | "BOOKING";
    resourceId?: string | null;
    permissionCode?: string | null;
    before?: unknown;
    after?: unknown;
    status?: "SUCCESS" | "FAILED";
    errorCode?: string | null;
  },
): Promise<void> {
  const resolved = await resolveUserFromRequest(req).catch(() => null);
  const actor = resolved
    ? await import("@/lib/prisma").then((m) =>
        m.prisma.user.findUnique({
          where: { id: resolved.userId },
          select: { id: true, username: true },
        }),
      ).catch(() => null)
    : null;

  const headers = req.headers;
  await writeAuditLog({
    actorUserId: actor?.id ?? resolved?.userId ?? null,
    actorUsername: actor?.username ?? null,
    authMethod: resolved?.authMethod ?? "NONE",
    ip: headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headers.get("user-agent"),
    requestId: headers.get("x-request-id"),
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    permissionCode: input.permissionCode ?? null,
    before: input.before,
    after: input.after,
    status: input.status ?? "SUCCESS",
    errorCode: input.errorCode ?? null,
  });
}
