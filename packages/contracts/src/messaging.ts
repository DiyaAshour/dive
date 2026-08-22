import { z } from "zod";

export const bookingMessageInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export type BookingMessageInput = z.infer<typeof bookingMessageInputSchema>;
