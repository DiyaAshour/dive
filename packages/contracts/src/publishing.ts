import { z } from "zod";

export const propertyReviewDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    reason: z.string().trim().max(2000).optional(),
  }),
  z.object({
    decision: z.literal("REJECT"),
    reason: z.string().trim().min(10).max(2000),
  }),
]);

export const suspendPropertySchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});

export type PropertyReviewDecisionInput = z.infer<typeof propertyReviewDecisionSchema>;
export type SuspendPropertyInput = z.infer<typeof suspendPropertySchema>;
