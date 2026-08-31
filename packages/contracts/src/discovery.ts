import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const publicStaySchema = z.object({
  arrival: dateOnly,
  departure: dateOnly,
  adults: z.coerce.number().int().min(1).max(20).default(2),
  children: z.coerce.number().int().min(0).max(20).default(0),
}).superRefine((value, ctx) => {
  const arrival = new Date(`${value.arrival}T00:00:00.000Z`);
  const departure = new Date(`${value.departure}T00:00:00.000Z`);
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime()) || departure <= arrival) {
    ctx.addIssue({code: "custom", path: ["departure"], message: "Departure must be after arrival"});
  }
});

export const discoverySortSchema = z.enum(["RECOMMENDED", "PRICE_ASC", "PRICE_DESC", "STARS_DESC", "RATING_DESC"]);

export const discoverySearchSchema = publicStaySchema.safeExtend({
  destination: z.string().trim().min(1).max(120),
  minPrice: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  maxPrice: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  stars: z.array(z.coerce.number().int().min(1).max(5)).max(5).default([]),
  amenities: z.array(z.string().trim().min(1).max(80).transform((value) => value.toUpperCase())).max(60).default([]),
  freeCancellation: z.boolean().default(false),
  paymentMode: z.enum(["PAY_NOW", "PAY_AT_HOTEL"]).optional(),
  sort: discoverySortSchema.default("RECOMMENDED"),
  pageSize: z.coerce.number().int().min(6).max(40).default(20),
  cursor: z.string().trim().max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.maxPrice < value.minPrice) {
    ctx.addIssue({code: "custom", path: ["maxPrice"], message: "Maximum price cannot be lower than minimum price"});
  }
});

export const destinationSuggestionQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  locale: z.enum(["ar", "en"]).default("en"),
  limit: z.coerce.number().int().min(1).max(12).default(8),
});

export type PublicStayInput = z.infer<typeof publicStaySchema>;
export type DiscoverySearchInput = z.infer<typeof discoverySearchSchema>;
export type DestinationSuggestionQuery = z.infer<typeof destinationSuggestionQuerySchema>;
