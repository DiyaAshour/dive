import { createHash } from "node:crypto";
import type { DiscoverySearchInput } from "@platform/contracts";
import { database } from "@platform/database";
import type { Prisma } from "@platform/database";
import { captureSearchDemand } from "../growth/analytics";
import { getPublicHotelDetails } from "./service";
import { destinationScope, normalizeDestinationQuery, resolveDestinationQuery } from "./destinations";

type CursorPayload = Readonly<{v: 1; offset: number; fingerprint: string}>;
type SearchCandidate = Readonly<{id: string; slug: string; name: string; city: string; area: string | null; countryCode: string; starRating: number | null; updatedAt: Date}>;
type SearchResult = Awaited<ReturnType<typeof buildSearchResult>>;

const MAX_SCAN_PER_PAGE = 160;

export async function searchHotelsV2(input: DiscoverySearchInput) {
  const db = database();
  const destination = await resolveDestinationQuery(input.destination);
  const scope = destination ? await destinationScope(destination.id) : null;
  const fingerprint = searchFingerprint(input, destination?.id ?? null);
  const offset = decodeCursor(input.cursor, fingerprint)?.offset ?? 0;
  const pageSize = input.pageSize;
  const where = candidateWhere(input, destination, scope?.ids ?? []);
  const candidateCount = await db.hotel.count({where});
  const scanGoal = input.sort === "PRICE_ASC" || input.sort === "PRICE_DESC"
    ? Math.min(MAX_SCAN_PER_PAGE, Math.max(pageSize * 5, 60))
    : Math.min(MAX_SCAN_PER_PAGE, Math.max(pageSize * 2, 30));

  const candidates = await db.hotel.findMany({
    where,
    select: {id: true, slug: true, name: true, city: true, area: true, countryCode: true, starRating: true, updatedAt: true},
    orderBy: recommendedCandidateOrder(input.sort),
    skip: offset,
    take: scanGoal,
  });

  const evaluated: SearchResult[] = [];
  for (let index = 0; index < candidates.length; index += 8) {
    const batch = candidates.slice(index, index + 8);
    const rows = await Promise.all(batch.map((candidate) => evaluateCandidate(candidate, input)));
    for (const row of rows) if (row) evaluated.push(row);
    if (input.sort !== "PRICE_ASC" && input.sort !== "PRICE_DESC" && evaluated.length >= pageSize) break;
  }

  evaluated.sort((left, right) => compareLiveResults(left, right, input.sort));
  const results = evaluated.slice(0, pageSize);
  const scanned = candidates.length;
  const nextOffset = offset + scanned;
  const hasMore = nextOffset < candidateCount;
  const nextCursor = hasMore ? encodeCursor({v: 1, offset: nextOffset, fingerprint}) : null;

  await captureSearchDemand(input, results.map((result) => result.id));
  return {
    query: input,
    resolvedDestination: destination ? {
      id: destination.id,
      slug: destination.slug,
      type: destination.type,
      countryCode: destination.countryCode,
      nameEn: destination.nameEn,
      nameAr: destination.nameAr,
    } : null,
    count: results.length,
    candidateCount,
    results,
    pagination: {
      pageSize,
      scanned,
      offset,
      nextCursor,
      hasMore,
    },
  };
}

function candidateWhere(input: DiscoverySearchInput, destination: Awaited<ReturnType<typeof resolveDestinationQuery>>, scopeIds: string[]): Prisma.HotelWhereInput {
  const base: Prisma.HotelWhereInput = {
    status: "ACTIVE",
    verified: true,
    ...(input.stars.length ? {starRating: {in: input.stars}} : {}),
  };
  if (destination && scopeIds.length) {
    const scopeNames = new Set<string>([destination.nameEn, destination.nameAr ?? ""]);
    return {
      ...base,
      countryCode: destination.countryCode,
      OR: [
        {destinationLinks: {some: {destinationId: {in: scopeIds}}}},
        {city: {in: [...scopeNames].filter(Boolean), mode: "insensitive"}},
        {area: {in: [...scopeNames].filter(Boolean), mode: "insensitive"}},
      ],
    };
  }
  const query = input.destination.trim();
  return {
    ...base,
    OR: [
      {name: {contains: query, mode: "insensitive"}},
      {city: {contains: query, mode: "insensitive"}},
      {area: {contains: query, mode: "insensitive"}},
      {address: {contains: query, mode: "insensitive"}},
      {countryCode: {equals: query.toUpperCase()}},
    ],
  };
}

async function evaluateCandidate(candidate: SearchCandidate, input: DiscoverySearchInput) {
  const hotel = await getPublicHotelDetails(candidate.id, {
    arrival: input.arrival,
    departure: input.departure,
    adults: input.adults,
    children: input.children,
  }, {trackView: false});
  if (input.amenities.length && !input.amenities.every((code) => hotel.amenities.some((amenity) => amenity.code === code))) return null;
  const offers = hotel.offers.filter((offer) => {
    if (input.freeCancellation && !offer.freeCancellationNow) return false;
    if (input.paymentMode && !offer.paymentModes.includes(input.paymentMode)) return false;
    if (input.minPrice !== undefined && offer.averageNightlyTotal < input.minPrice) return false;
    if (input.maxPrice !== undefined && offer.averageNightlyTotal > input.maxPrice) return false;
    return true;
  });
  if (!offers.length) return null;
  const cheapest = offers.reduce((best, offer) => offer.total < best.total ? offer : best);
  return buildSearchResult(hotel, offers.length, cheapest);
}

function buildSearchResult(hotel: Awaited<ReturnType<typeof getPublicHotelDetails>>, availableOffers: number, from: Awaited<ReturnType<typeof getPublicHotelDetails>>["offers"][number]) {
  return {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    city: hotel.city,
    countryCode: hotel.countryCode,
    area: hotel.area,
    starRating: hotel.starRating,
    reviewSummary: hotel.reviewSummary,
    currency: hotel.currency,
    coverPhoto: hotel.photos[0] ?? null,
    amenities: hotel.amenities,
    availableOffers,
    from,
  };
}

function recommendedCandidateOrder(sort: DiscoverySearchInput["sort"]): Prisma.HotelOrderByWithRelationInput[] {
  if (sort === "STARS_DESC") return [{starRating: "desc"}, {updatedAt: "desc"}, {id: "asc"}];
  return [{verified: "desc"}, {starRating: "desc"}, {updatedAt: "desc"}, {id: "asc"}];
}

function compareLiveResults(left: NonNullable<SearchResult>, right: NonNullable<SearchResult>, sort: DiscoverySearchInput["sort"]): number {
  if (sort === "PRICE_ASC") return left.from.total - right.from.total || (right.starRating ?? 0) - (left.starRating ?? 0);
  if (sort === "PRICE_DESC") return right.from.total - left.from.total || (right.starRating ?? 0) - (left.starRating ?? 0);
  if (sort === "STARS_DESC") return (right.starRating ?? 0) - (left.starRating ?? 0) || right.reviewSummary.count - left.reviewSummary.count;
  return right.reviewSummary.count - left.reviewSummary.count || (right.reviewSummary.overall ?? 0) - (left.reviewSummary.overall ?? 0) || (right.starRating ?? 0) - (left.starRating ?? 0) || left.from.total - right.from.total;
}

function searchFingerprint(input: DiscoverySearchInput, destinationId: string | null): string {
  const stable = JSON.stringify({
    destination: normalizeDestinationQuery(input.destination),
    destinationId,
    arrival: input.arrival,
    departure: input.departure,
    adults: input.adults,
    children: input.children,
    minPrice: input.minPrice ?? null,
    maxPrice: input.maxPrice ?? null,
    stars: [...input.stars].sort(),
    amenities: [...input.amenities].sort(),
    freeCancellation: input.freeCancellation,
    paymentMode: input.paymentMode ?? null,
    sort: input.sort,
    pageSize: input.pageSize,
  });
  return createHash("sha256").update(stable).digest("base64url").slice(0, 18);
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined, fingerprint: string): CursorPayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<CursorPayload>;
    if (parsed.v !== 1 || parsed.fingerprint !== fingerprint || !Number.isInteger(parsed.offset) || (parsed.offset ?? -1) < 0 || (parsed.offset ?? 0) > 5_000_000) return null;
    return {v: 1, fingerprint, offset: parsed.offset as number};
  } catch {
    return null;
  }
}
