import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createCarCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100),
  countryCode: z.string().trim().length(2).default("JO"),
  address: z.string().trim().min(4).max(240),
  timezone: z.string().trim().min(3).max(80).optional(),
  currency: z.string().trim().length(3).optional(),
  supportEmail: z.string().trim().email().optional(),
  supportPhone: z.string().trim().min(6).max(40).optional(),
});

export const createCarVehicleSchema = z.object({
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(100),
  year: z.number().int().min(1990).max(new Date().getUTCFullYear() + 1),
  category: z.string().trim().min(2).max(60),
  transmission: z.enum(["AUTOMATIC", "MANUAL"]),
  fuel: z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]),
  seats: z.number().int().min(1).max(16),
  bags: z.number().int().min(0).max(12).optional(),
  doors: z.number().int().min(2).max(6).optional(),
  dailyPrice: z.number().positive().max(10000),
  deposit: z.number().positive().max(100000),
  freeCancellation: z.boolean().optional(),
  unlimitedMileage: z.boolean().optional(),
  airportPickup: z.boolean().optional(),
  imageUrl: z.string().trim().url().optional(),
  imageAlt: z.string().trim().max(180).optional(),
  homeLocationId: z.string().trim().min(1).optional(),
});

export const createCarLocationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(4).max(240),
  airportCode: z.string().trim().length(3).optional(),
});

export const createCarReservationSchema = z.object({
  vehicleId: z.string().trim().min(1),
  pickupDate: z.string().regex(datePattern),
  pickupTime: z.string().regex(timePattern),
  returnDate: z.string().regex(datePattern),
  returnTime: z.string().regex(timePattern),
  driverAgeRange: z.string().trim().min(2).max(20),
  guestName: z.string().trim().min(2).max(140),
  guestEmail: z.string().trim().email().max(180),
  guestPhone: z.string().trim().min(6).max(40).optional(),
  pickupLocationId: z.string().trim().min(1).optional(),
  returnLocationId: z.string().trim().min(1).optional(),
});

export type CreateCarCompanyInput = z.infer<typeof createCarCompanySchema>;
export type CreateCarVehicleInput = z.infer<typeof createCarVehicleSchema>;
export type CreateCarLocationInput = z.infer<typeof createCarLocationSchema>;
export type CreateCarReservationInput = z.infer<typeof createCarReservationSchema>;
