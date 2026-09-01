import { prisma } from "../prisma";

export type AuditInput = {
  actorUserId?: string | null;
  actorUsername?: string | null;
  authMethod: "BEARER" | "COOKIE" | "NONE";
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceIds?: string[];
  permissionCode?: string | null;
  before?: unknown;
  after?: unknown;
  status: "SUCCESS" | "FAILED";
  errorCode?: string | null;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const safeBefore = redact(input.before);
    const safeAfter = redact(input.after);
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorUsername: input.actorUsername ?? null,
        authMethod: input.authMethod as never,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        requestId: input.requestId ?? null,
        action: input.action as never,
        resourceType: input.resourceType as never,
        resourceId: input.resourceId ?? null,
        resourceIds: input.resourceIds ?? [],
        permissionCode: input.permissionCode ?? null,
        before: safeBefore as never,
        after: safeAfter as never,
        status: input.status,
        errorCode: input.errorCode ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] write failed", e);
  }
}

function redact(v: unknown): unknown {
  if (v == null || typeof v !== "object") return v;
  const obj = v as Record<string, unknown>;
  const clone: Record<string, unknown> = { ...obj };
  for (const k of ["passwordHash", "password", "lockTokenHash", "lockToken", "x-api-key"]) {
    if (k in clone) clone[k] = "***REDACTED***";
  }
  return clone;
}
