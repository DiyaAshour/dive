import { z } from "zod";

const money = z.number().finite().nonnegative().max(1_000_000);
const rate = z.number().finite().min(0).max(1);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const createHotelRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(100),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  address: z.string().trim().min(5).max(300),
  timezone: z.string().trim().min(3).max(80),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("JOD"),
});

export const ROOM_UNIT_TYPES = ["ROOM", "STUDIO", "SUITE", "APARTMENT", "VILLA", "CHALET", "BUNGALOW", "HOLIDAY_HOME", "DORMITORY_ROOM", "BED_IN_DORMITORY"] as const;
export const ROOM_SIZE_UNITS = ["SQM", "SQFT"] as const;
export const ROOM_SMOKING_POLICIES = ["NON_SMOKING", "SMOKING", "BOTH"] as const;
export const BED_TYPES = ["SINGLE", "DOUBLE", "QUEEN", "KING", "EXTRA_LARGE_DOUBLE", "SOFA_BED", "BUNK_BED", "FUTON", "MURPHY_BED"] as const;

const roomBedSchema = z.object({
  area: z.string().trim().min(1).max(80),
  type: z.enum(BED_TYPES),
  quantity: z.number().int().min(1).max(255),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

const roomAmenitySchema = z.object({
  code: z.string().trim().min(1).max(60).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(80).nullable().default(null),
});

const roomProductFields = {
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(3000).nullable().default(null),
  unitType: z.enum(ROOM_UNIT_TYPES).default("ROOM"),
  quantity: z.number().int().min(1).max(32000).default(1),
  maxGuests: z.number().int().min(1).max(50),
  maxAdults: z.number().int().min(1).max(50),
  maxChildren: z.number().int().min(0).max(49).default(0),
  maxInfants: z.number().int().min(0).max(49).default(0),
  bedroomCount: z.number().int().min(0).max(50).default(1),
  livingRoomCount: z.number().int().min(0).max(25).default(0),
  bathroomCount: z.number().int().min(0).max(25).default(1),
  privateBathroom: z.boolean().default(true),
  sizeValue: z.number().finite().positive().max(9999.99).nullable().default(null),
  sizeUnit: z.enum(ROOM_SIZE_UNITS).default("SQM"),
  smokingPolicy: z.enum(ROOM_SMOKING_POLICIES).default("NON_SMOKING"),
  extraBedCount: z.number().int().min(0).max(100).default(0),
  cribCount: z.number().int().min(0).max(100).default(0),
  allowsCribAndExtraBed: z.boolean().default(false),
  active: z.boolean().default(true),
  beds: z.array(roomBedSchema).min(1).max(100),
  amenities: z.array(roomAmenitySchema).max(100).default([]),
};

function roomProductSchema() {
  return z.object(roomProductFields).superRefine((value, context) => {
    if (value.maxAdults > value.maxGuests) context.addIssue({code: "custom", path: ["maxAdults"], message: "Maximum adults cannot exceed maximum guests"});
    if (value.maxGuests > value.maxAdults + value.maxChildren + value.maxInfants) context.addIssue({code: "custom", path: ["maxGuests"], message: "Maximum guests must fit within the configured adult, child and infant limits"});
    if (value.maxChildren >= value.maxGuests && value.maxChildren > 0) context.addIssue({code: "custom", path: ["maxChildren"], message: "Maximum children must be lower than maximum guests"});
    if (value.maxInfants >= value.maxGuests && value.maxInfants > 0) context.addIssue({code: "custom", path: ["maxInfants"], message: "Maximum infants must be lower than maximum guests"});
    const totalBeds = value.beds.reduce((sum, bed) => sum + bed.quantity, 0);
    if (value.unitType === "DORMITORY_ROOM" && (value.maxAdults < 2 || totalBeds < 2)) context.addIssue({code: "custom", path: ["beds"], message: "A dormitory room requires at least two adult places and two beds"});
    if (value.unitType === "BED_IN_DORMITORY" && (value.maxGuests !== 1 || value.maxAdults !== 1 || totalBeds !== 1)) context.addIssue({code: "custom", path: ["beds"], message: "A bed in a dormitory must fit exactly one adult and contain exactly one bed"});
    if (["SUITE", "APARTMENT", "VILLA", "CHALET", "BUNGALOW", "HOLIDAY_HOME"].includes(value.unitType) && value.bedroomCount < 1) context.addIssue({code: "custom", path: ["bedroomCount"], message: "Multi-room units require at least one bedroom"});
    const bedKeys = value.beds.map((bed) => `${bed.area.trim().toLocaleLowerCase()}::${bed.type}`);
    if (new Set(bedKeys).size !== bedKeys.length) context.addIssue({code: "custom", path: ["beds"], message: "Use the quantity field instead of repeating a bed type in the same sleeping area"});
    const amenityCodes = value.amenities.map((amenity) => amenity.code);
    if (new Set(amenityCodes).size !== amenityCodes.length) context.addIssue({code: "custom", path: ["amenities"], message: "Room amenity codes must be unique"});
  });
}

export const createRoomTypeRequestSchema = roomProductSchema();
export const updateRoomTypeRequestSchema = roomProductSchema();

export const createRatePlanRequestSchema = z.object({
  roomTypeId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  refundable: z.boolean(),
  mealPlan: z.enum(["ROOM_ONLY", "BREAKFAST", "HALF_BOARD", "FULL_BOARD"]).default("ROOM_ONLY"),
  allowPayNow: z.boolean().default(true),
  allowPayAtHotel: z.boolean().default(true),
}).refine((value) => value.allowPayNow || value.allowPayAtHotel, {message: "At least one payment mode must be enabled", path: ["allowPayNow"]});

export const updatePricingPolicyRequestSchema = z.object({
  serviceRate: rate,
  taxRate: rate,
});

export const calendarEntrySchema = z.object({
  date: dateOnly,
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  baseRate: money,
  available: z.number().int().min(0).max(10000),
  overbookingLimit: z.number().int().min(0).max(1000).default(0),
  minStay: z.number().int().min(1).max(365).default(1),
  maxStay: z.number().int().min(1).max(365).nullable().default(null),
  closed: z.boolean().default(false),
  stopSell: z.boolean().default(false),
});

export const upsertCalendarRequestSchema = z.object({
  entries: z.array(calendarEntrySchema).min(1).max(1000),
});

export type CreateHotelRequest = z.infer<typeof createHotelRequestSchema>;
export type CreateRoomTypeRequest = z.infer<typeof createRoomTypeRequestSchema>;
export type UpdateRoomTypeRequest = z.infer<typeof updateRoomTypeRequestSchema>;
export type CreateRatePlanRequest = z.infer<typeof createRatePlanRequestSchema>;
export type UpsertCalendarRequest = z.infer<typeof upsertCalendarRequestSchema>;
