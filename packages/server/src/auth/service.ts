import type { LoginRequest, RegisterRequest } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError } from "../errors";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";

function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }

async function authenticateUser(input: LoginRequest) {
  const user = await database().user.findUnique({where: {email: normalizeEmail(input.email)}, include: {credential: true}});
  const valid = user?.credential ? await verifyPassword(input.password, user.credential.passwordHash) : false;
  if (!user || !valid) throw new ApplicationError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  return user;
}

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
  const user = await authenticateUser(input);
  return {user: {id: user.id, email: user.email, displayName: user.displayName, platformRole: user.platformRole}, session: await createSession(user.id)};
}

export async function loginPlatformAdmin(input: LoginRequest, metadata: Readonly<{userAgent?: string | null; ipAddress?: string | null}> = {}) {
  const user = await authenticateUser(input);
  if (user.platformRole !== "PLATFORM_ADMIN") {
    throw new ApplicationError("INVALID_ADMIN_CREDENTIALS", "Invalid administrator credentials", 401);
  }
  const session = await createSession(user.id, {scope: "ADMIN", ...metadata});
  try {
    await database().auditLog.create({data: {
      actorUserId: user.id,
      action: "ADMIN_SESSION_CREATED",
      entityType: "Session",
      entityId: session.id,
      after: {expiresAt: session.expiresAt.toISOString()},
    }});
  } catch (error) {
    await database().session.delete({where: {id: session.id}}).catch(() => undefined);
    throw error;
  }
  return {user: {id: user.id, email: user.email, displayName: user.displayName, platformRole: user.platformRole}, session};
}
