import {z} from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid calendar date");
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional();

export const partnerSettlementPeriodSchema = z.object({
  from: dateOnly,
  to: dateOnly,
  currency,
}).superRefine((value, context) => {
  if (value.from > value.to) context.addIssue({code: "custom", path: ["to"], message: "The end date must be on or after the start date"});
});

export const partnerReconciliationRequestSchema = partnerSettlementPeriodSchema;
export const partnerPayoutRequestSchema = partnerSettlementPeriodSchema;

export const adminPayoutUpdateSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("PAID"), externalReference: z.string().trim().min(3).max(200)}),
  z.object({action: z.literal("VOID"), note: z.string().trim().min(3).max(500).optional()}),
]);

export type PartnerSettlementPeriod = z.infer<typeof partnerSettlementPeriodSchema>;
export type PartnerReconciliationRequest = z.infer<typeof partnerReconciliationRequestSchema>;
export type PartnerPayoutRequest = z.infer<typeof partnerPayoutRequestSchema>;
export type AdminPayoutUpdate = z.infer<typeof adminPayoutUpdateSchema>;
