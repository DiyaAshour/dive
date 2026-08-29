import { z } from "zod";

export const HOTEL_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VERIFICATION_DOCUMENT_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const HOTEL_DOCUMENT_TYPES = ["COMMERCIAL_REGISTRATION", "BUSINESS_LICENSE", "TAX_REGISTRATION", "BANK_PROOF", "OWNER_ID", "OTHER"] as const;
export const HOTEL_PHOTO_CATEGORIES = ["EXTERIOR", "ROOM", "BATHROOM", "LOBBY", "RECEPTION", "RESTAURANT", "BAR", "BREAKFAST", "POOL", "SPA", "GYM", "VIEW", "FACILITIES", "OTHER"] as const;

const fileName = z.string().trim().min(1).max(180);
const sizeBytes = z.number().int().positive();

export const createMediaUploadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("HOTEL_IMAGE"),
    fileName,
    contentType: z.enum(HOTEL_IMAGE_CONTENT_TYPES),
    sizeBytes: sizeBytes.max(10 * 1024 * 1024),
    alt: z.string().trim().max(180).nullable().default(null),
    sortOrder: z.number().int().min(0).max(1000).default(0),
    roomTypeId: z.string().min(1).nullable().default(null),
    category: z.enum(HOTEL_PHOTO_CATEGORIES).default("OTHER"),
  }),
  z.object({
    kind: z.literal("VERIFICATION_DOCUMENT"),
    fileName,
    contentType: z.enum(VERIFICATION_DOCUMENT_CONTENT_TYPES),
    sizeBytes: sizeBytes.max(20 * 1024 * 1024),
    documentType: z.enum(HOTEL_DOCUMENT_TYPES),
  }),
]);

export const updateHotelPhotoSchema = z.object({
  alt: z.string().trim().max(180).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  roomTypeId: z.string().min(1).nullable().optional(),
  category: z.enum(HOTEL_PHOTO_CATEGORIES).optional(),
}).refine((value) => value.alt !== undefined || value.sortOrder !== undefined || value.roomTypeId !== undefined || value.category !== undefined, {message: "At least one photo field must be supplied"});

export const documentDecisionSchema = z.discriminatedUnion("decision", [
  z.object({decision: z.literal("APPROVE")}),
  z.object({decision: z.literal("REJECT"), reason: z.string().trim().min(10).max(2000)}),
]);

export type HotelPhotoCategory = typeof HOTEL_PHOTO_CATEGORIES[number];
export type CreateMediaUploadInput = z.infer<typeof createMediaUploadSchema>;
export type UpdateHotelPhotoInput = z.infer<typeof updateHotelPhotoSchema>;
export type DocumentDecisionInput = z.infer<typeof documentDecisionSchema>;
