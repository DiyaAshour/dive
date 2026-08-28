import { database } from "@platform/database";

export type FeaturedDestination = Readonly<{
  id: string;
  slug: string;
  city: string;
  nameEn: string;
  nameAr: string | null;
  countryCode: string;
  propertyCount: number;
  landingPath: string;
  coverPhoto: Readonly<{url: string; alt: string | null}> | null;
}>;

export type DestinationSuggestion = Readonly<{
  kind: "DESTINATION" | "HOTEL";
  id: string;
  label: string;
  searchValue: string;
  secondary: string;
  type: string;
  landingPath: string | null;
}>;

export type ResolvedDestination = Readonly<{
  id: string;
  slug: string;
  type: "COUNTRY" | "REGION" | "CITY" | "AREA" | "LANDMARK";
  countryCode: string;
  nameEn: string;
  nameAr: string | null;
  parentId: string | null;
}>;

type FeaturedDestinationOptions = Readonly<{
  countryCode?: string;
  limit?: number;
}>;

type DestinationRankRow = Readonly<{id: string; score: number}>;

const livePhotoQuery = {
  where: {mediaObject: {state: "READY" as const}},
  select: {alt: true, sortOrder: true, mediaObject: {select: {publicUrl: true}}},
  orderBy: {sortOrder: "asc" as const},
};

export function normalizeDestinationQuery(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

export function countrySlugForCode(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code === "JO") return "jordan";
  return code.toLowerCase();
}

export function countryCodeForSlug(countrySlug: string): string | null {
  const slug = countrySlug.trim().toLowerCase();
  if (slug === "jordan") return "JO";
  return /^[a-z]{2}$/.test(slug) ? slug.toUpperCase() : null;
}

export async function resolveDestinationQuery(query: string, countryCode?: string): Promise<ResolvedDestination | null> {
  const normalized = normalizeDestinationQuery(query);
  if (!normalized) return null;
  const country = countryCode?.trim().toUpperCase();
  const db = database();

  const alias = await db.destinationAlias.findFirst({
    where: {
      normalized,
      destination: {active: true, ...(country ? {countryCode: country} : {})},
    },
    include: {destination: true},
    orderBy: {weight: "desc"},
  });
  if (alias) return publicDestination(alias.destination);

  const direct = await db.destination.findFirst({
    where: {
      active: true,
      ...(country ? {countryCode: country} : {}),
      OR: [
        {nameEn: {equals: query.trim(), mode: "insensitive"}},
        {nameAr: {equals: query.trim(), mode: "insensitive"}},
        {slug: {equals: query.trim().toLowerCase()}},
      ],
    },
    orderBy: [{sortOrder: "asc"}, {nameEn: "asc"}],
  });
  if (direct) return publicDestination(direct);

  const prefixAlias = await db.destinationAlias.findFirst({
    where: {
      normalized: {startsWith: normalized},
      destination: {active: true, ...(country ? {countryCode: country} : {})},
    },
    include: {destination: true},
    orderBy: [{weight: "desc"}, {alias: "asc"}],
  });
  if (prefixAlias) return publicDestination(prefixAlias.destination);

  const rows = await db.$queryRawUnsafe<DestinationRankRow[]>(
    `SELECT d."id",
      GREATEST(
        similarity(LOWER(d."nameEn"), $1),
        similarity(LOWER(COALESCE(d."nameAr", '')), $1),
        COALESCE(MAX(similarity(a."normalized", $1)), 0)
      )::float8 AS score
     FROM "Destination" d
     LEFT JOIN "DestinationAlias" a ON a."destinationId" = d."id"
     WHERE d."active" = true
       AND ($2::text IS NULL OR d."countryCode" = $2)
     GROUP BY d."id"
     HAVING GREATEST(
       similarity(LOWER(d."nameEn"), $1),
       similarity(LOWER(COALESCE(d."nameAr", '')), $1),
       COALESCE(MAX(similarity(a."normalized", $1)), 0)
     ) >= 0.22
     ORDER BY score DESC, d."sortOrder" ASC
     LIMIT 1`,
    normalized,
    country ?? null,
  );
  const id = rows[0]?.id;
  if (!id) return null;
  const fuzzy = await db.destination.findUnique({where: {id}});
  return fuzzy ? publicDestination(fuzzy) : null;
}

export async function destinationScope(destinationId: string): Promise<{ids: string[]; destinations: ResolvedDestination[]}> {
  const db = database();
  const root = await db.destination.findUnique({where: {id: destinationId}});
  if (!root || !root.active) return {ids: [], destinations: []};
  const found = [root];
  let frontier = [root.id];
  for (let depth = 0; depth < 4 && frontier.length; depth += 1) {
    const children = await db.destination.findMany({where: {active: true, parentId: {in: frontier}}, orderBy: [{sortOrder: "asc"}, {nameEn: "asc"}]});
    if (!children.length) break;
    found.push(...children);
    frontier = children.map((item) => item.id);
  }
  return {ids: found.map((item) => item.id), destinations: found.map(publicDestination)};
}

export async function searchDestinationSuggestions(query: string, locale: "ar" | "en" = "en", limit = 8): Promise<DestinationSuggestion[]> {
  const db = database();
  const normalized = normalizeDestinationQuery(query);
  const take = Math.max(1, Math.min(limit, 12));
  const destinationRows = normalized
    ? await db.destinationAlias.findMany({
        where: {normalized: {contains: normalized}, destination: {active: true}},
        include: {destination: true},
        orderBy: [{weight: "desc"}, {alias: "asc"}],
        take: take * 3,
      })
    : [];

  const destinations = new Map<string, ResolvedDestination>();
  for (const row of destinationRows) destinations.set(row.destination.id, publicDestination(row.destination));

  if (normalized && destinations.size < take) {
    const fuzzy = await db.$queryRawUnsafe<DestinationRankRow[]>(
      `SELECT d."id",
        GREATEST(
          similarity(LOWER(d."nameEn"), $1),
          similarity(LOWER(COALESCE(d."nameAr", '')), $1),
          COALESCE(MAX(similarity(a."normalized", $1)), 0)
        )::float8 AS score
       FROM "Destination" d
       LEFT JOIN "DestinationAlias" a ON a."destinationId" = d."id"
       WHERE d."active" = true
       GROUP BY d."id"
       HAVING GREATEST(
         similarity(LOWER(d."nameEn"), $1),
         similarity(LOWER(COALESCE(d."nameAr", '')), $1),
         COALESCE(MAX(similarity(a."normalized", $1)), 0)
       ) >= 0.18
       ORDER BY score DESC, d."sortOrder" ASC
       LIMIT $2`,
      normalized,
      take,
    );
    if (fuzzy.length) {
      const extra = await db.destination.findMany({where: {id: {in: fuzzy.map((item) => item.id)}}});
      const byId = new Map(extra.map((item) => [item.id, item]));
      for (const ranked of fuzzy) {
        const item = byId.get(ranked.id);
        if (item && !destinations.has(item.id)) destinations.set(item.id, publicDestination(item));
      }
    }
  }

  if (!normalized) {
    const popular = await db.destination.findMany({where: {active: true, type: {in: ["CITY", "REGION"]}}, orderBy: [{sortOrder: "asc"}, {nameEn: "asc"}], take});
    for (const item of popular) destinations.set(item.id, publicDestination(item));
  }

  const destinationSuggestions = [...destinations.values()].slice(0, take).map((item) => ({
    kind: "DESTINATION" as const,
    id: item.id,
    label: locale === "ar" ? item.nameAr ?? item.nameEn : item.nameEn,
    searchValue: locale === "ar" ? item.nameAr ?? item.nameEn : item.nameEn,
    secondary: destinationSecondary(item, locale),
    type: item.type,
    landingPath: ["CITY", "REGION"].includes(item.type) ? `/hotels/${countrySlugForCode(item.countryCode)}/${item.slug}` : null,
  }));

  if (!normalized || destinationSuggestions.length >= take) return destinationSuggestions.slice(0, take);
  const hotelSlots = Math.min(3, take - destinationSuggestions.length);
  const hotels = await db.hotel.findMany({
    where: {status: "ACTIVE", verified: true, name: {contains: query.trim(), mode: "insensitive"}},
    select: {id: true, slug: true, name: true, city: true, countryCode: true},
    orderBy: [{starRating: "desc"}, {updatedAt: "desc"}],
    take: hotelSlots,
  });
  return [
    ...destinationSuggestions,
    ...hotels.map((hotel) => ({kind: "HOTEL" as const, id: hotel.id, label: hotel.name, searchValue: hotel.name, secondary: hotel.city, type: "HOTEL", landingPath: `/hotel/${hotel.slug}`})),
  ].slice(0, take);
}

export async function listFeaturedDestinations(options: FeaturedDestinationOptions = {}): Promise<FeaturedDestination[]> {
  const countryCode = options.countryCode?.trim().toUpperCase();
  const limit = Math.max(1, Math.min(options.limit ?? 5, 12));
  const rows = await database().destination.findMany({
    where: {active: true, type: {in: ["CITY", "REGION"]}, ...(countryCode ? {countryCode} : {})},
    include: {
      hotelLinks: {
        where: {hotel: {status: "ACTIVE", verified: true}},
        select: {hotel: {select: {photos: {...livePhotoQuery, take: 1}}}},
        take: 50,
      },
    },
    orderBy: [{sortOrder: "asc"}, {nameEn: "asc"}],
    take: limit * 2,
  });

  return rows
    .map((destination) => {
      const photo = destination.hotelLinks.flatMap((link) => link.hotel.photos).find((item) => Boolean(item.mediaObject.publicUrl));
      const photoUrl = photo?.mediaObject.publicUrl ?? null;
      return {
        id: destination.id,
        slug: destination.slug,
        city: destination.nameEn,
        nameEn: destination.nameEn,
        nameAr: destination.nameAr,
        countryCode: destination.countryCode,
        propertyCount: destination.hotelLinks.length,
        landingPath: `/hotels/${countrySlugForCode(destination.countryCode)}/${destination.slug}`,
        coverPhoto: photoUrl ? {url: photoUrl, alt: photo?.alt ?? null} : null,
      };
    })
    .filter((destination) => destination.propertyCount > 0)
    .sort((left, right) => right.propertyCount - left.propertyCount || left.city.localeCompare(right.city))
    .slice(0, limit);
}

export async function getPublicDestinationLanding(countrySlug: string, destinationSlug: string, locale: "ar" | "en") {
  const countryCode = countryCodeForSlug(countrySlug);
  if (!countryCode) return null;
  const db = database();
  const destination = await db.destination.findFirst({where: {slug: destinationSlug.toLowerCase(), countryCode, active: true}});
  if (!destination) return null;
  const scope = await destinationScope(destination.id);
  const scopeAreaNames = scope.destinations.filter((item) => item.type === "AREA").map((item) => item.nameEn);
  const locationFallback = destination.type === "AREA"
    ? {area: {equals: destination.nameEn, mode: "insensitive" as const}}
    : {OR: [
        {city: {equals: destination.nameEn, mode: "insensitive" as const}},
        ...(scopeAreaNames.length ? [{area: {in: scopeAreaNames, mode: "insensitive" as const}}] : []),
      ]};

  const hotels = await db.hotel.findMany({
    where: {
      status: "ACTIVE",
      verified: true,
      countryCode,
      OR: [
        {destinationLinks: {some: {destinationId: {in: scope.ids}}}},
        locationFallback,
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      area: true,
      countryCode: true,
      starRating: true,
      updatedAt: true,
      amenities: {select: {code: true, name: true}, orderBy: {name: "asc"}, take: 5},
      photos: {...livePhotoQuery, take: 1},
    },
    orderBy: [{starRating: "desc"}, {updatedAt: "desc"}],
    take: 24,
  });
  const hotelIds = hotels.map((hotel) => hotel.id);
  const reviewRows = hotelIds.length ? await db.guestReview.groupBy({
    by: ["hotelId"],
    where: {hotelId: {in: hotelIds}, status: "PUBLISHED"},
    _count: {_all: true},
    _avg: {overall: true},
  }) : [];
  const reviews = new Map(reviewRows.map((row) => [row.hotelId, {count: row._count._all, overall: row._avg.overall === null ? null : Math.round(row._avg.overall * 10) / 10}]));
  const children = scope.destinations.filter((item) => item.parentId === destination.id).map((item) => ({
    id: item.id,
    slug: item.slug,
    name: locale === "ar" ? item.nameAr ?? item.nameEn : item.nameEn,
    searchValue: locale === "ar" ? item.nameAr ?? item.nameEn : item.nameEn,
    type: item.type,
  }));
  return {
    id: destination.id,
    slug: destination.slug,
    type: destination.type,
    countryCode,
    countrySlug: countrySlugForCode(countryCode),
    name: locale === "ar" ? destination.nameAr ?? destination.nameEn : destination.nameEn,
    nameEn: destination.nameEn,
    nameAr: destination.nameAr,
    seoTitle: locale === "ar" ? destination.seoTitleAr ?? destination.seoTitleEn : destination.seoTitleEn,
    seoDescription: locale === "ar" ? destination.seoDescriptionAr ?? destination.seoDescriptionEn : destination.seoDescriptionEn,
    location: destination.latitude === null || destination.longitude === null ? null : {latitude: Number(destination.latitude), longitude: Number(destination.longitude)},
    children,
    propertyCount: hotels.length,
    hotels: hotels.map((hotel) => {
      const photo = hotel.photos[0];
      return {
        id: hotel.id,
        slug: hotel.slug,
        name: hotel.name,
        city: hotel.city,
        area: hotel.area,
        countryCode: hotel.countryCode,
        starRating: hotel.starRating,
        amenities: hotel.amenities,
        reviewSummary: reviews.get(hotel.id) ?? {count: 0, overall: null},
        coverPhoto: photo?.mediaObject.publicUrl ? {url: photo.mediaObject.publicUrl, alt: photo.alt ?? null} : null,
        updatedAt: hotel.updatedAt,
      };
    }),
  };
}

export async function listDestinationSitemapEntries() {
  const rows = await database().destination.findMany({
    where: {active: true, type: {in: ["CITY", "REGION"]}, hotelLinks: {some: {hotel: {status: "ACTIVE", verified: true}}}},
    select: {slug: true, countryCode: true, updatedAt: true},
    orderBy: [{countryCode: "asc"}, {sortOrder: "asc"}],
  });
  return rows.map((item) => ({...item, countrySlug: countrySlugForCode(item.countryCode)}));
}

export async function syncHotelDestinationLinks(hotelId: string) {
  const db = database();
  const hotel = await db.hotel.findUnique({where: {id: hotelId}, select: {id: true, city: true, area: true, countryCode: true}});
  if (!hotel) return {linked: 0};
  const city = await resolveDestinationQuery(hotel.city, hotel.countryCode);
  if (!city || !["CITY", "REGION"].includes(city.type)) return {linked: 0};
  const normalizedArea = normalizeDestinationQuery(hotel.area ?? "");
  let area: ResolvedDestination | null = null;
  if (normalizedArea) {
    const areaMatch = await db.destinationAlias.findFirst({
      where: {normalized: normalizedArea, destination: {active: true, parentId: city.id}},
      include: {destination: true},
      orderBy: {weight: "desc"},
    });
    if (areaMatch) area = publicDestination(areaMatch.destination);
  }
  await db.$transaction(async (tx) => {
    await tx.hotelDestination.deleteMany({where: {hotelId, destination: {countryCode: hotel.countryCode}}});
    await tx.hotelDestination.create({data: {hotelId, destinationId: city.id, primary: true}});
    if (area) await tx.hotelDestination.create({data: {hotelId, destinationId: area.id, primary: false}});
  });
  return {linked: area ? 2 : 1};
}

function publicDestination(destination: {id: string; slug: string; type: ResolvedDestination["type"]; countryCode: string; nameEn: string; nameAr: string | null; parentId: string | null}): ResolvedDestination {
  return {id: destination.id, slug: destination.slug, type: destination.type, countryCode: destination.countryCode, nameEn: destination.nameEn, nameAr: destination.nameAr, parentId: destination.parentId};
}

function destinationSecondary(destination: ResolvedDestination, locale: "ar" | "en") {
  const type = locale === "ar"
    ? ({COUNTRY: "دولة", REGION: "منطقة", CITY: "مدينة", AREA: "منطقة", LANDMARK: "معلم"} as Record<string, string>)[destination.type]
    : destination.type.charAt(0) + destination.type.slice(1).toLowerCase();
  const country = destination.countryCode === "JO" ? (locale === "ar" ? "الأردن" : "Jordan") : destination.countryCode;
  return `${type} · ${country}`;
}
