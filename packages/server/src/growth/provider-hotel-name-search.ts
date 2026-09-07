import type { DiscoverySearchInput } from "@platform/contracts";
import {getHotelbedsHotelDetails, type HotelbedsSearchResult} from "../hotelbeds/client";
import {searchHotelbedsContentHotels} from "../hotelbeds/catalog";
import {searchNuitee, type NuiteeSearchResult} from "../nuitee/client";
import {searchHotelsV2WithVisibilityBoost as searchHotelsV2WithVisibilityBoostBase} from "./visibility-search";

type VisibilitySearchContext = Readonly<{travelerCountry?: string | undefined}>;
type SearchResult = Awaited<ReturnType<typeof searchHotelsV2WithVisibilityBoostBase>>;
type SearchItem = SearchResult["results"][number];

/**
 * Extends the unified HandMeKey search with supplier inventory. Hotelbeds
 * hotel-name lookup stays backed by the local Content API catalogue, while
 * Nuitee Connect is queried only after HandMeKey resolves a real destination.
 */
export async function searchHotelsV2WithVisibilityBoost(
  input: DiscoverySearchInput,
  context: VisibilitySearchContext = {},
): Promise<SearchResult> {
  const base = await searchHotelsV2WithVisibilityBoostBase(input, context);
  if (input.cursor) return base;

  if (base.resolvedDestination) return addNuiteeDestinationInventory(base, input, context);

  const query = normalizeHotelQuery(input.destination);
  if (query.length < 3) return base;
  const providerMatches = await searchHotelbedsByHotelName(input, context, query);
  if (!providerMatches.length) return base;

  const providerItems = providerMatches.map((hotel) => providerSearchItem(hotel));
  const existingMatches = base.results.filter((hotel) => hotelNameMatchesQuery(hotel.name, hotel.city, hotel.area, query));
  const combined = dedupeResults([...providerItems, ...existingMatches]).slice(0, input.pageSize);

  console.info("Hotelbeds local-catalog hotel-name search completed", {
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

async function addNuiteeDestinationInventory(base: SearchResult, input: DiscoverySearchInput, context: VisibilitySearchContext): Promise<SearchResult> {
  if (input.children > 0 && input.childrenAges.length !== input.children) return base;
  try {
    const destination = base.resolvedDestination;
    if (!destination) return base;
    const rows = await searchNuitee({
      destination: destination.nameEn,
      countryCode: destination.countryCode,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      ...(input.childrenAges.length ? {childrenAges: input.childrenAges} : {}),
      ...(context.travelerCountry ? {guestNationality: context.travelerCountry} : {}),
      currency: "JOD",
      ...(input.minPrice !== undefined ? {minPrice: input.minPrice} : {}),
      ...(input.maxPrice !== undefined ? {maxPrice: input.maxPrice} : {}),
      stars: input.stars,
      freeCancellation: input.freeCancellation,
      ...(input.paymentMode ? {paymentMode: input.paymentMode} : {}),
      limit: Math.min(input.pageSize, 20),
      maxRatesPerHotel: 4,
    });
    if (!rows.length) return base;
    const providerItems = rows.map(nuiteeSearchItem);
    let combined = dedupeResults([...base.results, ...providerItems]).slice(0, input.pageSize);
    if (providerItems.length && combined.length && !combined.some((item) => item.slug.startsWith("nuitee-"))) {
      combined = [...combined.slice(0, -1), providerItems[0]!];
    }
    console.info("Nuitee Connect destination search completed", {destination: destination.nameEn, resultCount: rows.length});
    return {
      ...base,
      count: combined.length,
      candidateCount: base.candidateCount + providerItems.length,
      results: combined,
    };
  } catch (error) {
    console.error("Nuitee Connect search unavailable; continuing with existing inventory", error);
    return base;
  }
}

async function searchHotelbedsByHotelName(
  input: DiscoverySearchInput,
  context: VisibilitySearchContext,
  normalizedQuery: string,
): Promise<HotelbedsSearchResult[]> {
  if (input.children > 0 && input.childrenAges.length !== input.children) return [];
  let candidates;
  try {
    candidates = await searchHotelbedsContentHotels(input.destination, 6);
  } catch (error) {
    console.error("Hotelbeds local content catalogue unavailable", error);
    return [];
  }
  if (!candidates.length) return [];

  const ranked = candidates
    .filter((hotel) => hotelNameMatchesQuery(hotel.name, hotel.destinationName ?? "", hotel.zoneName, normalizedQuery))
    .sort((left, right) => hotelCatalogMatchScore(right.name, normalizedQuery) - hotelCatalogMatchScore(left.name, normalizedQuery));

  for (const candidate of ranked.slice(0, 2)) {
    try {
      const hotel = await getHotelbedsHotelDetails(candidate.code, {
        destination: candidate.destinationName ?? input.destination,
        ...(candidate.destinationCode ? {destinationCode: candidate.destinationCode} : {}),
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
      });
      if (!hotel) continue;
      return [{
        id: hotel.id,
        slug: hotel.slug,
        source: "HOTELBEDS_API",
        providerHotelCode: hotel.providerHotelCode,
        name: candidate.name || hotel.name,
        city: candidate.destinationName ?? hotel.city,
        countryCode: candidate.countryCode ?? hotel.countryCode,
        area: candidate.zoneName ?? hotel.area,
        address: candidate.address ?? hotel.address,
        starRating: hotel.starRating,
        currency: hotel.currency,
        coverPhoto: hotel.coverPhoto,
        photos: hotel.photos,
        amenities: hotel.amenities,
        reviewSummary: hotel.reviewSummary,
        availableOffers: hotel.offers.length,
        rates: hotel.offers,
        from: hotel.offers[0]!,
      }];
    } catch (error) {
      console.error("Hotelbeds hotel-code availability lookup unavailable", {hotelCode: candidate.code, error});
      return [];
    }
  }
  return [];
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

function nuiteeSearchItem(hotel: NuiteeSearchResult): SearchItem {
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
    source: "NUITEE_API",
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

function hotelCatalogMatchScore(name: string, normalizedQuery: string): number {
  const normalizedName = normalizeHotelQuery(name);
  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.startsWith(normalizedQuery)) return 80;
  if (normalizedName.includes(normalizedQuery)) return 60;
  const terms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
  return terms.reduce((score, term) => score + (normalizedName.includes(term) ? 5 : 0), 0);
}

function normalizeHotelQuery(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[\u064b-\u065f\u0670]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function dedupeResults(results: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  return results.filter((hotel) => {
    if (seen.has(hotel.id)) return false;
    seen.add(hotel.id);
    return true;
  });
}
