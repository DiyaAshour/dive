import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const token = z.string().trim().min(24).max(256);

export const forgotPasswordRequestSchema = z.object({email});
export const resetPasswordRequestSchema = z.object({token, newPassword: z.string().min(12).max(128)});
export const verifyEmailRequestSchema = z.object({token});
export const partnerStatementRequestSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().trim().toUpperCase().length(3).optional(),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type PartnerStatementRequest = z.infer<typeof partnerStatementRequestSchema>;
