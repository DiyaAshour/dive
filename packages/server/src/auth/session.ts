import { createHash, randomBytes } from "node:crypto";
import { database } from "@platform/database";

export type SessionUser = Readonly<{
  id: string;
  email: string;
  displayName: string;
  platformRole: "GUEST" | "HOTEL_USER" | "PLATFORM_ADMIN";
}>;

export type SessionScopeName = "STANDARD" | "ADMIN";
export type CreatedSession = Readonly<{id: string; token: string; expiresAt: Date; scope: SessionScopeName}>;
export type AdminSessionPrincipal = Readonly<{
  user: SessionUser;
  session: Readonly<{
    id: string;
    scope: "ADMIN";
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }>;
}>;

type CreateSessionOptions = Readonly<{
  scope?: SessionScopeName;
  userAgent?: string | null;
  ipAddress?: string | null;
}>;

export function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionTtlDays(): number {
  const parsed = Number(process.env.SESSION_TTL_DAYS ?? "30");
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365 ? Math.floor(parsed) : 30;
}

function adminSessionTtlHours(): number {
  const parsed = Number(process.env.ADMIN_SESSION_TTL_HOURS ?? "8");
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 24 ? Math.floor(parsed) : 8;
}

function sessionExpiry(scope: SessionScopeName): Date {
  const milliseconds = scope === "ADMIN" ? adminSessionTtlHours() * 3_600_000 : sessionTtlDays() * 86_400_000;
  return new Date(Date.now() + milliseconds);
}

function cleanMetadata(value: string | null | undefined, maxLength: number): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

export async function createSession(userId: string, options: CreateSessionOptions = {}): Promise<CreatedSession> {
  const scope = options.scope ?? "STANDARD";
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiry(scope);
  const session = await database().session.create({data: {
    userId,
    tokenHash: sessionTokenHash(token),
    scope,
    userAgent: cleanMetadata(options.userAgent, 512),
    ipAddress: cleanMetadata(options.ipAddress, 64),
    expiresAt,
  }, select: {id: true}});
  return {id: session.id, token, expiresAt, scope};
}

async function sessionRecord(token: string | null | undefined, scope: SessionScopeName) {
  if (!token) return null;
  const session = await database().session.findUnique({where: {tokenHash: sessionTokenHash(token)}, include: {user: true}});
  if (!session || session.scope !== scope) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await database().session.delete({where: {id: session.id}}).catch(() => undefined);
    return null;
  }
  const lastUsedAt = new Date();
  await database().session.update({where: {id: session.id}, data: {lastUsedAt}});
  return {...session, lastUsedAt};
}

function sessionUser(record: NonNullable<Awaited<ReturnType<typeof sessionRecord>>>): SessionUser {
  return {id: record.user.id, email: record.user.email, displayName: record.user.displayName, platformRole: record.user.platformRole};
}

export async function getSessionUser(token: string | null | undefined): Promise<SessionUser | null> {
  const record = await sessionRecord(token, "STANDARD");
  return record ? sessionUser(record) : null;
}

export async function getAdminSessionPrincipal(token: string | null | undefined): Promise<AdminSessionPrincipal | null> {
  const record = await sessionRecord(token, "ADMIN");
  if (!record) return null;
  if (record.user.platformRole !== "PLATFORM_ADMIN") {
    await database().session.delete({where: {id: record.id}}).catch(() => undefined);
    return null;
  }
  return {
    user: sessionUser(record),
    session: {
      id: record.id,
      scope: "ADMIN",
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
      expiresAt: record.expiresAt,
      userAgent: record.userAgent,
      ipAddress: record.ipAddress,
    },
  };
}

export async function revokeSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await database().session.deleteMany({where: {tokenHash: sessionTokenHash(token)}});
}

export async function revokeAdminSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  const tokenHash = sessionTokenHash(token);
  const session = await database().session.findUnique({where: {tokenHash}, select: {id: true, userId: true, scope: true}});
  if (!session || session.scope !== "ADMIN") return;
  await database().session.delete({where: {id: session.id}});
  await database().auditLog.create({data: {
      actorUserId: session.userId,
      action: "ADMIN_SESSION_REVOKED",
      entityType: "Session",
      entityId: session.id,
  }}).catch(() => undefined);
}
