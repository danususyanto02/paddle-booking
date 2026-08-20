import { z } from "zod";
import { isValidPassword, passwordSchemaMessage } from "./password";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be 3-32 chars")
  .max(32, "Username must be 3-32 chars")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, digits, _, ., -");

export const passwordSchema = z
  .string()
  .min(8, passwordSchemaMessage)
  .max(128, passwordSchemaMessage)
  .refine((v) => isValidPassword(v), { message: passwordSchemaMessage });

// For request validation; keep write-only (never echo password back in errors)
export const registerBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  displayName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(255).optional().or(z.literal("").transform(() => undefined)),
});

export const loginBodySchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});
