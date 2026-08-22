import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(10).max(128);

export const registerRequestSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(2).max(100),
});

export const loginRequestSchema = z.object({email, password});

export const updateAccountProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
});

export const changePasswordRequestSchema = z.object({
  currentPassword: password,
  newPassword: z.string().min(12).max(128),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type UpdateAccountProfileRequest = z.infer<typeof updateAccountProfileSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
