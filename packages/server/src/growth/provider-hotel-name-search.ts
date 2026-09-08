import type { DiscoverySearchInput } from "@platform/contracts";
import {demoSearchFallback} from "../discovery/demo-fallback";
import {searchNuitee, searchNuiteeByHotelName, type NuiteeSearchResult} from "../nuitee/client";
import {searchHotelsV2WithVisibilityBoost as searchHotelsV2WithVisibilityBoostBase} from "./visibility-search";

type VisibilitySearchContext = Readonly<{travelerCountry?: string | undefined}>;
type SearchResult = Awaited<ReturnType<typeof searchHotelsV2WithVisibilityBoostBase>>;
type SearchItem = SearchResult["results"][number];

/**
 * Extends HandMeKey search with Nuitee Connect inventory only.
 * Hotelbeds has been decommissioned from public search.
 */
export async function searchHotelsV2WithVisibilityBoost(
  input: DiscoverySearchInput,
  context: VisibilitySearchContext = {},
): Promise<SearchResult> {
  const rawBase = await searchHotelsV2WithVisibilityBoostBase(input, context);
  const cleanedBase = withoutDemoHotels(rawBase);
  const fallback = cleanedBase.resolvedDestination ? null : demoSearchFallback(input);
  const base = fallback?.resolvedDestination
    ? ({...cleanedBase, resolvedDestination: fallback.resolvedDestination} as SearchResult)
    : cleanedBase;

  if (input.cursor) return base;
  if (!base.resolvedDestination) return addNuiteeHotelNameInventory(base, input, context);
  return addNuiteeDestinationInventory(base, input, context);
}

function withoutDemoHotels(base: SearchResult): SearchResult {
  const results = base.results.filter((hotel) => !hotel.slug.startsWith("demo-"));
  if (results.length === base.results.length) return base;
  return {
    ...base,
    count: results.length,
    candidateCount: Math.max(results.length, base.candidateCount - (base.results.length - results.length)),
    results,
  };
}

async function addNuiteeHotelNameInventory(base: SearchResult, input: DiscoverySearchInput, context: VisibilitySearchContext): Promise<SearchResult> {
  if (input.destination.trim().length < 2) return base;
  if (input.children > 0 && input.childrenAges.length !== input.children) return base;
  try {
    const rows = await searchNuiteeByHotelName({
      hotelName: input.destination,
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
    const combined = dedupeResults([...base.results, ...providerItems]).slice(0, input.pageSize);
    console.info("Nuitee Connect hotel-name search completed", {query: input.destination, resultCount: rows.length});
    return {
      ...base,
      count: combined.length,
      candidateCount: base.candidateCount + providerItems.length,
      results: combined,
    };
  } catch (error) {
    console.error("Nuitee Connect hotel-name search unavailable; continuing with existing inventory", error);
    return base;
  }
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

function dedupeResults(results: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  return results.filter((hotel) => {
    if (seen.has(hotel.id)) return false;
    seen.add(hotel.id);
    return true;
  });
}
