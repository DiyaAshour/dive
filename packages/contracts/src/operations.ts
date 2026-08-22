import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid calendar date");
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm time");

export const expectedArrivalInputSchema = z.object({
  expectedArrivalTime: localTime.nullable(),
});

export const staffArrivalInputSchema = z.object({
  expectedArrivalTime: localTime.nullable().optional(),
  arrivalStatus: z.enum(["NOT_PROVIDED", "EXPECTED", "ARRIVED"]).optional(),
}).refine((value) => value.expectedArrivalTime !== undefined || value.arrivalStatus !== undefined, {
  message: "Provide an arrival time or arrival status",
});

export const createGuestRequestSchema = z.object({
  category: z.enum(["ARRIVAL", "BEDDING", "ACCESSIBILITY", "TRANSPORT", "OTHER"]),
  message: z.string().trim().min(2).max(2000),
});

export const updateGuestRequestStatusSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
});

export const frontDeskNoteInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const hotelReservationQuerySchema = z.object({
  date: dateOnly,
  scope: z.enum(["ARRIVALS", "DEPARTURES", "IN_HOUSE", "ALL"]).default("ALL"),
});

export type ExpectedArrivalInput = z.infer<typeof expectedArrivalInputSchema>;
export type StaffArrivalInput = z.infer<typeof staffArrivalInputSchema>;
export type CreateGuestRequestInput = z.infer<typeof createGuestRequestSchema>;
export type UpdateGuestRequestStatusInput = z.infer<typeof updateGuestRequestStatusSchema>;
export type FrontDeskNoteInput = z.infer<typeof frontDeskNoteInputSchema>;
export type HotelReservationQuery = z.infer<typeof hotelReservationQuerySchema>;
