import type { DiscoverySearchInput } from "@platform/contracts";
import {searchHotelbeds, type HotelbedsSearchResult} from "../hotelbeds/client";
import {searchHotelsV2WithVisibilityBoost as searchHotelsV2WithVisibilityBoostBase} from "./visibility-search";

type VisibilitySearchContext = Readonly<{travelerCountry?: string | undefined}>;
type SearchResult = Awaited<ReturnType<typeof searchHotelsV2WithVisibilityBoostBase>>;
type SearchItem = SearchResult["results"][number];

const HOTELBEDS_JORDAN_DESTINATION_CODES = ["AMM", "AQJ", "PET", "DSE"] as const;

/**
 * Extends the normal destination search with a direct Hotelbeds hotel-name lookup.
 * Hotelbeds availability is destination-code based, so when the public query does not
 * resolve to a destination (for example "Signia") we search the supported Jordan
 * destinations and keep only hotels whose provider name matches the query.
 */
export async function searchHotelsV2WithVisibilityBoost(
  input: DiscoverySearchInput,
  context: VisibilitySearchContext = {},
): Promise<SearchResult> {
  const base = await searchHotelsV2WithVisibilityBoostBase(input, context);

  if (input.cursor || base.resolvedDestination) return base;
  const query = normalizeHotelQuery(input.destination);
  if (query.length < 3) return base;

  const providerMatches = await searchHotelbedsByHotelName(input, context, query);
  if (!providerMatches.length) return base;

  const providerItems = providerMatches.map((hotel) => providerSearchItem(hotel));
  const existingMatches = base.results.filter((hotel) => hotelNameMatchesQuery(hotel.name, hotel.city, hotel.area, query));
  const combined = dedupeResults([...providerItems, ...existingMatches]).slice(0, input.pageSize);

  console.info("Hotelbeds direct hotel-name search completed", {
    query: input.destination,
    resultCount: providerItems.length,
  });

  return {
    ...base,
    count: combined.length,
    candidateCount: base.candidateCount + providerItems.length,
    results: combined,
  };
}

async function searchHotelbedsByHotelName(
  input: DiscoverySearchInput,
  context: VisibilitySearchContext,
  normalizedQuery: string,
): Promise<HotelbedsSearchResult[]> {
  try {
    const batches = await Promise.all(HOTELBEDS_JORDAN_DESTINATION_CODES.map((destinationCode) => searchHotelbeds({
      destination: input.destination,
      destinationCode,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      ...(input.childrenAges.length ? {childrenAges: input.childrenAges} : {}),
      ...(context.travelerCountry ? {sourceMarket: context.travelerCountry} : {}),
      ...(input.minPrice !== undefined ? {minPrice: input.minPrice} : {}),
      ...(input.maxPrice !== undefined ? {maxPrice: input.maxPrice} : {}),
      priceCurrency: "JOD",
      stars: input.stars,
      freeCancellation: input.freeCancellation,
      ...(input.paymentMode ? {paymentMode: input.paymentMode} : {}),
      amenities: input.amenities,
    })));

    const seen = new Set<string>();
    return batches.flat().filter((hotel) => {
      if (!hotelNameMatchesQuery(hotel.name, hotel.city, hotel.area, normalizedQuery)) return false;
      if (seen.has(hotel.id)) return false;
      seen.add(hotel.id);
      return true;
    }).sort((left, right) => hotelMatchScore(right, normalizedQuery) - hotelMatchScore(left, normalizedQuery) || left.from.total - right.from.total);
  } catch (error) {
    console.error("Hotelbeds direct hotel-name search unavailable", error);
    return [];
  }
}

function providerSearchItem(hotel: HotelbedsSearchResult): SearchItem {
  return {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    city: hotel.city,
    countryCode: hotel.countryCode,
    area: hotel.area,
    starRating: hotel.starRating,
    currency: hotel.currency,
    coverPhoto: hotel.coverPhoto,
    amenities: hotel.amenities,
    reviewSummary: hotel.reviewSummary,
    availableOffers: hotel.availableOffers,
    from: hotel.from,
    source: "HOTELBEDS_API",
    visibilityBoost: null,
  } as unknown as SearchItem;
}

function hotelNameMatchesQuery(name: string, city: string, area: string | null, normalizedQuery: string): boolean {
  const normalizedName = normalizeHotelQuery(name);
  if (normalizedName.includes(normalizedQuery)) return true;

  const searchable = normalizeHotelQuery(`${name} ${city} ${area ?? ""}`);
  const terms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
  return terms.length > 0 && terms.every((term) => searchable.includes(term));
}

function hotelMatchScore(hotel: Pick<HotelbedsSearchResult, "name" | "city" | "area">, normalizedQuery: string): number {
  const name = normalizeHotelQuery(hotel.name);
  if (name === normalizedQuery) return 100;
  if (name.startsWith(normalizedQuery)) return 80;
  if (name.includes(normalizedQuery)) return 60;
  const searchable = normalizeHotelQuery(`${hotel.name} ${hotel.city} ${hotel.area ?? ""}`);
  const terms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
  return terms.reduce((score, term) => score + (searchable.includes(term) ? 5 : 0), 0);
}

function normalizeHotelQuery(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function dedupeResults(results: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  return results.filter((hotel) => {
    if (seen.has(hotel.id)) return false;
    seen.add(hotel.id);
    return true;
  });
}
