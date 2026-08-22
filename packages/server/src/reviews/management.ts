import { database } from "@platform/database";
import { requireHotelPermission } from "../hotels/authorization";

export async function listHotelReviewsForManagement(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:view");
  const reviews = await database().guestReview.findMany({
    where: {hotelId},
    include: {booking: {select: {reference: true, guestName: true, departure: true}}},
    orderBy: {createdAt: "desc"},
    take: 200,
  });
  return reviews.map((review) => ({
    id: review.id,
    bookingReference: review.booking.reference,
    guestName: review.booking.guestName,
    stayCompleted: review.booking.departure.toISOString().slice(0, 10),
    overall: review.overall,
    cleanliness: review.cleanliness,
    staff: review.staff,
    location: review.location,
    facilities: review.facilities,
    comfort: review.comfort,
    value: review.value,
    title: review.title,
    comment: review.comment,
    status: review.status,
    hotelReply: review.hotelReply,
    repliedAt: review.repliedAt,
    createdAt: review.createdAt,
  }));
}
