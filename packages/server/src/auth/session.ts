import { createHash, randomBytes } from "node:crypto";
import { database } from "@platform/database";

export type SessionUser = Readonly<{
  id: string;
  email: string;
  displayName: string;
  platformRole: "GUEST" | "HOTEL_USER" | "PLATFORM_ADMIN";
}>;

export type CreatedSession = Readonly<{token: string; expiresAt: Date}>;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionTtlDays(): number {
  const parsed = Number(process.env.SESSION_TTL_DAYS ?? "30");
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365 ? Math.floor(parsed) : 30;
}

export async function createSession(userId: string): Promise<CreatedSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlDays() * 86_400_000);
  await database().session.create({data: {userId, tokenHash: tokenHash(token), expiresAt}});
  return {token, expiresAt};
}

export async function getSessionUser(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await database().session.findUnique({where: {tokenHash: tokenHash(token)}, include: {user: true}});
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await database().session.delete({where: {id: session.id}}).catch(() => undefined);
    return null;
  }
  await database().session.update({where: {id: session.id}, data: {lastUsedAt: new Date()}});
  return {id: session.user.id, email: session.user.email, displayName: session.user.displayName, platformRole: session.user.platformRole};
}

export async function revokeSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await database().session.deleteMany({where: {tokenHash: tokenHash(token)}});
}
