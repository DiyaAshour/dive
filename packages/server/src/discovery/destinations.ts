import { database } from "@platform/database";

export type FeaturedDestination = Readonly<{
  city: string;
  countryCode: string;
  propertyCount: number;
  coverPhoto: Readonly<{url: string; alt: string | null}> | null;
}>;

type FeaturedDestinationOptions = Readonly<{
  countryCode?: string;
  limit?: number;
}>;

export async function listFeaturedDestinations(options: FeaturedDestinationOptions = {}): Promise<FeaturedDestination[]> {
  const countryCode = options.countryCode?.trim().toUpperCase();
  const limit = Math.max(1, Math.min(options.limit ?? 5, 12));

  const groups = await database().hotel.groupBy({
    by: ["city", "countryCode"],
    where: {
      status: "ACTIVE",
      verified: true,
      ...(countryCode ? {countryCode} : {}),
    },
    _count: {id: true},
  });

  const ranked = groups
    .sort((left, right) => right._count.id - left._count.id || left.city.localeCompare(right.city))
    .slice(0, limit);

  return Promise.all(ranked.map(async (destination) => {
    const representative = await database().hotel.findFirst({
      where: {
        status: "ACTIVE",
        verified: true,
        city: destination.city,
        countryCode: destination.countryCode,
      },
      select: {
        photos: {
          where: {mediaObject: {state: "READY"}},
          select: {alt: true, sortOrder: true, mediaObject: {select: {publicUrl: true}}},
          orderBy: {sortOrder: "asc"},
          take: 1,
        },
      },
      orderBy: {updatedAt: "desc"},
    });

    const photo = representative?.photos[0];
    const photoUrl = photo?.mediaObject.publicUrl ?? null;

    return {
      city: destination.city,
      countryCode: destination.countryCode,
      propertyCount: destination._count.id,
      coverPhoto: photoUrl ? {url: photoUrl, alt: photo?.alt ?? null} : null,
    };
  }));
}
