import { prisma } from "@/lib/prisma";
import { refreshBodySchema } from "@/lib/auth/validation";
import { signAccessToken, generateRefreshToken, refreshExpiresAt } from "@/lib/auth/jwt";
import { error, success } from "@/lib/api/envelope";
import * as argon2 from "argon2";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return error("BAD_REQUEST", "Invalid JSON", { status: 400 }); }
  const parsed = refreshBodySchema.safeParse(body);
  if (!parsed.success) return error("UNAUTHENTICATED", "Invalid refresh token", { status: 401 });

  const raw = parsed.data.refreshToken;

  // Find by hash compare (refresh tokens stored as Argon2id hashes — need scan)
  // For small table this is OK; optimize with index if needed later.
  const candidates = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    take: 500,
  });

  let matched: (typeof candidates)[number] | null = null;
  for (const c of candidates) {
    try {
      if (await argon2.verify(c.tokenHash, raw)) { matched = c; break; }
    } catch { /* ignore */ }
  }

  if (!matched) return error("UNAUTHENTICATED", "Invalid refresh token", { status: 401 });

  // Check user still active
  const user = await prisma.user.findFirst({ where: { id: matched.userId, deletedAt: null } });
  if (!user || user.status !== "ACTIVE") return error("UNAUTHENTICATED", "Invalid refresh token", { status: 401 });

  // Atomic rotation: revoke old, create new
  const newRaw = generateRefreshToken();
  const newHash = await argon2.hash(newRaw, { type: argon2.argon2id });
  const newExpiresAt = refreshExpiresAt();

  try {
    await prisma.$transaction(async (tx) => {
      // Create replacement first (so we have its id)
      const created = await tx.refreshToken.create({
        data: { userId: user.id, tokenHash: newHash, expiresAt: newExpiresAt },
      });
      // Revoke old and link replacedBy
      await tx.refreshToken.update({
        where: { id: matched!.id },
        data: { revokedAt: new Date(), replacedByTokenId: created.id },
      });
    });
  } catch {
    return error("UNAUTHENTICATED", "Invalid refresh token", { status: 401 });
  }

  const { token: accessToken, exp } = signAccessToken(user.id, user.username);

  return success({
    accessToken,
    refreshToken: newRaw,
    tokenType: "Bearer",
    expiresIn: 900,
    expiresAt: new Date(exp * 1000).toISOString(),
  });
}
