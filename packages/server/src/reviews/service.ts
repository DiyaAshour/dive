import { localDateInTimeZone } from "@platform/core";
import type { CreateGuestReviewInput, HotelReviewReplyInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, notFound } from "../errors";
import { requireBookingAccess } from "../bookings/authorization";
import { requireHotelPermission } from "../hotels/authorization";

export type ReviewBookingAccess = Readonly<{userId?: string | null; accessToken?: string | null}>;

export async function getReviewEligibility(bookingId: string, context: ReviewBookingAccess) {
  await requireBookingAccess(bookingId, context);
  const booking = await database().booking.findUnique({
    where: {id: bookingId},
    select: {id: true, status: true, departure: true, hotel: {select: {timezone: true}}, review: {select: {id: true}}},
  });
  if (!booking) notFound("Booking");
  const today = localDateInTimeZone(new Date(), booking.hotel.timezone);
  const departure = booking.departure.toISOString().slice(0, 10);
  const completedStay = (booking.status === "CONFIRMED" || booking.status === "MODIFIED") && departure <= today;
  return {bookingId, eligible: completedStay && !booking.review, alreadyReviewed: Boolean(booking.review), departure, today};
}

export async function createGuestReview(bookingId: string, input: CreateGuestReviewInput, context: ReviewBookingAccess) {
  await requireBookingAccess(bookingId, context);
  const db = database();
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: {id: bookingId},
      select: {id: true, hotelId: true, status: true, departure: true, hotel: {select: {timezone: true}}, review: {select: {id: true}}},
    });
    if (!booking) notFound("Booking");
    if (booking.review) throw new ApplicationError("REVIEW_ALREADY_EXISTS", "This stay already has a review", 409);
    const today = localDateInTimeZone(new Date(), booking.hotel.timezone);
    const departure = booking.departure.toISOString().slice(0, 10);
    if ((booking.status !== "CONFIRMED" && booking.status !== "MODIFIED") || departure > today) {
      throw new ApplicationError("REVIEW_NOT_ELIGIBLE", "A review can be submitted only after the completed stay", 409);
    }
    return tx.guestReview.create({data: {
      bookingId,
      hotelId: booking.hotelId,
      authorUserId: context.userId ?? null,
      overall: input.overall,
      cleanliness: input.cleanliness,
      staff: input.staff,
      location: input.location,
      facilities: input.facilities,
      comfort: input.comfort,
      value: input.value,
      title: input.title ?? null,
      comment: input.comment,
    }});
  });
}

export async function getPublicHotelReviews(hotelId: string, limit = 20) {
  const hotel = await database().hotel.findFirst({where: {status: "ACTIVE", verified: true, OR: [{id: hotelId}, {slug: hotelId}]}, select: {id: true}});
  if (!hotel) notFound("Hotel");
  const [aggregate, reviews] = await Promise.all([
    database().guestReview.aggregate({where: {hotelId: hotel.id, status: "PUBLISHED"}, _count: {_all: true}, _avg: {overall: true, cleanliness: true, staff: true, location: true, facilities: true, comfort: true, value: true}}),
    database().guestReview.findMany({where: {hotelId: hotel.id, status: "PUBLISHED"}, select: {id: true, overall: true, cleanliness: true, staff: true, location: true, facilities: true, comfort: true, value: true, title: true, comment: true, hotelReply: true, repliedAt: true, createdAt: true, booking: {select: {guestName: true, departure: true}}}, orderBy: {createdAt: "desc"}, take: Math.max(1, Math.min(limit, 50))}),
  ]);
  return {
    summary: {count: aggregate._count._all, overall: numberOrNull(aggregate._avg.overall), cleanliness: numberOrNull(aggregate._avg.cleanliness), staff: numberOrNull(aggregate._avg.staff), location: numberOrNull(aggregate._avg.location), facilities: numberOrNull(aggregate._avg.facilities), comfort: numberOrNull(aggregate._avg.comfort), value: numberOrNull(aggregate._avg.value)},
    reviews: reviews.map((review) => ({...review, guestName: publicGuestName(review.booking.guestName), stayCompleted: review.booking.departure.toISOString().slice(0, 10), booking: undefined})),
  };
}

export async function replyToGuestReview(actorUserId: string, hotelId: string, reviewId: string, input: HotelReviewReplyInput) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:manage");
  const review = await database().guestReview.findFirst({where: {id: reviewId, hotelId}});
  if (!review) notFound("Review");
  return database().$transaction(async (tx) => {
    const updated = await tx.guestReview.update({where: {id: reviewId}, data: {hotelReply: input.reply, repliedByUserId: actorUserId, repliedAt: new Date()}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: review.hotelReply ? "GUEST_REVIEW_REPLY_UPDATED" : "GUEST_REVIEW_REPLIED", entityType: "GuestReview", entityId: reviewId, ...(review.hotelReply ? {before: {reply: review.hotelReply}} : {}), after: {reply: input.reply}}});
    return updated;
  });
}

function publicGuestName(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Verified guest";
  const first = parts[0] ?? "Guest";
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1]?.charAt(0) ?? ""}.` : "";
  return `${first}${lastInitial ? ` ${lastInitial}` : ""}`;
}

function numberOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}
