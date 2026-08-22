import { z } from "zod";

const score = z.coerce.number().int().min(1).max(10);

export const createGuestReviewSchema = z.object({
  overall: score,
  cleanliness: score,
  staff: score,
  location: score,
  facilities: score,
  comfort: score,
  value: score,
  title: z.string().trim().min(2).max(120).nullable().optional(),
  comment: z.string().trim().min(10).max(5000),
});

export const hotelReviewReplySchema = z.object({
  reply: z.string().trim().min(2).max(3000),
});

export type CreateGuestReviewInput = z.infer<typeof createGuestReviewSchema>;
export type HotelReviewReplyInput = z.infer<typeof hotelReviewReplySchema>;
