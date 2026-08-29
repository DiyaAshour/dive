import { database } from "@platform/database";
import { ApplicationError, forbidden, notFound } from "../errors";
import { hashPassword } from "../auth/password";
import { requirePlatformAdmin } from "./authorization";

export type ManagedPlatformRole = "GUEST" | "HOTEL_USER" | "PLATFORM_ADMIN";
export type ManagedHotelRole = "OWNER" | "MANAGER" | "REVENUE" | "FRONT_DESK" | "FINANCE" | "VIEWER";
export type ManagedMembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

const PLATFORM_ROLES = new Set<ManagedPlatformRole>(["GUEST", "HOTEL_USER", "PLATFORM_ADMIN"]);
const HOTEL_ROLES = new Set<ManagedHotelRole>(["OWNER", "MANAGER", "REVENUE", "FRONT_DESK", "FINANCE", "VIEWER"]);
const MEMBERSHIP_STATUSES = new Set<ManagedMembershipStatus>(["ACTIVE", "INVITED", "SUSPENDED"]);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function cleanDisplayName(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 120) throw new ApplicationError("INVALID_DISPLAY_NAME", "Display name must be between 2 and 120 characters", 400);
  return cleaned;
}

function validateEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email.includes("@") || email.length > 254) throw new ApplicationError("INVALID_EMAIL", "A valid email address is required", 400);
  return email;
}

function validatePassword(value: string) {
  if (value.length < 10 || value.length > 160) throw new ApplicationError("INVALID_PASSWORD", "Password must be between 10 and 160 characters", 400);
  return value;
}

async function platformOwnerRecord() {
  return database().user.findFirst({
    where: {platformRole: "PLATFORM_ADMIN"},
    orderBy: [{createdAt: "asc"}, {id: "asc"}],
    select: {id: true, email: true, displayName: true, createdAt: true},
  });
}

export async function requirePlatformOwner(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  const owner = await platformOwnerRecord();
  if (!owner || owner.id !== actorUserId) forbidden("Platform owner access is required");
  return owner;
}

export async function getPlatformAccessControl(actorUserId: string, query = "") {
  const actor = await requirePlatformAdmin(actorUserId);
  const owner = await platformOwnerRecord();
  const normalizedQuery = query.trim().slice(0, 120);
  const now = new Date();
  const users = await database().user.findMany({
    where: normalizedQuery ? {OR: [
      {email: {contains: normalizedQuery, mode: "insensitive"}},
      {displayName: {contains: normalizedQuery, mode: "insensitive"}},
    ]} : undefined,
    select: {
      id: true,
      email: true,
      displayName: true,
      platformRole: true,
      createdAt: true,
      credential: {select: {userId: true}},
      sessions: {
        where: {expiresAt: {gt: now}},
        select: {scope: true, lastUsedAt: true, expiresAt: true},
        orderBy: {lastUsedAt: "desc"},
      },
      hotelMemberships: {
        select: {
          id: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          hotel: {select: {id: true, name: true, slug: true, city: true, status: true}},
        },
        orderBy: {createdAt: "asc"},
      },
    },
    orderBy: [{createdAt: "asc"}, {email: "asc"}],
    take: 300,
  });

  const hotels = await database().hotel.findMany({
    select: {id: true, name: true, slug: true, city: true, status: true},
    orderBy: [{name: "asc"}, {city: "asc"}],
    take: 500,
  });

  return {
    actor: {id: actor.id, isOwner: owner?.id === actor.id},
    owner,
    counts: {
      total: users.length,
      administrators: users.filter((user) => user.platformRole === "PLATFORM_ADMIN").length,
      hotelUsers: users.filter((user) => user.platformRole === "HOTEL_USER").length,
      guests: users.filter((user) => user.platformRole === "GUEST").length,
      locked: users.filter((user) => !user.credential).length,
    },
    hotels,
    users: users.map(({credential, sessions, ...user}) => ({
      ...user,
      isOwner: owner?.id === user.id,
      accessState: credential ? "ACTIVE" as const : "LOCKED" as const,
      activeStandardSessions: sessions.filter((session) => session.scope === "STANDARD").length,
      activeAdminSessions: sessions.filter((session) => session.scope === "ADMIN").length,
      lastActivity: sessions[0]?.lastUsedAt ?? null,
    })),
  };
}

export async function createPlatformManagedUser(actorUserId: string, input: Readonly<{
  email: string;
  displayName: string;
  password: string;
  platformRole: ManagedPlatformRole;
  hotelId?: string | null;
  hotelRole?: ManagedHotelRole | null;
}>) {
  await requirePlatformOwner(actorUserId);
  const email = validateEmail(input.email);
  const displayName = cleanDisplayName(input.displayName);
  const password = validatePassword(input.password);
  if (!PLATFORM_ROLES.has(input.platformRole)) throw new ApplicationError("INVALID_PLATFORM_ROLE", "Invalid platform role", 400);
  if (input.hotelRole && !HOTEL_ROLES.has(input.hotelRole)) throw new ApplicationError("INVALID_HOTEL_ROLE", "Invalid hotel role", 400);
  if (input.hotelRole && !input.hotelId) throw new ApplicationError("HOTEL_REQUIRED", "A property is required for a hotel role", 400);

  const passwordHash = await hashPassword(password);
  return database().$transaction(async (tx) => {
    const existing = await tx.user.findUnique({where: {email}, select: {id: true}});
    if (existing) throw new ApplicationError("EMAIL_IN_USE", "An account already exists for this email", 409);
    if (input.hotelId) {
      const hotel = await tx.hotel.findUnique({where: {id: input.hotelId}, select: {id: true}});
      if (!hotel) notFound("Hotel");
    }
    const effectiveRole: ManagedPlatformRole = input.hotelId && input.platformRole === "GUEST" ? "HOTEL_USER" : input.platformRole;
    const user = await tx.user.create({
      data: {
        email,
        displayName,
        platformRole: effectiveRole,
        credential: {create: {passwordHash}},
        ...(input.hotelId && input.hotelRole ? {hotelMemberships: {create: {hotelId: input.hotelId, role: input.hotelRole, status: "ACTIVE"}}} : {}),
      },
      select: {id: true, email: true, displayName: true, platformRole: true, createdAt: true},
    });
    await tx.auditLog.create({data: {
      actorUserId,
      action: "PLATFORM_USER_CREATED",
      entityType: "User",
      entityId: user.id,
      after: {email: user.email, displayName: user.displayName, platformRole: user.platformRole, hotelId: input.hotelId ?? null, hotelRole: input.hotelRole ?? null},
    }});
    return user;
  });
}

export async function updatePlatformManagedUser(actorUserId: string, userId: string, input: Readonly<{
  displayName?: string;
  platformRole?: ManagedPlatformRole;
}>) {
  const owner = await requirePlatformOwner(actorUserId);
  if (input.platformRole && !PLATFORM_ROLES.has(input.platformRole)) throw new ApplicationError("INVALID_PLATFORM_ROLE", "Invalid platform role", 400);
  return database().$transaction(async (tx) => {
    const before = await tx.user.findUnique({where: {id: userId}, select: {id: true, email: true, displayName: true, platformRole: true, _count: {select: {hotelMemberships: true}}}});
    if (!before) notFound("User");
    if (before.id === owner.id && input.platformRole && input.platformRole !== "PLATFORM_ADMIN") {
      throw new ApplicationError("OWNER_ROLE_PROTECTED", "The platform owner cannot be demoted", 409);
    }
    if (input.platformRole === "GUEST" && before._count.hotelMemberships > 0) {
      throw new ApplicationError("HOTEL_MEMBERSHIPS_EXIST", "Remove hotel memberships before changing this account to Guest", 409);
    }
    const updated = await tx.user.update({
      where: {id: userId},
      data: {
        ...(input.displayName !== undefined ? {displayName: cleanDisplayName(input.displayName)} : {}),
        ...(input.platformRole ? {platformRole: input.platformRole} : {}),
      },
      select: {id: true, email: true, displayName: true, platformRole: true},
    });
    if (before.platformRole === "PLATFORM_ADMIN" && updated.platformRole !== "PLATFORM_ADMIN") {
      await tx.session.deleteMany({where: {userId, scope: "ADMIN"}});
    }
    await tx.auditLog.create({data: {
      actorUserId,
      action: "PLATFORM_USER_ACCESS_UPDATED",
      entityType: "User",
      entityId: userId,
      before: {displayName: before.displayName, platformRole: before.platformRole},
      after: {displayName: updated.displayName, platformRole: updated.platformRole},
    }});
    return updated;
  });
}

export async function lockPlatformManagedUser(actorUserId: string, userId: string) {
  const owner = await requirePlatformOwner(actorUserId);
  if (owner.id === userId) throw new ApplicationError("OWNER_ACCOUNT_PROTECTED", "The platform owner account cannot be locked", 409);
  return database().$transaction(async (tx) => {
    const user = await tx.user.findUnique({where: {id: userId}, select: {id: true, email: true, credential: {select: {userId: true}}}});
    if (!user) notFound("User");
    await tx.credential.deleteMany({where: {userId}});
    await tx.session.deleteMany({where: {userId}});
    await tx.auditLog.create({data: {actorUserId, action: "PLATFORM_USER_LOCKED", entityType: "User", entityId: userId, before: {credential: Boolean(user.credential)}, after: {credential: false, sessionsRevoked: true}}});
    return {userId, locked: true};
  });
}

export async function resetPlatformManagedUserPassword(actorUserId: string, userId: string, password: string) {
  await requirePlatformOwner(actorUserId);
  const passwordHash = await hashPassword(validatePassword(password));
  return database().$transaction(async (tx) => {
    const user = await tx.user.findUnique({where: {id: userId}, select: {id: true}});
    if (!user) notFound("User");
    await tx.credential.upsert({where: {userId}, update: {passwordHash}, create: {userId, passwordHash}});
    await tx.session.deleteMany({where: {userId}});
    await tx.auditLog.create({data: {actorUserId, action: "PLATFORM_USER_PASSWORD_RESET", entityType: "User", entityId: userId, after: {credential: true, sessionsRevoked: true}}});
    return {userId, unlocked: true, sessionsRevoked: true};
  });
}

export async function revokePlatformManagedUserSessions(actorUserId: string, userId: string) {
  await requirePlatformOwner(actorUserId);
  return database().$transaction(async (tx) => {
    const user = await tx.user.findUnique({where: {id: userId}, select: {id: true}});
    if (!user) notFound("User");
    const result = await tx.session.deleteMany({where: {userId}});
    await tx.auditLog.create({data: {actorUserId, action: "PLATFORM_USER_SESSIONS_REVOKED", entityType: "User", entityId: userId, after: {revokedSessions: result.count}}});
    return {userId, revokedSessions: result.count};
  });
}

export async function setPlatformHotelMembership(actorUserId: string, userId: string, input: Readonly<{
  hotelId: string;
  role: ManagedHotelRole;
  status: ManagedMembershipStatus;
}>) {
  await requirePlatformOwner(actorUserId);
  if (!HOTEL_ROLES.has(input.role)) throw new ApplicationError("INVALID_HOTEL_ROLE", "Invalid hotel role", 400);
  if (!MEMBERSHIP_STATUSES.has(input.status)) throw new ApplicationError("INVALID_MEMBERSHIP_STATUS", "Invalid membership status", 400);
  return database().$transaction(async (tx) => {
    const [user, hotel, before] = await Promise.all([
      tx.user.findUnique({where: {id: userId}, select: {id: true, platformRole: true}}),
      tx.hotel.findUnique({where: {id: input.hotelId}, select: {id: true, name: true}}),
      tx.hotelMembership.findUnique({where: {hotelId_userId: {hotelId: input.hotelId, userId}}, select: {id: true, role: true, status: true}}),
    ]);
    if (!user) notFound("User");
    if (!hotel) notFound("Hotel");
    const membership = await tx.hotelMembership.upsert({
      where: {hotelId_userId: {hotelId: input.hotelId, userId}},
      update: {role: input.role, status: input.status},
      create: {hotelId: input.hotelId, userId, role: input.role, status: input.status},
      select: {id: true, hotelId: true, userId: true, role: true, status: true, updatedAt: true},
    });
    if (user.platformRole === "GUEST") await tx.user.update({where: {id: userId}, data: {platformRole: "HOTEL_USER"}});
    await tx.auditLog.create({data: {
      hotelId: input.hotelId,
      actorUserId,
      action: before ? "HOTEL_MEMBERSHIP_UPDATED_BY_OWNER" : "HOTEL_MEMBERSHIP_CREATED_BY_OWNER",
      entityType: "HotelMembership",
      entityId: membership.id,
      before: before ? {role: before.role, status: before.status} : undefined,
      after: {role: membership.role, status: membership.status, userId},
    }});
    return membership;
  });
}

export async function removePlatformHotelMembership(actorUserId: string, userId: string, membershipId: string) {
  await requirePlatformOwner(actorUserId);
  return database().$transaction(async (tx) => {
    const membership = await tx.hotelMembership.findUnique({where: {id: membershipId}, select: {id: true, userId: true, hotelId: true, role: true, status: true}});
    if (!membership || membership.userId !== userId) notFound("Hotel membership");
    await tx.hotelMembership.delete({where: {id: membershipId}});
    const [remaining, user] = await Promise.all([
      tx.hotelMembership.count({where: {userId}}),
      tx.user.findUnique({where: {id: userId}, select: {platformRole: true}}),
    ]);
    if (remaining === 0 && user?.platformRole === "HOTEL_USER") await tx.user.update({where: {id: userId}, data: {platformRole: "GUEST"}});
    await tx.auditLog.create({data: {
      hotelId: membership.hotelId,
      actorUserId,
      action: "HOTEL_MEMBERSHIP_REMOVED_BY_OWNER",
      entityType: "HotelMembership",
      entityId: membership.id,
      before: {userId, role: membership.role, status: membership.status},
      after: {removed: true},
    }});
    return {membershipId, removed: true};
  });
}
