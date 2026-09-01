import { z } from "zod";

export const courtTypeEnum = z.enum(["INDOOR", "OUTDOOR", "ROOFTOP", "COVERED"]);
export const courtStatusEnum = z.enum(["AVAILABLE", "MAINTENANCE", "OCCUPIED"]);

export const createCourtSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "code must be lowercase alphanumeric, hyphen, underscore"),
  name: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(120),
  type: courtTypeEnum,
  surface: z.string().trim().min(2).max(80),
  pricePerHour: z.number().int().min(10000).max(10_000_000),
  rating: z.number().min(0).max(5).optional().default(0),
  reviews: z.number().int().min(0).optional().default(0),
  badge: z.string().trim().max(30).nullable().optional(),
  amenities: z.array(z.string().trim().min(1)).max(10).optional().default([]),
  image: z.string().url().max(500),
  status: courtStatusEnum.optional().default("AVAILABLE"),
  sortOrder: z.number().int().optional().default(0),
});

export const updateCourtSchema = createCourtSchema.partial().omit({ code: true }).extend({
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9_-]+$/).optional(),
});

export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "ids must not be empty")
    .max(2000, "ids max 2000")
    .transform((arr) => [...new Set(arr.map((s) => s.trim()))].filter(Boolean)),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(100).optional().default(""),
  sortBy: z.enum(["name", "pricePerHour", "rating", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "OCCUPIED"]).optional(),
});
