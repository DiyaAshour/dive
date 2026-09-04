import { localDateInTimeZone } from "@platform/core";
import type { PropertyReviewDecisionInput, SuspendPropertyInput } from "@platform/contracts";
import { database } from "@platform/database";
import { badRequest, notFound } from "../errors";
import { requirePlatformAdmin } from "../admin/authorization";
import { requireHotelPermission } from "../hotels/authorization";

const REVIEW_WINDOW_DAYS = 30;
const MIN_SELLABLE_DAYS = 7;
const MIN_DESCRIPTION_LENGTH = 80;
const MIN_PHOTOS = 3;
const MIN_AMENITIES = 10;
const REQUIRED_DOCUMENT_TYPES = ["COMMERCIAL_REGISTRATION", "BUSINESS_LICENSE"] as const;

type ReadinessCheck = {code: string; label: string; passed: boolean; detail: string};

export async function getPublishingReadiness(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  return buildPublishingReadiness(hotelId);
}

export async function submitPropertyForReview(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "publishing:manage");
  const readiness = await buildPublishingReadiness(hotelId);
  if (readiness.status === "ACTIVE") badRequest("PROPERTY_ALREADY_ACTIVE", "This property is already active");
  if (readiness.status === "SUSPENDED") badRequest("PROPERTY_SUSPENDED", "A suspended property cannot be submitted for review");
  if (!readiness.ready) {
    const failed = readiness.checks.filter((check) => !check.passed).map((check) => check.label).join(", ");
    badRequest("PROPERTY_NOT_READY", `Complete the publishing requirements before submission: ${failed}`);
  }

  const db = database();
  const existing = await db.propertyReview.findFirst({where: {hotelId, status: "PENDING", submittedRevision: readiness.publishRevision}, orderBy: {submittedAt: "desc"}});
  if (existing) return {review: existing, readiness, reused: true};

  const snapshot = readinessSnapshot(readiness);
  const review = await db.$transaction(async (tx) => {
    const current = await tx.hotel.findUnique({where: {id: hotelId}, select: {publishRevision: true, status: true}});
    if (!current) notFound("Hotel");
    if (current.publishRevision !== readiness.publishRevision) badRequest("PROPERTY_CHANGED_DURING_SUBMISSION", "The property changed while it was being submitted; review readiness and submit again");
    if (current.status === "ACTIVE") badRequest("PROPERTY_ALREADY_ACTIVE", "This property is already active");
    if (current.status === "SUSPENDED") badRequest("PROPERTY_SUSPENDED", "A suspended property cannot be submitted for review");
    const raced = await tx.propertyReview.findFirst({where: {hotelId, status: "PENDING", submittedRevision: readiness.publishRevision}, orderBy: {submittedAt: "desc"}});
    if (raced) return raced;
    await tx.propertyReview.updateMany({where: {hotelId, status: "PENDING"}, data: {status: "STALE", reviewedAt: new Date(), decisionReason: "Superseded by a newer submission"}});
    const created = await tx.propertyReview.create({data: {hotelId, submittedByUserId: actorUserId, submittedRevision: readiness.publishRevision, readinessSnapshot: snapshot}});
    await tx.hotel.update({where: {id: hotelId}, data: {status: "PENDING_REVIEW", verified: false}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "PROPERTY_SUBMITTED_FOR_REVIEW", entityType: "PropertyReview", entityId: created.id, after: {submittedRevision: readiness.publishRevision, readiness: snapshot}}});
    return created;
  });

  return {review, readiness: {...readiness, status: "PENDING_REVIEW" as const}, reused: false};
}

export async function listPropertyReviewQueue(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  const reviews = await database().propertyReview.findMany({
    where: {status: "PENDING"},
    orderBy: {submittedAt: "asc"},
    take: 200,
    select: {
      id: true,
      submittedRevision: true,
      status: true,
      readinessSnapshot: true,
      submittedAt: true,
      submittedBy: {select: {id: true, displayName: true, email: true}},
      hotel: {
        select: {
          id: true,
          name: true,
          city: true,
          countryCode: true,
          status: true,
          verified: true,
          publishRevision: true,
          starRating: true,
          photos: {where: {mediaObject: {state: "READY"}}, select: {mediaObject: {select: {publicUrl: true}}}, orderBy: {sortOrder: "asc"}, take: 1},
        },
      },
    },
  });
  return reviews.map((review) => ({
    ...review,
    hotel: {...review.hotel, photos: review.hotel.photos.flatMap((photo) => photo.mediaObject.publicUrl ? [{url: photo.mediaObject.publicUrl}] : [])},
    stale: review.hotel.publishRevision !== review.submittedRevision,
  }));
}

export async function reviewPropertySubmission(actorUserId: string, reviewId: string, input: PropertyReviewDecisionInput) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const review = await db.propertyReview.findUnique({where: {id: reviewId}, include: {hotel: {select: {id: true, status: true, publishRevision: true}}}});
  if (!review) notFound("Property review");
  if (review.status !== "PENDING") badRequest("REVIEW_ALREADY_RESOLVED", "This property review has already been resolved");

  if (review.hotel.publishRevision !== review.submittedRevision) {
    await invalidateReview(review.id, review.hotel.id, "Property changed after this review was submitted");
    badRequest("REVIEW_STALE", "The property changed after submission and must be submitted again");
  }

  if (input.decision === "REJECT") {
    return db.$transaction(async (tx) => {
      const resolved = await tx.propertyReview.updateMany({where: {id: review.id, status: "PENDING"}, data: {status: "REJECTED", reviewedByUserId: actorUserId, reviewedAt: new Date(), decisionReason: input.reason}});
      if (resolved.count !== 1) badRequest("REVIEW_ALREADY_RESOLVED", "This property review has already been resolved");
      await tx.hotel.update({where: {id: review.hotel.id}, data: {status: "DRAFT", verified: false}});
      await tx.auditLog.create({data: {hotelId: review.hotel.id, actorUserId, action: "PROPERTY_REVIEW_REJECTED", entityType: "PropertyReview", entityId: review.id, after: {submittedRevision: review.submittedRevision, reason: input.reason}}});
      return {reviewId: review.id, hotelId: review.hotel.id, status: "REJECTED" as const};
    });
  }

  const readiness = await buildPublishingReadiness(review.hotel.id);
  if (!readiness.ready) {
    await invalidateReview(review.id, review.hotel.id, "Property no longer meets publishing readiness requirements");
    badRequest("PROPERTY_NO_LONGER_READY", "The property no longer satisfies publishing requirements and must be submitted again");
  }

  return db.$transaction(async (tx) => {
    const hotelUpdated = await tx.hotel.updateMany({
      where: {id: review.hotel.id, status: "PENDING_REVIEW", publishRevision: review.submittedRevision},
      data: {status: "ACTIVE", verified: true, publishedRevision: review.submittedRevision, lastPublishedAt: new Date()},
    });
    if (hotelUpdated.count !== 1) badRequest("REVIEW_STALE", "The property changed or is no longer pending review");
    const resolved = await tx.propertyReview.updateMany({where: {id: review.id, status: "PENDING"}, data: {status: "APPROVED", reviewedByUserId: actorUserId, reviewedAt: new Date(), decisionReason: input.reason ?? null}});
    if (resolved.count !== 1) badRequest("REVIEW_ALREADY_RESOLVED", "This property review has already been resolved");
    await tx.auditLog.create({data: {hotelId: review.hotel.id, actorUserId, action: "PROPERTY_REVIEW_APPROVED", entityType: "PropertyReview", entityId: review.id, after: {publishedRevision: review.submittedRevision}}});
    return {reviewId: review.id, hotelId: review.hotel.id, status: "APPROVED" as const, publishedRevision: review.submittedRevision};
  });
}

export async function suspendProperty(actorUserId: string, hotelId: string, input: SuspendPropertyInput) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const hotel = await db.hotel.findUnique({where: {id: hotelId}, select: {id: true, status: true, verified: true}});
  if (!hotel) notFound("Hotel");
  if (hotel.status === "SUSPENDED") return {hotelId, status: "SUSPENDED" as const, reused: true};
  await db.$transaction(async (tx) => {
    await tx.propertyReview.updateMany({where: {hotelId, status: "PENDING"}, data: {status: "STALE", reviewedAt: new Date(), decisionReason: "Property suspended by platform administration"}});
    await tx.hotel.update({where: {id: hotelId}, data: {status: "SUSPENDED", verified: false}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "PROPERTY_SUSPENDED", entityType: "Hotel", entityId: hotelId, before: {status: hotel.status, verified: hotel.verified}, after: {status: "SUSPENDED", verified: false, reason: input.reason}}});
  });
  return {hotelId, status: "SUSPENDED" as const, reused: false};
}

export async function restoreSuspendedProperty(actorUserId: string, hotelId: string) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const hotel = await db.hotel.findUnique({where: {id: hotelId}, select: {id: true, status: true}});
  if (!hotel) notFound("Hotel");
  if (hotel.status !== "SUSPENDED") badRequest("PROPERTY_NOT_SUSPENDED", "Only suspended properties can be restored");
  await db.$transaction(async (tx) => {
    await tx.hotel.update({where: {id: hotelId}, data: {status: "DRAFT", verified: false}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "PROPERTY_RESTORED_TO_DRAFT", entityType: "Hotel", entityId: hotelId, before: {status: "SUSPENDED"}, after: {status: "DRAFT", verified: false}}});
  });
  return {hotelId, status: "DRAFT" as const};
}

async function buildPublishingReadiness(hotelId: string) {
  const db = database();
  const hotel = await db.hotel.findUnique({
    where: {id: hotelId},
    select: {
      id: true,
      name: true,
      status: true,
      verified: true,
      publishRevision: true,
      publishedRevision: true,
      timezone: true,
      description: true,
      starRating: true,
      checkInTime: true,
      checkOutTime: true,
      overbookingEnabled: true,
      photos: {where: {mediaObject: {state: "READY"}}, select: {id: true}},
      amenities: {select: {id: true}},
      documents: {where: {status: "APPROVED", mediaObject: {state: "READY"}}, select: {type: true}},
      reviews: {orderBy: {submittedAt: "desc"}, take: 1, select: {id: true, status: true, submittedRevision: true, decisionReason: true, submittedAt: true, reviewedAt: true}},
      roomTypes: {
        where: {active: true},
        select: {
          id: true,
          description: true,
          maxGuests: true,
          maxAdults: true,
          maxChildren: true,
          maxInfants: true,
          unitType: true,
          bedroomCount: true,
          sizeValue: true,
          beds: {select: {area: true, type: true, quantity: true}},
          amenities: {select: {id: true}},
          photos: {where: {mediaObject: {state: "READY"}}, select: {id: true}},
          inventory: {select: {date: true, available: true, overbookingLimit: true}},
          ratePlans: {
            where: {active: true},
            select: {
              id: true,
              allowPayNow: true,
              allowPayAtHotel: true,
              cancellationPolicy: {select: {id: true, rules: {select: {id: true}}}},
              rates: {select: {date: true, closed: true, stopSell: true}},
            },
          },
        },
      },
    },
  });
  if (!hotel) notFound("Hotel");

  const localToday = localDateInTimeZone(new Date(), hotel.timezone);
  const from = new Date(`${localToday}T00:00:00.000Z`);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + REVIEW_WINDOW_DAYS);

  const activePlans = hotel.roomTypes.flatMap((roomType) => roomType.ratePlans);
  const validPlans = activePlans.filter((plan) => Boolean(plan.cancellationPolicy?.rules.length) && (plan.allowPayNow || plan.allowPayAtHotel));
  const sellableDates = new Set<string>();

  for (const roomType of hotel.roomTypes) {
    const inventoryByDate = new Map(roomType.inventory.filter((entry) => entry.date >= from && entry.date < to).map((entry) => [dateKey(entry.date), entry]));
    for (const plan of roomType.ratePlans) {
      if (!plan.cancellationPolicy?.rules.length || (!plan.allowPayNow && !plan.allowPayAtHotel)) continue;
      for (const rate of plan.rates) {
        if (rate.date < from || rate.date >= to || rate.closed || rate.stopSell) continue;
        const inventory = inventoryByDate.get(dateKey(rate.date));
        if (!inventory) continue;
        const floor = hotel.overbookingEnabled ? -inventory.overbookingLimit : 0;
        if (inventory.available > floor) sellableDates.add(dateKey(rate.date));
      }
    }
  }

  const approvedDocumentTypes = new Set(hotel.documents.map((document) => document.type));
  const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter((type) => !approvedDocumentTypes.has(type));
  const completeRoomProducts = hotel.roomTypes.filter((room) => {
    const totalBeds = room.beds.reduce((sum, bed) => sum + bed.quantity, 0);
    const uniqueBeds = new Set(room.beds.map((bed) => `${bed.area.trim().toLocaleLowerCase()}::${bed.type}`)).size === room.beds.length;
    const unitRules = room.unitType === "DORMITORY_ROOM"
      ? room.maxAdults >= 2 && totalBeds >= 2
      : room.unitType === "BED_IN_DORMITORY"
        ? room.maxGuests === 1 && room.maxAdults === 1 && totalBeds === 1
        : !["SUITE", "APARTMENT", "VILLA", "CHALET", "BUNGALOW", "HOLIDAY_HOME"].includes(room.unitType) || room.bedroomCount >= 1;
    return (
    (room.description?.trim().length ?? 0) >= 40
    && room.maxAdults <= room.maxGuests
    && room.maxGuests <= room.maxAdults + room.maxChildren + room.maxInfants
    && (room.maxChildren === 0 || room.maxChildren < room.maxGuests)
    && (room.maxInfants === 0 || room.maxInfants < room.maxGuests)
    && room.sizeValue !== null
    && totalBeds > 0
    && uniqueBeds
    && unitRules
    && room.amenities.length >= 3
    && room.photos.length > 0
    );
  });
  const checks: ReadinessCheck[] = [
    check("DESCRIPTION", "Property description", (hotel.description?.trim().length ?? 0) >= MIN_DESCRIPTION_LENGTH, `At least ${MIN_DESCRIPTION_LENGTH} characters`),
    check("STAR_RATING", "Official star rating", hotel.starRating !== null && hotel.starRating >= 1 && hotel.starRating <= 5, "Set a star rating from 1 to 5"),
    check("CHECK_TIMES", "Check-in and check-out times", Boolean(hotel.checkInTime && hotel.checkOutTime), "Both arrival and departure times are required"),
    check("PHOTOS", "Verified property photos", hotel.photos.length >= MIN_PHOTOS, `At least ${MIN_PHOTOS} completed object-storage photos`),
    check("AMENITIES", "Property amenities", hotel.amenities.length >= MIN_AMENITIES, `At least ${MIN_AMENITIES} amenities`),
    check("VERIFICATION_DOCUMENTS", "Verification documents", missingDocuments.length === 0, missingDocuments.length === 0 ? "Required verification documents approved" : `Missing approved documents: ${missingDocuments.join(", ")}`),
    check("ROOM_TYPES", "Active room type", hotel.roomTypes.length > 0, "At least one active room type"),
    check("ROOM_PRODUCTS", "Complete room products", hotel.roomTypes.length > 0 && completeRoomProducts.length === hotel.roomTypes.length, "Every active room requires occupancy, beds, size, description, three facilities and a room photo"),
    check("RATE_PLANS", "Bookable rate plan", validPlans.length > 0, "At least one active plan with payment mode and cancellation policy"),
    check("SELLABLE_CALENDAR", "Live rates and inventory", sellableDates.size >= MIN_SELLABLE_DAYS, `At least ${MIN_SELLABLE_DAYS} sellable days in the next ${REVIEW_WINDOW_DAYS} days`),
  ];

  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    status: hotel.status,
    verified: hotel.verified,
    publishRevision: hotel.publishRevision,
    publishedRevision: hotel.publishedRevision,
    ready: checks.every((item) => item.passed),
    checks,
    sellableDays: sellableDates.size,
    reviewWindowDays: REVIEW_WINDOW_DAYS,
    latestReview: hotel.reviews[0] ?? null,
  };
}

async function invalidateReview(reviewId: string, hotelId: string, reason: string) {
  await database().$transaction(async (tx) => {
    await tx.propertyReview.updateMany({where: {id: reviewId, status: "PENDING"}, data: {status: "STALE", reviewedAt: new Date(), decisionReason: reason}});
    await tx.hotel.updateMany({where: {id: hotelId, status: "PENDING_REVIEW"}, data: {status: "DRAFT", verified: false}});
    await tx.auditLog.create({data: {hotelId, actorUserId: null, action: "PROPERTY_REVIEW_STALE", entityType: "PropertyReview", entityId: reviewId, after: {reason}}});
  });
}

function readinessSnapshot(readiness: Awaited<ReturnType<typeof buildPublishingReadiness>>) {
  return {generatedAt: new Date().toISOString(), publishRevision: readiness.publishRevision, ready: readiness.ready, sellableDays: readiness.sellableDays, reviewWindowDays: readiness.reviewWindowDays, checks: readiness.checks};
}

function check(code: string, label: string, passed: boolean, detail: string): ReadinessCheck {
  return {code, label, passed, detail};
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
