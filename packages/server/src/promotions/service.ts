import type { CreatePromotionInput, UpdatePromotionStatusInput } from "@platform/contracts";
import { database } from "@platform/database";
import { badRequest, notFound } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";

export async function listHotelPromotions(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  return database().promotion.findMany({
    where: {hotelId},
    include: {ratePlans: {include: {ratePlan: {select: {id: true, name: true, code: true, roomType: {select: {name: true}}}}}}},
    orderBy: [{status: "asc"}, {createdAt: "desc"}],
  });
}

export async function createHotelPromotion(actorUserId: string, hotelId: string, input: CreatePromotionInput) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const ratePlanIds = [...new Set(input.ratePlanIds)];
  const ratePlans = await database().ratePlan.findMany({where: {id: {in: ratePlanIds}, roomType: {hotelId}}, select: {id: true}});
  if (ratePlans.length !== ratePlanIds.length) badRequest("INVALID_PROMOTION_RATE_PLAN", "Every promotion rate plan must belong to this hotel");

  return database().$transaction(async (tx) => {
    const promotion = await tx.promotion.create({data: {
      hotelId,
      name: input.name,
      code: input.code,
      discountPercent: input.discountPercent,
      bookingStartsAt: new Date(input.bookingStartsAt),
      bookingEndsAt: new Date(input.bookingEndsAt),
      stayStartsOn: new Date(`${input.stayStartsOn}T00:00:00.000Z`),
      stayEndsOn: new Date(`${input.stayEndsOn}T00:00:00.000Z`),
      minimumNights: input.minimumNights,
      ratePlans: {create: ratePlanIds.map((ratePlanId) => ({ratePlanId}))},
    }, include: {ratePlans: true}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "PROMOTION_CREATED", entityType: "Promotion", entityId: promotion.id, after: {name: promotion.name, code: promotion.code, discountPercent: Number(promotion.discountPercent), ratePlanIds}}});
    return promotion;
  });
}

export async function updateHotelPromotionStatus(actorUserId: string, hotelId: string, promotionId: string, input: UpdatePromotionStatusInput) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const promotion = await database().promotion.findFirst({where: {id: promotionId, hotelId}});
  if (!promotion) notFound("Promotion");
  if (promotion.status === input.status) return promotion;

  return database().$transaction(async (tx) => {
    const updated = await tx.promotion.update({where: {id: promotionId}, data: {status: input.status}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "PROMOTION_STATUS_UPDATED", entityType: "Promotion", entityId: promotionId, before: {status: promotion.status}, after: {status: input.status}}});
    return updated;
  });
}
