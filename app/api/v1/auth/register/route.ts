import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { registerBodySchema } from "@/lib/auth/validation";
import { hashPassword } from "@/lib/auth/password";
import { error, success, validationError } from "@/lib/api/envelope";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }

  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());

  // Flag check BEFORE any DB write (spec: default false)
  let env: ReturnType<typeof getEnv>;
  try { env = getEnv(); } catch { return error("INTERNAL_ERROR", "Server misconfigured", { status: 500 }); }
  if (!env.PUBLIC_REGISTRATION_ENABLED) {
    return error("FORBIDDEN", "Registration is disabled", { status: 403 });
  }

  const { username, password, displayName, email } = parsed.data;

  // Uniqueness check (case-sensitive, spec: no citext)
  const existing = await prisma.user.findFirst({ where: { username, deletedAt: null } });
  if (existing) return error("CONFLICT", "Username already taken", { status: 409, details: [{ field: "username", message: "Already taken" }] });

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { username, passwordHash, displayName: displayName ?? null, email: email ?? null, status: "ACTIVE" },
      });
      // Default USER role assignment (spec: public registration -> default USER)
      const userRole = await tx.role.findFirst({ where: { name: "USER", deletedAt: null } });
      if (userRole) {
        await tx.userRole.create({ data: { userId: u.id, roleId: userRole.id } });
      }
      return u;
    });

    return success({ id: user.id, username: user.username, displayName: user.displayName }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) return error("CONFLICT", "Username already taken", { status: 409 });
    throw e;
  }
}
