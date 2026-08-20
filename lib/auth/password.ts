import * as argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Zod-compatible password rule: 8-128, at least 1 letter and 1 number
export function isValidPassword(plain: string): boolean {
  if (plain.length < 8 || plain.length > 128) return false;
  return /[A-Za-z]/.test(plain) && /[0-9]/.test(plain);
}

export const passwordSchemaMessage = "Password must be 8-128 chars and contain at least 1 letter and 1 number";
