import {z} from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const apiBookingSchema = z.object({
  hotelCode: z.string().trim().regex(/^\d+$/, "Hotelbeds hotel code is required"),
  hotelName: z.string().trim().min(1).max(240),
  city: z.string().trim().min(1).max(120),
  roomName: z.string().trim().max(240).optional(),
  boardName: z.string().trim().max(240).optional(),
  rateType: z.string().trim().max(40).optional(),
  rateKey: z.string().trim().min(20).max(1000),
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email().max(240),
  phone: z.string().trim().max(40).optional(),
  arrival: dateOnly,
  departure: dateOnly,
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
  childrenAges: z.array(z.coerce.number().int().min(0).max(17)).max(20).default([]),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  netAmount: z.coerce.number().finite().nonnegative().max(1_000_000),
  sellingAmount: z.coerce.number().finite().nonnegative().max(1_000_000).nullable().optional(),
  totalAmount: z.coerce.number().finite().nonnegative().max(1_000_000),
  paymentMode: z.enum(["PAY_NOW", "PAY_AT_HOTEL"]),
  cancellationPolicy: z.record(z.string(), z.unknown()).nullable().optional(),
}).superRefine((value, ctx) => {
  const arrival = new Date(`${value.arrival}T00:00:00.000Z`);
  const departure = new Date(`${value.departure}T00:00:00.000Z`);
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime()) || departure <= arrival) ctx.addIssue({code: "custom", path: ["departure"], message: "Departure must be after arrival"});
  if (value.childrenAges.length !== value.children) ctx.addIssue({code: "custom", path: ["childrenAges"], message: "Provide the age of every child"});
});

export type ApiBookingInput = z.infer<typeof apiBookingSchema>;
