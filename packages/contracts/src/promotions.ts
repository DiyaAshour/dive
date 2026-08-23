import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const dateTime = z.string().datetime({offset: true});

export const createPromotionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/).transform((value) => value.toUpperCase()),
  discountPercent: z.coerce.number().gt(0).lte(80),
  bookingStartsAt: dateTime,
  bookingEndsAt: dateTime,
  stayStartsOn: dateOnly,
  stayEndsOn: dateOnly,
  minimumNights: z.coerce.number().int().min(1).max(60).default(1),
  ratePlanIds: z.array(z.string().min(1)).min(1).max(100),
}).superRefine((value, ctx) => {
  if (new Date(value.bookingEndsAt) <= new Date(value.bookingStartsAt)) ctx.addIssue({code: "custom", message: "bookingEndsAt must be after bookingStartsAt", path: ["bookingEndsAt"]});
  if (value.stayEndsOn < value.stayStartsOn) ctx.addIssue({code: "custom", message: "stayEndsOn must be on or after stayStartsOn", path: ["stayEndsOn"]});
});

export const updatePromotionStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionStatusInput = z.infer<typeof updatePromotionStatusSchema>;
