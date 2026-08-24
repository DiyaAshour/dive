import { z } from "zod";
import { hotelAmenityInputSchema } from "./hotel-content";

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable();
const rate = z.number().finite().min(0).max(0.5);

export const updatePlatformHotelSchema = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(120),
  countryCode: z.string().trim().length(2).regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  address: z.string().trim().min(3).max(300),
  area: nullableText(120),
  description: nullableText(5000),
  starRating: z.number().int().min(1).max(5).nullable(),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
  checkInTime: time,
  checkOutTime: time,
  timezone: z.string().trim().min(3).max(80),
  currency: z.string().trim().length(3).regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  commissionRate: rate,
  serviceRate: rate,
  taxRate: rate,
  overbookingEnabled: z.boolean(),
  amenities: z.array(hotelAmenityInputSchema).max(60),
}).superRefine((value, ctx) => {
  if ((value.latitude === null) !== (value.longitude === null)) {
    ctx.addIssue({code: "custom", path: ["latitude"], message: "Latitude and longitude must be supplied together"});
  }
  const codes = value.amenities.map((amenity) => amenity.code);
  if (new Set(codes).size !== codes.length) {
    ctx.addIssue({code: "custom", path: ["amenities"], message: "Amenity codes must be unique"});
  }
});

export const moderateGuestReviewSchema = z.object({
  status: z.enum(["PUBLISHED", "HIDDEN"]),
  reason: z.string().trim().min(10).max(2000),
});

export type UpdatePlatformHotelInput = z.infer<typeof updatePlatformHotelSchema>;
export type ModerateGuestReviewInput = z.infer<typeof moderateGuestReviewSchema>;
