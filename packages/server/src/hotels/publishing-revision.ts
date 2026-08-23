import { database } from "@platform/database";
import { notFound } from "../errors";

type PublishRevisionClient = Pick<ReturnType<typeof database>, "hotel" | "propertyReview" | "auditLog">;

export async function recordPublishMutation(
  db: PublishRevisionClient,
  hotelId: string,
  actorUserId: string | null,
  source: string,
) {
  const hotel = await db.hotel.findUnique({where: {id: hotelId}, select: {id: true, status: true, publishRevision: true}});
  if (!hotel) notFound("Hotel");
  const nextRevision = hotel.publishRevision + 1;
  const now = new Date();

  const stale = await db.propertyReview.updateMany({
    where: {hotelId, status: "PENDING"},
    data: {status: "STALE", reviewedAt: now, decisionReason: `Property changed after submission: ${source}`},
  });

  const resetPendingReview = hotel.status === "PENDING_REVIEW";
  const updated = await db.hotel.update({
    where: {id: hotelId},
    data: {
      publishRevision: nextRevision,
      ...(resetPendingReview ? {status: "DRAFT" as const, verified: false} : {}),
    },
    select: {id: true, status: true, verified: true, publishRevision: true},
  });

  if (stale.count > 0) {
    await db.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: "PROPERTY_REVIEW_STALE",
        entityType: "Hotel",
        entityId: hotelId,
        after: {source, staleReviews: stale.count, publishRevision: nextRevision},
      },
    });
  }

  return updated;
}
