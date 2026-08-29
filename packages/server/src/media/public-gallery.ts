import type { HotelPhotoCategory } from "@platform/contracts";
import { database } from "@platform/database";
import { notFound } from "../errors";
import { hotelPhotoCategoryMap } from "./photo-gallery";

export async function getPublicHotelGallery(hotelId: string) {
  const hotel = await database().hotel.findFirst({
    where: {status: "ACTIVE", verified: true, OR: [{id: hotelId}, {slug: hotelId}]},
    select: {
      id: true,
      name: true,
      photos: {
        where: {mediaObject: {state: "READY"}},
        select: {id: true, alt: true, sortOrder: true, roomTypeId: true, mediaObject: {select: {publicUrl: true}}},
        orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}],
      },
    },
  });
  if (!hotel) notFound("Hotel");
  const categoryMap = await hotelPhotoCategoryMap(hotel.id, hotel.photos.map((photo) => photo.id));
  return hotel.photos.flatMap((photo) => photo.mediaObject.publicUrl ? [{
    id: photo.id,
    url: photo.mediaObject.publicUrl,
    alt: photo.alt,
    sortOrder: photo.sortOrder,
    roomTypeId: photo.roomTypeId,
    category: (categoryMap.get(photo.id) ?? (photo.roomTypeId ? "ROOM" : "OTHER")) as HotelPhotoCategory,
  }] : []);
}
