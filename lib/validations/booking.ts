import { z } from "zod";

export const createBookingSchema = z.object({
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  slot: z.string().regex(/^\d{2}:\d{2}$/, "slot must be HH:mm"),
  duration: z.number().int().refine((v) => [60, 90, 120].includes(v), { message: "duration must be 60, 90, or 120" }),
  paymentMethod: z.string().trim().min(1).max(40).optional().default("Bank Transfer"),
});

export const bookingIdSchema = z.string().min(1);
