import { database } from "@platform/database";
import { ApplicationError } from "../errors";
import { requirePlatformAdmin } from "./authorization";

export async function bootstrapFirstPlatformAdmin(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254 || !normalizedEmail.includes("@")) {
    throw new ApplicationError("INVALID_ADMIN_EMAIL", "A valid account email is required", 400);
  }

  return database().$transaction(async (tx) => {
    const [target, roleHolders] = await Promise.all([
      tx.user.findUnique({where: {email: normalizedEmail}, include: {credential: true}}),
      tx.user.findMany({
        where: {platformRole: "PLATFORM_ADMIN"},
        select: {id: true, email: true, credential: {select: {userId: true}}},
      }),
    ]);

    if (!target) throw new ApplicationError("ADMIN_ACCOUNT_NOT_FOUND", "Create the account before bootstrapping platform administration", 404);
    if (!target.credential) throw new ApplicationError("ADMIN_PASSWORD_REQUIRED", "The administrator account must have a password credential", 409);
    if (target.platformRole === "PLATFORM_ADMIN") {
      return {userId: target.id, email: target.email, alreadyAdmin: true};
    }

    const interactiveAdmins = roleHolders.filter((user) => user.credential !== null);
    if (interactiveAdmins.length > 0) {
      throw new ApplicationError("ADMIN_ALREADY_BOOTSTRAPPED", "A platform administrator already exists; add future administrators through controlled access management", 409);
    }

    await tx.user.update({where: {id: target.id}, data: {platformRole: "PLATFORM_ADMIN"}});
    await tx.session.deleteMany({where: {userId: target.id}});
    await tx.auditLog.create({data: {
      actorUserId: target.id,
      action: "PLATFORM_ADMIN_BOOTSTRAPPED",
      entityType: "User",
      entityId: target.id,
      before: {platformRole: target.platformRole},
      after: {platformRole: "PLATFORM_ADMIN", method: "operator-bootstrap"},
    }});

    return {userId: target.id, email: target.email, alreadyAdmin: false};
  }, {isolationLevel: "Serializable"});
}

export async function listPlatformHotels(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  return database().hotel.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      countryCode: true,
      status: true,
      verified: true,
      publishRevision: true,
      publishedRevision: true,
      createdAt: true,
    },
    orderBy: {createdAt: "desc"},
    take: 200,
  });
}

export async function getPlatformAccessOverview(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  const now = new Date();
  const [totalUsers, guests, hotelUsers, roleHolders] = await Promise.all([
    database().user.count(),
    database().user.count({where: {platformRole: "GUEST"}}),
    database().user.count({where: {platformRole: "HOTEL_USER"}}),
    database().user.findMany({
      where: {platformRole: "PLATFORM_ADMIN"},
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        credential: {select: {userId: true}},
        sessions: {
          where: {scope: "ADMIN", expiresAt: {gt: now}},
          select: {id: true, lastUsedAt: true, expiresAt: true},
          orderBy: {lastUsedAt: "desc"},
        },
      },
      orderBy: {createdAt: "asc"},
    }),
  ]);

  const administrators = roleHolders
    .filter((user) => user.credential !== null)
    .map(({credential: _credential, sessions, ...user}) => ({
      ...user,
      activeAdminSessions: sessions.length,
      lastAdminActivity: sessions[0]?.lastUsedAt ?? null,
      nearestSessionExpiry: sessions[0]?.expiresAt ?? null,
    }));

  return {totalUsers, guests, hotelUsers, administrators};
}

export async function listPlatformAuditLog(actorUserId: string, limit = 50) {
  await requirePlatformAdmin(actorUserId);
  const take = Math.max(1, Math.min(Math.floor(limit), 100));
  const logs = await database().auditLog.findMany({
    orderBy: {createdAt: "desc"},
    take,
    select: {
      id: true,
      actorUserId: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      hotel: {select: {id: true, name: true}},
    },
  });
  const actorIds = [...new Set(logs.flatMap((log) => log.actorUserId ? [log.actorUserId] : []))];
  const actors = actorIds.length ? await database().user.findMany({
    where: {id: {in: actorIds}},
    select: {id: true, displayName: true, email: true},
  }) : [];
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));
  return logs.map((log) => ({...log, actor: log.actorUserId ? actorById.get(log.actorUserId) ?? null : null}));
}
