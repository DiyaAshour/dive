import type { LoginRequest, RegisterRequest } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError } from "../errors";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";

function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }

export async function registerUser(input: RegisterRequest) {
  const email = normalizeEmail(input.email);
  const existing = await database().user.findUnique({where: {email}, select: {id: true}});
  if (existing) throw new ApplicationError("EMAIL_IN_USE", "An account already exists for this email", 409);

  const passwordHash = await hashPassword(input.password);
  const user = await database().user.create({
    data: {email, displayName: input.displayName.trim(), credential: {create: {passwordHash}}},
    select: {id: true, email: true, displayName: true, platformRole: true},
  });
  return {user, session: await createSession(user.id)};
}

export async function loginUser(input: LoginRequest) {
  const user = await database().user.findUnique({where: {email: normalizeEmail(input.email)}, include: {credential: true}});
  const valid = user?.credential ? await verifyPassword(input.password, user.credential.passwordHash) : false;
  if (!user || !valid) throw new ApplicationError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  return {user: {id: user.id, email: user.email, displayName: user.displayName, platformRole: user.platformRole}, session: await createSession(user.id)};
}
