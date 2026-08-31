import {database} from "@platform/database";
import {requirePlatformAdmin} from "./authorization";

const auditActorSelect = {
  id: true,
  email: true,
  displayName: true,
  platformRole: true,
  hotelMemberships: {
    where: {status: "ACTIVE" as const},
    select: {
      role: true,
      hotel: {select: {id: true, name: true}},
    },
  },
} as const;

export async function listPlatformAuditActors(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  return database().user.findMany({
    where: {
      OR: [
        {platformRole: "PLATFORM_ADMIN"},
        {hotelMemberships: {some: {status: "ACTIVE"}}},
      ],
    },
    select: auditActorSelect,
    orderBy: [{platformRole: "desc"}, {displayName: "asc"}],
  });
}

export async function listPlatformAuditActivity(actorUserId: string, limit = 300) {
  await requirePlatformAdmin(actorUserId);
  const take = Math.max(1, Math.min(Math.floor(limit), 500));
  const logs = await database().auditLog.findMany({
    orderBy: {createdAt: "desc"},
    take,
    select: {
      id: true,
      actorUserId: true,
      action: true,
      entityType: true,
      entityId: true,
      before: true,
      after: true,
      createdAt: true,
      hotel: {select: {id: true, name: true}},
    },
  });

  const actorIds = unique(logs.flatMap((log) => log.actorUserId ? [log.actorUserId] : []));
  const actors = actorIds.length ? await database().user.findMany({
    where: {id: {in: actorIds}},
    select: auditActorSelect,
  }) : [];
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));

  const userIds = entityIds(logs, "User");
  const bookingIds = entityIds(logs, "Booking");
  const roomTypeIds = entityIds(logs, "RoomType");
  const ratePlanIds = entityIds(logs, "RatePlan");
  const reviewIds = entityIds(logs, "GuestReview");
  const propertyReviewIds = entityIds(logs, "PropertyReview");
  const documentIds = entityIds(logs, "HotelDocument");

  const [users, bookings, roomTypes, ratePlans, reviews, propertyReviews, documents] = await Promise.all([
    userIds.length ? database().user.findMany({where: {id: {in: userIds}}, select: {id: true, displayName: true, email: true}}) : [],
    bookingIds.length ? database().booking.findMany({where: {id: {in: bookingIds}}, select: {id: true, reference: true, guestName: true, hotel: {select: {name: true}}}}) : [],
    roomTypeIds.length ? database().roomType.findMany({where: {id: {in: roomTypeIds}}, select: {id: true, name: true, hotel: {select: {name: true}}}}) : [],
    ratePlanIds.length ? database().ratePlan.findMany({where: {id: {in: ratePlanIds}}, select: {id: true, name: true, roomType: {select: {name: true, hotel: {select: {name: true}}}}}}) : [],
    reviewIds.length ? database().guestReview.findMany({where: {id: {in: reviewIds}}, select: {id: true, title: true, hotel: {select: {name: true}}}}) : [],
    propertyReviewIds.length ? database().propertyReview.findMany({where: {id: {in: propertyReviewIds}}, select: {id: true, hotel: {select: {name: true}}}}) : [],
    documentIds.length ? database().hotelDocument.findMany({where: {id: {in: documentIds}}, select: {id: true, type: true, hotel: {select: {name: true}}}}) : [],
  ]);

  const targetLabels = new Map<string, string>();
  for (const user of users) targetLabels.set(`User:${user.id}`, `${user.displayName} · ${user.email}`);
  for (const booking of bookings) targetLabels.set(`Booking:${booking.id}`, `${booking.reference} · ${booking.guestName} · ${booking.hotel.name}`);
  for (const room of roomTypes) targetLabels.set(`RoomType:${room.id}`, `${room.name} · ${room.hotel.name}`);
  for (const ratePlan of ratePlans) targetLabels.set(`RatePlan:${ratePlan.id}`, `${ratePlan.name} · ${ratePlan.roomType.name} · ${ratePlan.roomType.hotel.name}`);
  for (const review of reviews) targetLabels.set(`GuestReview:${review.id}`, `${review.title?.trim() || "Guest review"} · ${review.hotel.name}`);
  for (const review of propertyReviews) targetLabels.set(`PropertyReview:${review.id}`, `Property review · ${review.hotel.name}`);
  for (const document of documents) targetLabels.set(`HotelDocument:${document.id}`, `${document.type.replaceAll("_", " ")} · ${document.hotel.name}`);

  return logs.map((log) => ({
    ...log,
    actor: log.actorUserId ? actorById.get(log.actorUserId) ?? null : null,
    targetLabel: log.hotel?.name ?? (log.entityId ? targetLabels.get(`${log.entityType}:${log.entityId}`) ?? null : null),
  }));
}

function entityIds<T extends {entityType: string; entityId: string | null}>(logs: T[], entityType: string): string[] {
  return unique(logs.flatMap((log) => log.entityType === entityType && log.entityId ? [log.entityId] : []));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
