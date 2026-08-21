import { z } from "zod";

const nullableText = (max: number) => z.string().trim().max(max).nullable();

export const hotelPhotoInputSchema = z.object({
  url: z.string().url().max(2000),
  alt: nullableText(180).default(null),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const hotelAmenityInputSchema = z.object({
  code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(80),
  category: nullableText(60).default(null),
});

export const updateHotelPublicContentSchema = z.object({
  area: nullableText(120).default(null),
  description: nullableText(5000).default(null),
  starRating: z.number().int().min(1).max(5).nullable().default(null),
  latitude: z.number().finite().min(-90).max(90).nullable().default(null),
  longitude: z.number().finite().min(-180).max(180).nullable().default(null),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  photos: z.array(hotelPhotoInputSchema).max(30).default([]),
  amenities: z.array(hotelAmenityInputSchema).max(60).default([]),
}).superRefine((value, ctx) => {
  if ((value.latitude === null) !== (value.longitude === null)) {
    ctx.addIssue({code: "custom", path: ["latitude"], message: "Latitude and longitude must be supplied together"});
  }
  const codes = value.amenities.map((amenity) => amenity.code);
  if (new Set(codes).size !== codes.length) {
    ctx.addIssue({code: "custom", path: ["amenities"], message: "Amenity codes must be unique"});
  }
});

export type UpdateHotelPublicContentInput = z.infer<typeof updateHotelPublicContentSchema>;
