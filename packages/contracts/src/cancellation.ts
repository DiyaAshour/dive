import { z } from "zod";

export const penaltyTypeSchema = z.enum(["NONE", "PERCENTAGE", "FIXED_AMOUNT", "FIRST_NIGHT", "FULL_STAY"]);

export const cancellationRuleSchema = z.object({
  minimumDaysBeforeArrival: z.number().int().min(0).max(3650),
  penaltyType: penaltyTypeSchema,
  penaltyValue: z.number().finite().nonnegative().max(1_000_000).nullable().optional(),
}).superRefine((rule, ctx) => {
  if (rule.penaltyType === "PERCENTAGE" && (rule.penaltyValue === null || rule.penaltyValue === undefined || rule.penaltyValue > 1)) {
    ctx.addIssue({code: "custom", path: ["penaltyValue"], message: "Percentage penalty requires a value between 0 and 1"});
  }
  if (rule.penaltyType === "FIXED_AMOUNT" && (rule.penaltyValue === null || rule.penaltyValue === undefined)) {
    ctx.addIssue({code: "custom", path: ["penaltyValue"], message: "Fixed penalty requires an amount"});
  }
});

export const updateCancellationPolicySchema = z.object({
  name: z.string().trim().min(2).max(120),
  rules: z.array(cancellationRuleSchema).min(1).max(20),
  noShowPenaltyType: penaltyTypeSchema,
  noShowPenaltyValue: z.number().finite().nonnegative().max(1_000_000).nullable().optional(),
}).superRefine((policy, ctx) => {
  const thresholds = policy.rules.map((rule) => rule.minimumDaysBeforeArrival);
  if (new Set(thresholds).size !== thresholds.length) ctx.addIssue({code: "custom", path: ["rules"], message: "Cancellation rule thresholds must be unique"});
  if (!thresholds.includes(0)) ctx.addIssue({code: "custom", path: ["rules"], message: "Cancellation policy must include a 0-day rule"});
  if (policy.noShowPenaltyType === "PERCENTAGE" && (policy.noShowPenaltyValue === null || policy.noShowPenaltyValue === undefined || policy.noShowPenaltyValue > 1)) {
    ctx.addIssue({code: "custom", path: ["noShowPenaltyValue"], message: "Percentage no-show penalty requires a value between 0 and 1"});
  }
  if (policy.noShowPenaltyType === "FIXED_AMOUNT" && (policy.noShowPenaltyValue === null || policy.noShowPenaltyValue === undefined)) {
    ctx.addIssue({code: "custom", path: ["noShowPenaltyValue"], message: "Fixed no-show penalty requires an amount"});
  }
});

export type UpdateCancellationPolicyInput = z.infer<typeof updateCancellationPolicySchema>;
