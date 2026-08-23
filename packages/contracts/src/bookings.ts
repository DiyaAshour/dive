import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const staySelection = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  arrival: dateOnly,
  departure: dateOnly,
});

export const bookingQuoteSchema = staySelection;

export const createBookingHoldSchema = staySelection.extend({
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  paymentMode: z.enum(["PAY_NOW", "PAY_AT_HOTEL"]),
});

export const modifyBookingSchema = z.object({
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  arrival: dateOnly,
  departure: dateOnly,
});

export const createRefundSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  reason: z.string().trim().min(3).max(500),
  externalReference: z.string().trim().max(120).optional(),
});

export const initiatePaymentSchema = z.object({
  returnUrl: z.string().url().max(2000),
});

export const idempotencyKeySchema = z.string().trim().min(8).max(128);
export const bookingAccessTokenSchema = z.string().trim().min(32).max(256);

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;
export type CreateBookingHoldInput = z.infer<typeof createBookingHoldSchema>;
export type ModifyBookingInput = z.infer<typeof modifyBookingSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
