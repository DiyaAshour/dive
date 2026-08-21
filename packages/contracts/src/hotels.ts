import { z } from "zod";

const money = z.number().finite().nonnegative().max(1_000_000);
const rate = z.number().finite().min(0).max(1);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const createHotelRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(100),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  address: z.string().trim().min(5).max(300),
  timezone: z.string().trim().min(3).max(80),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("JOD"),
});

export const createRoomTypeRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  maxAdults: z.number().int().min(1).max(20),
  maxChildren: z.number().int().min(0).max(20).default(0),
});

export const createRatePlanRequestSchema = z.object({
  roomTypeId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  refundable: z.boolean(),
  mealPlan: z.enum(["ROOM_ONLY", "BREAKFAST", "HALF_BOARD", "FULL_BOARD"]).default("ROOM_ONLY"),
});

export const updatePricingPolicyRequestSchema = z.object({
  serviceRate: rate,
  taxRate: rate,
});

export const calendarEntrySchema = z.object({
  date: dateOnly,
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  baseRate: money,
  available: z.number().int().min(0).max(10000),
  overbookingLimit: z.number().int().min(0).max(1000).default(0),
  minStay: z.number().int().min(1).max(365).default(1),
  maxStay: z.number().int().min(1).max(365).nullable().default(null),
  closed: z.boolean().default(false),
  stopSell: z.boolean().default(false),
});

export const upsertCalendarRequestSchema = z.object({
  entries: z.array(calendarEntrySchema).min(1).max(1000),
});

export type CreateHotelRequest = z.infer<typeof createHotelRequestSchema>;
export type CreateRoomTypeRequest = z.infer<typeof createRoomTypeRequestSchema>;
export type CreateRatePlanRequest = z.infer<typeof createRatePlanRequestSchema>;
export type UpsertCalendarRequest = z.infer<typeof upsertCalendarRequestSchema>;
