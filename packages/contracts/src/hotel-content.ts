import { z } from "zod";

const nullableText = (max: number) => z.string().trim().max(max).nullable();

export const HOTEL_CONTENT_LOCALES = ["en","ar","zh","fr","de","es","it","tr","ru","ja","ko","hi","pt","id","th"] as const;

export const HOTEL_AMENITY_MINIMUM = 10;
export const HOTEL_AMENITY_CODES = [
  "WIFI","PARKING","BREAKFAST","RESTAURANT","ROOM_SERVICE","POOL","SPA","GYM","AIRPORT_SHUTTLE",
  "FAMILY_ROOMS","BUSINESS_CENTER","ROOFTOP","TERRACE","PLAY_AREA","BEACH_SHUTTLE","BEACH_ACCESS","MARINA","WATER_SPORTS",
] as const;
export type HotelAmenityCode = (typeof HOTEL_AMENITY_CODES)[number];

const HOTEL_AMENITY_DETAILS: Record<HotelAmenityCode,{name:string;category:string}> = {
  WIFI:{name:"Free Wi-Fi",category:"Essentials"},
  PARKING:{name:"Parking",category:"Convenience"},
  BREAKFAST:{name:"Breakfast",category:"Food & drink"},
  RESTAURANT:{name:"Restaurant",category:"Food & drink"},
  ROOM_SERVICE:{name:"Room service",category:"Food & drink"},
  POOL:{name:"Pool",category:"Wellness"},
  SPA:{name:"Spa",category:"Wellness"},
  GYM:{name:"Fitness centre",category:"Wellness"},
  AIRPORT_SHUTTLE:{name:"Airport shuttle",category:"Transport"},
  FAMILY_ROOMS:{name:"Family rooms",category:"Family"},
  BUSINESS_CENTER:{name:"Business centre",category:"Business"},
  ROOFTOP:{name:"Rooftop terrace",category:"Outdoors"},
  TERRACE:{name:"Terrace",category:"Outdoors"},
  PLAY_AREA:{name:"Children’s play area",category:"Family"},
  BEACH_SHUTTLE:{name:"Beach shuttle",category:"Transport"},
  BEACH_ACCESS:{name:"Beach access",category:"Activities"},
  MARINA:{name:"Marina access",category:"Activities"},
  WATER_SPORTS:{name:"Water sports",category:"Activities"},
};

export const HOTEL_AMENITY_CATALOG = HOTEL_AMENITY_CODES.map((code)=>({code,...HOTEL_AMENITY_DETAILS[code]}));

export const hotelAmenityInputSchema = z.object({
  code: z.enum(HOTEL_AMENITY_CODES),
  name: z.string().trim().min(2).max(80).optional(),
  category: nullableText(60).optional(),
}).transform(({code})=>({code,name:HOTEL_AMENITY_DETAILS[code].name,category:HOTEL_AMENITY_DETAILS[code].category}));

export const hotelTranslationInputSchema = z.object({
  locale: z.enum(HOTEL_CONTENT_LOCALES),
  name: nullableText(160).default(null),
  description: nullableText(5000).default(null),
});

export const updateHotelPublicContentSchema = z.object({
  area: nullableText(120).default(null),
  description: nullableText(5000).default(null),
  starRating: z.number().int().min(1).max(5).nullable().default(null),
  latitude: z.number().finite().min(-90).max(90).nullable().default(null),
  longitude: z.number().finite().min(-180).max(180).nullable().default(null),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  amenities: z.array(hotelAmenityInputSchema).min(HOTEL_AMENITY_MINIMUM,`At least ${HOTEL_AMENITY_MINIMUM} property amenities are required`).max(HOTEL_AMENITY_CODES.length).default([]),
  translations: z.array(hotelTranslationInputSchema).max(HOTEL_CONTENT_LOCALES.length).default([]),
}).superRefine((value, ctx) => {
  if ((value.latitude === null) !== (value.longitude === null)) {
    ctx.addIssue({code: "custom", path: ["latitude"], message: "Latitude and longitude must be supplied together"});
  }
  const codes = value.amenities.map((amenity) => amenity.code);
  if (new Set(codes).size !== codes.length) {
    ctx.addIssue({code: "custom", path: ["amenities"], message: "Amenity codes must be unique"});
  }
  const locales = value.translations.map((translation) => translation.locale);
  if (new Set(locales).size !== locales.length) {
    ctx.addIssue({code: "custom", path: ["translations"], message: "Each translation locale may be supplied only once"});
  }
});

export type HotelContentLocale = (typeof HOTEL_CONTENT_LOCALES)[number];
export type UpdateHotelPublicContentInput = z.infer<typeof updateHotelPublicContentSchema>;
