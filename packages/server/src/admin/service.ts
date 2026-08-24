import type { ModerateGuestReviewInput, UpdatePlatformHotelInput } from "@platform/contracts";
import { database } from "@platform/database";
import type { Prisma } from "@platform/database";
import { ApplicationError, notFound } from "../errors";
import { recordPublishMutation } from "../hotels/publishing-revision";
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

export async function listPlatformHotels(actorUserId: string, filters: {query?: string; status?: string} = {}) {
  await requirePlatformAdmin(actorUserId);
  const query = filters.query?.trim().slice(0, 120) ?? "";
  const status = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"].includes(filters.status ?? "")
    ? filters.status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED"
    : undefined;
  return database().hotel.findMany({
    where: {
      ...(status ? {status} : {}),
      ...(query ? {OR: [
        {name: {contains: query, mode: "insensitive"}},
        {slug: {contains: query, mode: "insensitive"}},
        {city: {contains: query, mode: "insensitive"}},
        {address: {contains: query, mode: "insensitive"}},
      ]} : {}),
    },
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
      _count: {select: {roomTypes: true, bookings: true, guestReviews: true, memberships: true}},
    },
    orderBy: {createdAt: "desc"},
    take: 200,
  });
}

export async function getPlatformHotel(actorUserId: string, hotelId: string) {
  await requirePlatformAdmin(actorUserId);
  const hotel = await database().hotel.findUnique({
    where: {id: hotelId},
    select: platformHotelSelect,
  });
  if (!hotel) notFound("Hotel");
  return serializePlatformHotel(hotel);
}

export async function updatePlatformHotel(actorUserId: string, hotelId: string, input: UpdatePlatformHotelInput) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  return db.$transaction(async (tx) => {
    const before = await tx.hotel.findUnique({where: {id: hotelId}, select: platformHotelSelect});
    if (!before) notFound("Hotel");

    await tx.hotel.update({
      where: {id: hotelId},
      data: {
        name: input.name,
        city: input.city,
        countryCode: input.countryCode,
        address: input.address,
        area: input.area,
        description: input.description,
        starRating: input.starRating,
        latitude: input.latitude,
        longitude: input.longitude,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime,
        timezone: input.timezone,
        currency: input.currency,
        commissionRate: input.commissionRate,
        serviceRate: input.serviceRate,
        taxRate: input.taxRate,
        overbookingEnabled: input.overbookingEnabled,
      },
    });
    await tx.hotelAmenity.deleteMany({where: {hotelId}});
    if (input.amenities.length) {
      await tx.hotelAmenity.createMany({data: input.amenities.map((amenity) => ({hotelId, code: amenity.code, name: amenity.name, category: amenity.category}))});
    }
    await recordPublishMutation(tx, hotelId, actorUserId, "platform administrator hotel update");
    const after = await tx.hotel.findUnique({where: {id: hotelId}, select: platformHotelSelect});
    if (!after) notFound("Hotel");
    await tx.auditLog.create({data: {
      hotelId,
      actorUserId,
      action: "ADMIN_HOTEL_UPDATED",
      entityType: "Hotel",
      entityId: hotelId,
      before: platformHotelAuditValue(before),
      after: platformHotelAuditValue(after),
    }});
    return serializePlatformHotel(after);
  });
}

export async function listPlatformGuestReviews(actorUserId: string, filters: {query?: string; hotelId?: string; status?: string} = {}) {
  await requirePlatformAdmin(actorUserId);
  const query = filters.query?.trim().slice(0, 120) ?? "";
  const status = filters.status === "PUBLISHED" || filters.status === "HIDDEN" ? filters.status : undefined;
  return database().guestReview.findMany({
    where: {
      ...(filters.hotelId ? {hotelId: filters.hotelId} : {}),
      ...(status ? {status} : {}),
      ...(query ? {OR: [
        {title: {contains: query, mode: "insensitive"}},
        {comment: {contains: query, mode: "insensitive"}},
        {hotelReply: {contains: query, mode: "insensitive"}},
        {hotel: {name: {contains: query, mode: "insensitive"}}},
        {booking: {reference: {contains: query, mode: "insensitive"}}},
      ]} : {}),
    },
    select: {
      id: true,
      overall: true,
      title: true,
      comment: true,
      status: true,
      moderationReason: true,
      moderatedAt: true,
      hotelReply: true,
      repliedAt: true,
      createdAt: true,
      hotel: {select: {id: true, name: true, city: true}},
      booking: {select: {reference: true, guestName: true, departure: true}},
      moderatedBy: {select: {displayName: true, email: true}},
    },
    orderBy: {createdAt: "desc"},
    take: 300,
  });
}

export async function moderatePlatformGuestReview(actorUserId: string, reviewId: string, input: ModerateGuestReviewInput) {
  await requirePlatformAdmin(actorUserId);
  return database().$transaction(async (tx) => {
    const before = await tx.guestReview.findUnique({where: {id: reviewId}, select: {id: true, hotelId: true, status: true, moderationReason: true, moderatedAt: true}});
    if (!before) notFound("Review");
    const moderatedAt = new Date();
    const updated = await tx.guestReview.update({
      where: {id: reviewId},
      data: {status: input.status, moderationReason: input.reason, moderatedByUserId: actorUserId, moderatedAt},
      select: {id: true, hotelId: true, status: true, moderationReason: true, moderatedAt: true},
    });
    await tx.auditLog.create({data: {
      hotelId: before.hotelId,
      actorUserId,
      action: input.status === "HIDDEN" ? "GUEST_REVIEW_HIDDEN" : "GUEST_REVIEW_RESTORED",
      entityType: "GuestReview",
      entityId: reviewId,
      before: {status: before.status, moderationReason: before.moderationReason, moderatedAt: before.moderatedAt?.toISOString() ?? null},
      after: {status: updated.status, moderationReason: updated.moderationReason, moderatedAt: updated.moderatedAt?.toISOString() ?? null},
    }});
    return updated;
  });
}

export async function getAdminNavigationCounts(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  const [propertyReviews, documents, hiddenReviews] = await Promise.all([
    database().propertyReview.count({where: {status: "PENDING"}}),
    database().hotelDocument.count({where: {status: "PENDING"}}),
    database().guestReview.count({where: {status: "HIDDEN"}}),
  ]);
  return {verification: propertyReviews + documents, hiddenReviews};
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

const platformHotelSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  countryCode: true,
  address: true,
  area: true,
  description: true,
  starRating: true,
  latitude: true,
  longitude: true,
  checkInTime: true,
  checkOutTime: true,
  timezone: true,
  currency: true,
  status: true,
  verified: true,
  publishRevision: true,
  publishedRevision: true,
  lastPublishedAt: true,
  commissionRate: true,
  serviceRate: true,
  taxRate: true,
  overbookingEnabled: true,
  amenities: {select: {code: true, name: true, category: true}, orderBy: [{category: "asc" as const}, {name: "asc" as const}]},
  _count: {select: {roomTypes: true, bookings: true, guestReviews: true, memberships: true, photos: true}},
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HotelSelect;

type PlatformHotel = Prisma.HotelGetPayload<{select: typeof platformHotelSelect}>;

function serializePlatformHotel(hotel: PlatformHotel) {
  return {
    ...hotel,
    latitude: hotel.latitude === null ? null : Number(hotel.latitude),
    longitude: hotel.longitude === null ? null : Number(hotel.longitude),
    commissionRate: Number(hotel.commissionRate),
    serviceRate: Number(hotel.serviceRate),
    taxRate: Number(hotel.taxRate),
  };
}

function platformHotelAuditValue(hotel: PlatformHotel) {
  const serialized = serializePlatformHotel(hotel);
  return {
    name: serialized.name,
    city: serialized.city,
    countryCode: serialized.countryCode,
    address: serialized.address,
    area: serialized.area,
    description: serialized.description,
    starRating: serialized.starRating,
    latitude: serialized.latitude,
    longitude: serialized.longitude,
    checkInTime: serialized.checkInTime,
    checkOutTime: serialized.checkOutTime,
    timezone: serialized.timezone,
    currency: serialized.currency,
    commissionRate: serialized.commissionRate,
    serviceRate: serialized.serviceRate,
    taxRate: serialized.taxRate,
    overbookingEnabled: serialized.overbookingEnabled,
    amenities: serialized.amenities,
  };
}
