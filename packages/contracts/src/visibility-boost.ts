import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid calendar date");
const countryCode = z.string().trim().length(2).transform((value) => value.toUpperCase());

export const visibilityBoostStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "FINISHED"]);
export const visibilityBoostGuestSegmentSchema = z.enum(["ALL", "COUPLES", "FAMILIES", "BUSINESS", "SOLO"]);

export const visibilityBoostCampaignSchema = z.object({
  name: z.string().trim().min(2).max(100),
  targetCountries: z.array(countryCode).min(1).max(120).transform((values) => [...new Set(values)]),
  bookingStartsOn: dateOnly,
  bookingEndsOn: dateOnly,
  stayStartsOn: dateOnly,
  stayEndsOn: dateOnly,
  extraCommissionPercent: z.coerce.number().min(1).max(10),
  guestSegment: visibilityBoostGuestSegmentSchema.default("ALL"),
  minimumNights: z.coerce.number().int().min(1).max(30).default(1),
  maximumNights: z.coerce.number().int().min(1).max(60).nullable().default(null),
  status: visibilityBoostStatusSchema.default("ACTIVE"),
}).superRefine((value, ctx) => {
  if (value.bookingEndsOn < value.bookingStartsOn) ctx.addIssue({code: "custom", path: ["bookingEndsOn"], message: "Booking end date must be on or after the start date"});
  if (value.stayEndsOn < value.stayStartsOn) ctx.addIssue({code: "custom", path: ["stayEndsOn"], message: "Stay end date must be on or after the start date"});
  if (value.maximumNights !== null && value.maximumNights < value.minimumNights) ctx.addIssue({code: "custom", path: ["maximumNights"], message: "Maximum nights cannot be lower than minimum nights"});
});

export type VisibilityBoostCampaignInput = z.infer<typeof visibilityBoostCampaignSchema>;
export type VisibilityBoostStatus = z.infer<typeof visibilityBoostStatusSchema>;
export type VisibilityBoostGuestSegment = z.infer<typeof visibilityBoostGuestSegmentSchema>;
