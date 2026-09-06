import { describe, it, expect, vi } from "vitest";
import { writeAuditLog } from "../../lib/audit/writeAuditLog";

vi.mock("../../lib/prisma", () => ({
  prisma: { auditLog: { create: vi.fn(async () => ({})) } },
}));

import { prisma } from "../../lib/prisma";

describe("writeAuditLog", () => {
  it("redacts sensitive fields and writes the row", async () => {
    await writeAuditLog({
      actorUserId: "u1",
      actorUsername: "superadmin",
      authMethod: "COOKIE",
      ip: "127.0.0.1",
      userAgent: "vitest",
      requestId: "r1",
      action: "LOCK_ACQUIRE",
      resourceType: "COURT",
      resourceId: "c1",
      before: { passwordHash: "secret", lockTokenHash: "tok", name: "x" },
      after: { lockToken: "plain-once", ok: true },
      status: "SUCCESS",
      errorCode: null,
    });
    const create = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
    expect(create).toHaveBeenCalledOnce();
    const data = create.mock.calls[0][0].data;
    expect(data.action).toBe("LOCK_ACQUIRE");
    expect(data.before).toMatchObject({ passwordHash: "***REDACTED***", lockTokenHash: "***REDACTED***", name: "x" });
    expect(data.after).toMatchObject({ lockToken: "***REDACTED***", ok: true });
  });

  it("never throws when db write fails", async () => {
    const create = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
    create.mockRejectedValueOnce(new Error("db down"));
    await expect(
      writeAuditLog({
        authMethod: "NONE",
        action: "CREATE",
        resourceType: "BOOKING",
        status: "FAILED",
        errorCode: "CONFLICT",
      }),
    ).resolves.toBeUndefined();
  });
});
