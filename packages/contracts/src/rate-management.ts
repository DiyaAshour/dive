import {z} from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const weekday = z.number().int().min(0).max(6);
const money = z.number().finite().nonnegative().max(1_000_000);
const advanceDays = z.number().int().min(0).max(730);

export const rateAdjustmentSchema = z.discriminatedUnion("mode", [
  z.object({mode: z.literal("SET"), value: money}),
  z.object({mode: z.literal("ADD"), value: z.number().finite().min(-1_000_000).max(1_000_000)}),
  z.object({mode: z.literal("PERCENT"), value: z.number().finite().min(-100).max(1000)}),
]);

export const bulkCalendarUpdateRequestSchema = z.object({
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  from: dateOnly,
  to: dateOnly,
  weekdays: z.array(weekday).min(1).max(7).refine((values) => new Set(values).size === values.length, "Weekdays must be unique").default([0, 1, 2, 3, 4, 5, 6]),
  rate: rateAdjustmentSchema.optional(),
  available: z.number().int().min(0).max(10000).optional(),
  overbookingLimit: z.number().int().min(0).max(1000).optional(),
  minStay: z.number().int().min(1).max(365).optional(),
  maxStay: z.number().int().min(1).max(365).nullable().optional(),
  minAdvanceBookingDays: advanceDays.optional(),
  maxAdvanceBookingDays: advanceDays.nullable().optional(),
  closedToArrival: z.boolean().optional(),
  closedToDeparture: z.boolean().optional(),
  closed: z.boolean().optional(),
  stopSell: z.boolean().optional(),
}).superRefine((value, context) => {
  if (
    value.rate === undefined &&
    value.available === undefined &&
    value.overbookingLimit === undefined &&
    value.minStay === undefined &&
    value.maxStay === undefined &&
    value.minAdvanceBookingDays === undefined &&
    value.maxAdvanceBookingDays === undefined &&
    value.closedToArrival === undefined &&
    value.closedToDeparture === undefined &&
    value.closed === undefined &&
    value.stopSell === undefined
  ) {
    context.addIssue({code: "custom", message: "At least one calendar field must be changed"});
  }
  if (value.minStay !== undefined && value.maxStay !== undefined && value.maxStay !== null && value.maxStay < value.minStay) {
    context.addIssue({code: "custom", path: ["maxStay"], message: "maxStay cannot be lower than minStay"});
  }
  if (value.minAdvanceBookingDays !== undefined && value.maxAdvanceBookingDays !== undefined && value.maxAdvanceBookingDays !== null && value.maxAdvanceBookingDays < value.minAdvanceBookingDays) {
    context.addIssue({code: "custom", path: ["maxAdvanceBookingDays"], message: "maxAdvanceBookingDays cannot be lower than minAdvanceBookingDays"});
  }
});

export type BulkCalendarUpdateRequest = z.infer<typeof bulkCalendarUpdateRequestSchema>;
export type RateAdjustment = z.infer<typeof rateAdjustmentSchema>;
