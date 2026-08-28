import { database } from "@platform/database";
import { notFound } from "../errors";

const livePhotoQuery = {
  where: {mediaObject: {state: "READY" as const}},
  select: {alt: true, sortOrder: true, mediaObject: {select: {publicUrl: true}}},
  orderBy: {sortOrder: "asc" as const},
};

export async function getPublicHotelSeoDetails(identifier: string) {
  const db = database();
  const hotel = await db.hotel.findFirst({
    where: {status: "ACTIVE", verified: true, OR: [{id: identifier}, {slug: identifier}]},
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      area: true,
      address: true,
      countryCode: true,
      description: true,
      starRating: true,
      latitude: true,
      longitude: true,
      updatedAt: true,
      photos: livePhotoQuery,
      amenities: {select: {code: true, name: true}, orderBy: {name: "asc"}},
      destinationLinks: {
        where: {primary: true},
        select: {destination: {select: {slug: true, countryCode: true, nameEn: true, nameAr: true, type: true}}},
        take: 1,
      },
    },
  });
  if (!hotel) notFound("Hotel");
  const reviews = await db.guestReview.aggregate({
    where: {hotelId: hotel.id, status: "PUBLISHED"},
    _count: {_all: true},
    _avg: {overall: true},
  });
  return {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    city: hotel.city,
    area: hotel.area,
    address: hotel.address,
    countryCode: hotel.countryCode,
    description: hotel.description,
    starRating: hotel.starRating,
    location: hotel.latitude === null || hotel.longitude === null ? null : {latitude: Number(hotel.latitude), longitude: Number(hotel.longitude)},
    updatedAt: hotel.updatedAt,
    photos: hotel.photos.flatMap((photo) => photo.mediaObject.publicUrl ? [{url: photo.mediaObject.publicUrl, alt: photo.alt ?? null}] : []),
    amenities: hotel.amenities,
    reviewSummary: {
      count: reviews._count._all,
      overall: reviews._avg.overall === null ? null : Math.round(reviews._avg.overall * 10) / 10,
    },
    primaryDestination: hotel.destinationLinks[0]?.destination ?? null,
  };
}

export async function resolvePublicHotelIdentifier(identifier: string) {
  const hotel = await database().hotel.findFirst({
    where: {status: "ACTIVE", verified: true, OR: [{id: identifier}, {slug: identifier}]},
    select: {id: true, slug: true},
  });
  if (!hotel) notFound("Hotel");
  return hotel;
}

export async function listHotelSitemapEntries() {
  return database().hotel.findMany({
    where: {status: "ACTIVE", verified: true},
    select: {slug: true, updatedAt: true},
    orderBy: {updatedAt: "desc"},
  });
}
