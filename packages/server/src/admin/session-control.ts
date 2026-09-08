import {database} from "@platform/database";
import {ApplicationError, notFound} from "../errors";
import {requirePlatformOwner} from "./access";

export async function listPlatformManagedUserSessions(actorUserId: string, userId: string) {
  await requirePlatformOwner(actorUserId);
  const user = await database().user.findUnique({
    where: {id: userId},
    select: {id: true, email: true, displayName: true},
  });
  if (!user) notFound("User");

  const now = new Date();
  const sessions = await database().session.findMany({
    where: {userId, expiresAt: {gt: now}},
    select: {
      id: true,
      scope: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: [{lastUsedAt: "desc"}, {createdAt: "desc"}],
    take: 50,
  });

  return {user, sessions};
}

export async function revokePlatformManagedUserSession(actorUserId: string, userId: string, sessionId: string) {
  await requirePlatformOwner(actorUserId);
  return database().$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: {id: sessionId},
      select: {id: true, userId: true, scope: true},
    });
    if (!session || session.userId !== userId) notFound("Session");

    await tx.session.delete({where: {id: sessionId}});
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: "PLATFORM_USER_SESSION_REVOKED",
        entityType: "Session",
        entityId: sessionId,
        after: {userId, scope: session.scope, revoked: true},
      },
    });
    return {userId, sessionId, revoked: true};
  });
}

export async function assertPlatformOwnerConfigured() {
  const configuredId = process.env.PLATFORM_OWNER_USER_ID?.trim();
  const configuredEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  const hasConfiguredOwner = Boolean(configuredId || configuredEmail);

  const owner = await database().user.findFirst({
    where: {
      ...(configuredId ? {id: configuredId} : {}),
      ...(configuredEmail ? {email: configuredEmail} : {}),
      platformRole: "PLATFORM_ADMIN",
    },
    ...(!hasConfiguredOwner ? {orderBy: [{createdAt: "asc" as const}, {id: "asc" as const}]} : {}),
    select: {id: true, email: true, displayName: true, platformRole: true, createdAt: true},
  });
  if (!owner) {
    throw new ApplicationError(
      hasConfiguredOwner ? "PLATFORM_OWNER_INVALID" : "PLATFORM_OWNER_NOT_CONFIGURED",
      hasConfiguredOwner
        ? "Configured platform owner must exist and have PLATFORM_ADMIN role"
        : "At least one PLATFORM_ADMIN account is required for background administration",
      503,
    );
  }
  return owner;
}
