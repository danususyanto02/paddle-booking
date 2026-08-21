import * as argon2 from "argon2";
import { randomBytes } from "crypto";

export async function hashLockToken(token: string): Promise<string> {
  return argon2.hash(token, { type: argon2.argon2id });
}

export async function verifyLockToken(hash: string, token: string): Promise<boolean> {
  try { return await argon2.verify(hash, token); } catch { return false; }
}

export function generateLockToken(): string {
  return randomBytes(32).toString("hex");
}
