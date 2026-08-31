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
type PublicHotel = Awaited<ReturnType<typeof getPublicHotelDetails>>;
type PublicOffer = PublicHotel["offers"][number];
type AdvancedAmenityFilters = Readonly<{amenities:string[]; guestRatingMin:number|null; propertyTypes:string[]; areas:string[]}>;

const MAX_SCAN_PER_PAGE = 160;
const FILTER_PREFIX="FILTER:";
const AMENITY_ALIASES:Readonly<Record<string,readonly string[]>>={
  SPA:["SPA","WELLNESS","SPA_WELLNESS"],
  RESTAURANT:["RESTAURANT","DINING"],
  AIRPORT_SHUTTLE:["AIRPORT_SHUTTLE","AIRPORT_TRANSFER","SHUTTLE"],
  BEACH_ACCESS:["BEACH_ACCESS","BEACH","PRIVATE_BEACH"],
  FAMILY_ROOMS:["FAMILY_ROOMS","FAMILY_ROOM"],
  BUSINESS_CENTER:["BUSINESS_CENTER","BUSINESS"],
  AIR_CONDITIONING:["AIR_CONDITIONING","AC","AIR_CONDITIONER"],
  ROOM_SERVICE:["ROOM_SERVICE"],
  BAR:["BAR","LOUNGE"],
  EV_CHARGING:["EV_CHARGING","ELECTRIC_VEHICLE_CHARGING","EV_CHARGER"],
  WHEELCHAIR_ACCESS:["WHEELCHAIR_ACCESS","ACCESSIBLE","ACCESSIBILITY","WHEELCHAIR"],
};

export async function searchHotelsV2(input: DiscoverySearchInput) {
  const db = database();
  const destination = await resolveDestinationQuery(input.destination);
  const scope = destination ? await destinationScope(destination.id) : null;
  const fingerprint = searchFingerprint(input, destination?.id ?? null);
  const offset = decodeCursor(input.cursor, fingerprint)?.offset ?? 0;
  const pageSize = input.pageSize;
  const where = candidateWhere(input, destination, scope?.ids ?? []);
  const candidateCount = await db.hotel.count({where});
  const advanced=parseAdvancedAmenityFilters(input.amenities);
  const hasAdvanced=advanced.guestRatingMin!==null||advanced.propertyTypes.length>0||advanced.areas.length>0;
  const scanGoal = hasAdvanced
    ? MAX_SCAN_PER_PAGE
    : input.sort === "PRICE_ASC" || input.sort === "PRICE_DESC"
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
  const advanced=parseAdvancedAmenityFilters(input.amenities);
  if(advanced.guestRatingMin!==null&&(hotel.reviewSummary.overall===null||hotel.reviewSummary.overall<advanced.guestRatingMin))return null;
  if(advanced.areas.length&&(!hotel.area||!advanced.areas.includes(normalizeFilterText(hotel.area))))return null;
  if(advanced.amenities.length&&!advanced.amenities.every((code)=>hotelHasAmenity(hotel,code)))return null;
  const offers = hotel.offers.filter((offer) => {
    if(advanced.propertyTypes.length&&!advanced.propertyTypes.some((type)=>offerMatchesPropertyType(hotel,offer,type)))return false;
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

function parseAdvancedAmenityFilters(values:readonly string[]):AdvancedAmenityFilters{
  const amenities:string[]=[];const propertyTypes:string[]=[];const areas:string[]=[];let guestRatingMin:number|null=null;
  for(const raw of values){
    const value=raw.trim().toUpperCase();
    if(!value)continue;
    if(value.startsWith("FILTER:RATING:")){
      const rating=Number(value.slice("FILTER:RATING:".length));
      if(Number.isFinite(rating)&&rating>=1&&rating<=10)guestRatingMin=Math.max(guestRatingMin??0,rating);
      continue;
    }
    if(value.startsWith("FILTER:PROPERTY:")){
      const type=value.slice("FILTER:PROPERTY:".length).trim();if(type)propertyTypes.push(type);continue;
    }
    if(value.startsWith("FILTER:AREA:")){
      const area=value.slice("FILTER:AREA:".length).trim();if(area)areas.push(normalizeFilterText(area));continue;
    }
    if(value.startsWith(FILTER_PREFIX))continue;
    amenities.push(value);
  }
  return {amenities:[...new Set(amenities)],guestRatingMin,propertyTypes:[...new Set(propertyTypes)],areas:[...new Set(areas)]};
}

function hotelHasAmenity(hotel:PublicHotel,requested:string):boolean{
  const aliases=AMENITY_ALIASES[requested]??[requested];
  const matches=(code:string)=>aliases.includes(code.trim().toUpperCase());
  if(hotel.amenities.some((amenity)=>matches(amenity.code)))return true;
  return hotel.offers.some((offer)=>offer.roomAmenities.some((amenity)=>matches(amenity.code)));
}

function offerMatchesPropertyType(hotel:PublicHotel,offer:PublicOffer,type:string):boolean{
  const unit=offer.unitType.toUpperCase();
  if(type==="HOTEL")return ["ROOM","STUDIO","SUITE"].includes(unit);
  if(type==="APARTMENT")return unit==="APARTMENT";
  if(type==="VILLA")return unit==="VILLA";
  if(type==="CHALET")return unit==="CHALET";
  if(type==="BUNGALOW")return unit==="BUNGALOW";
  if(type==="HOLIDAY_HOME")return unit==="HOLIDAY_HOME";
  if(type==="HOSTEL")return ["DORMITORY_ROOM","BED_IN_DORMITORY"].includes(unit)||/\bhostel\b/i.test(hotel.name);
  if(type==="RESORT")return /\bresort\b/i.test(hotel.name)||hotel.amenities.some((amenity)=>amenity.code.toUpperCase()==="RESORT");
  return false;
}

function normalizeFilterText(value:string):string{return value.trim().replace(/\s+/g," ").toUpperCase();}

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
