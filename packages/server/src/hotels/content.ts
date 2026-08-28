import type { UpdateHotelPublicContentInput } from "@platform/contracts";
import { database } from "@platform/database";
import { notFound } from "../errors";
import { syncHotelDestinationLinks } from "../discovery/destinations";
import { requireHotelPermission } from "./authorization";
import { recordPublishMutation } from "./publishing-revision";

export async function getHotelPublicContentForManagement(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const hotel = await database().hotel.findUnique({
    where: {id: hotelId},
    select: {
      id: true,
      area: true,
      description: true,
      starRating: true,
      latitude: true,
      longitude: true,
      checkInTime: true,
      checkOutTime: true,
      amenities: {select: {id: true, code: true, name: true, category: true}, orderBy: [{category: "asc"}, {name: "asc"}]},
    },
  });
  if (!hotel) notFound("Hotel");
  return {
    ...hotel,
    latitude: hotel.latitude === null ? null : Number(hotel.latitude),
    longitude: hotel.longitude === null ? null : Number(hotel.longitude),
  };
}

export async function updateHotelPublicContent(actorUserId: string, hotelId: string, input: UpdateHotelPublicContentInput) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:edit");
  const db = database();
  const before = await getHotelPublicContentForManagement(actorUserId, hotelId);
  const hotel = await db.$transaction(async (tx) => {
    const updated = await tx.hotel.update({
      where: {id: hotelId},
      data: {
        area: input.area,
        description: input.description,
        starRating: input.starRating,
        latitude: input.latitude,
        longitude: input.longitude,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime,
      },
      select: {id: true},
    });
    await tx.hotelAmenity.deleteMany({where: {hotelId}});
    if (input.amenities.length) {
      await tx.hotelAmenity.createMany({data: input.amenities.map((amenity) => ({hotelId, code: amenity.code, name: amenity.name, category: amenity.category}))});
    }
    await recordPublishMutation(tx, hotelId, actorUserId, "public hotel content updated");
    await tx.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: "HOTEL_PUBLIC_CONTENT_UPDATED",
        entityType: "Hotel",
        entityId: updated.id,
        before: auditValue(before),
        after: auditValue(input),
      },
    });
    return updated;
  });
  await syncHotelDestinationLinks(hotelId);
  return hotel;
}

function auditValue(value: {
  area?: string | null;
  description?: string | null;
  starRating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  amenities: Array<{code: string; name: string; category?: string | null}>;
}) {
  return {
    area: value.area ?? null,
    description: value.description ?? null,
    starRating: value.starRating ?? null,
    latitude: value.latitude ?? null,
    longitude: value.longitude ?? null,
    checkInTime: value.checkInTime ?? null,
    checkOutTime: value.checkOutTime ?? null,
    amenities: value.amenities.map((amenity) => ({code: amenity.code, name: amenity.name, category: amenity.category ?? null})),
  };
}
