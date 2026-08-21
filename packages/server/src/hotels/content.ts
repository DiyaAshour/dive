import type { UpdateHotelPublicContentInput } from "@platform/contracts";
import { database } from "@platform/database";
import { notFound } from "../errors";
import { requireHotelPermission } from "./authorization";

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
      photos: {select: {id: true, url: true, alt: true, sortOrder: true}, orderBy: {sortOrder: "asc"}},
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
  return db.$transaction(async (tx) => {
    const hotel = await tx.hotel.update({
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
    await tx.hotelPhoto.deleteMany({where: {hotelId}});
    await tx.hotelAmenity.deleteMany({where: {hotelId}});
    if (input.photos.length) {
      await tx.hotelPhoto.createMany({data: input.photos.map((photo) => ({hotelId, url: photo.url, alt: photo.alt, sortOrder: photo.sortOrder}))});
    }
    if (input.amenities.length) {
      await tx.hotelAmenity.createMany({data: input.amenities.map((amenity) => ({hotelId, code: amenity.code, name: amenity.name, category: amenity.category}))});
    }
    await tx.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: "HOTEL_PUBLIC_CONTENT_UPDATED",
        entityType: "Hotel",
        entityId: hotel.id,
        before: auditValue(before),
        after: auditValue(input),
      },
    });
    return hotel;
  });
}

function auditValue(value: {
  area?: string | null;
  description?: string | null;
  starRating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  photos: Array<{url: string; alt?: string | null; sortOrder: number}>;
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
    photos: value.photos.map((photo) => ({url: photo.url, alt: photo.alt ?? null, sortOrder: photo.sortOrder})),
    amenities: value.amenities.map((amenity) => ({code: amenity.code, name: amenity.name, category: amenity.category ?? null})),
  };
}
