import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid calendar date");

export const saveSearchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  destination: z.string().trim().min(2).max(120),
  arrival: dateOnly,
  departure: dateOnly,
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
  filters: z.record(z.string(), z.json()).default({}),
}).refine((value) => value.departure > value.arrival, {message: "Departure must be after arrival", path: ["departure"]});

export const createPriceWatchSchema = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().min(1).optional(),
  arrival: dateOnly,
  departure: dateOnly,
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
  targetTotal: z.coerce.number().positive().max(1_000_000).optional(),
}).refine((value) => value.departure > value.arrival, {message: "Departure must be after arrival", path: ["departure"]});

export const hotelPerformanceQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
});

export type SaveSearchInput = z.infer<typeof saveSearchSchema>;
export type CreatePriceWatchInput = z.infer<typeof createPriceWatchSchema>;
export type HotelPerformanceQuery = z.infer<typeof hotelPerformanceQuerySchema>;
