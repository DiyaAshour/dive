import {convertCurrency} from "@platform/core";
import type { DiscoverySearchInput } from "@platform/contracts";
import {demoSearchFallback} from "../discovery/demo-fallback";
import {resolveDestinationQuery, type ResolvedDestination} from "../discovery/destinations";
import {NUITEE_PAYMENT_CURRENCY, searchNuiteeByHotelName, searchNuiteeHotelIds, type NuiteeSearchResult} from "../nuitee/client";
import {searchNuiteeCatalog} from "../nuitee/catalog";
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
  const selectedNuiteeHotel = selectedNuiteeHotelCode(input);
  const rawBasePromise = searchHotelsV2WithVisibilityBoostBase(input, context);
  const providerDestinationPromise = !selectedNuiteeHotel && !input.cursor
    ? resolveDestinationQuery(input.destination)
    : Promise.resolve(null);
  const exactRowsPromise = selectedNuiteeHotel
    ? safeExactNuiteeRows(input, context, selectedNuiteeHotel)
    : undefined;

  const providerDestination = await providerDestinationPromise;
  const destinationRowsPromise = providerDestination
    ? safeNuiteeDestinationRows(providerDestination, input, context)
    : undefined;

  const rawBase = await rawBasePromise;
  const cleanedBase = withoutDemoHotels(rawBase);
  const fallback = cleanedBase.resolvedDestination ? null : demoSearchFallback(input);
  const base = fallback?.resolvedDestination
    ? ({...cleanedBase, resolvedDestination: fallback.resolvedDestination} as SearchResult)
    : cleanedBase;

  if (selectedNuiteeHotel) return exactNuiteeHotelInventory(base, input, context, selectedNuiteeHotel, exactRowsPromise);
  if (input.cursor) return base;
  if (!base.resolvedDestination) return addNuiteeHotelNameInventory(base, input, context);
  return addNuiteeDestinationInventory(base, input, context, destinationRowsPromise);
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

function selectedNuiteeHotelCode(input: DiscoverySearchInput): string | null {
  if (input.destinationKind !== "HOTEL" || !input.destinationId?.startsWith("nuitee:")) return null;
  const code = input.destinationId.slice("nuitee:".length).trim();
  return /^[A-Za-z0-9_-]+$/.test(code) ? code : null;
}

async function exactNuiteeHotelInventory(
  base: SearchResult,
  input: DiscoverySearchInput,
  context: VisibilitySearchContext,
  hotelId: string,
  prefetchedRows?: Promise<NuiteeSearchResult[]>,
): Promise<SearchResult> {
  if (input.children > 0 && input.childrenAges.length !== input.children) return exactResult(base, [], input.pageSize);
  const rows = prefetchedRows ? await prefetchedRows : await safeExactNuiteeRows(input, context, hotelId);
  const providerItems = rows.map(nuiteeSearchItem);
  console.info("Nuitee Connect exact hotel search completed", {hotelId, resultCount: providerItems.length});
  return exactResult(base, providerItems, input.pageSize);
}

async function safeExactNuiteeRows(
  input: DiscoverySearchInput,
  context: VisibilitySearchContext,
  hotelId: string,
): Promise<NuiteeSearchResult[]> {
  if (input.children > 0 && input.childrenAges.length !== input.children) return [];
  try {
    return await searchNuiteeHotelIds({
      hotelIds: [hotelId],
      destination: input.destination,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      ...(input.childrenAges.length ? {childrenAges: input.childrenAges} : {}),
      ...(context.travelerCountry ? {guestNationality: context.travelerCountry} : {}),
      currency: NUITEE_PAYMENT_CURRENCY,
      ...(input.minPrice !== undefined ? {minPrice: nuiteeUsdBound(input.minPrice)} : {}),
      ...(input.maxPrice !== undefined ? {maxPrice: nuiteeUsdBound(input.maxPrice)} : {}),
      stars: input.stars,
      freeCancellation: input.freeCancellation,
      ...(input.paymentMode ? {paymentMode: input.paymentMode} : {}),
      limit: 1,
      maxRatesPerHotel: 1,
    });
  } catch (error) {
    console.error("Nuitee Connect exact hotel search unavailable", {hotelId, error});
    return [];
  }
}

function exactResult(base: SearchResult, items: SearchItem[], pageSize: number): SearchResult {
  const results = items.slice(0, pageSize);
  return {
    ...base,
    count: results.length,
    candidateCount: results.length,
    resolvedDestination: null,
    results,
    pagination: {
      ...base.pagination,
      scanned: results.length,
      offset: 0,
      nextCursor: null,
      hasMore: false,
    },
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
      currency: NUITEE_PAYMENT_CURRENCY,
      ...(input.minPrice !== undefined ? {minPrice: nuiteeUsdBound(input.minPrice)} : {}),
      ...(input.maxPrice !== undefined ? {maxPrice: nuiteeUsdBound(input.maxPrice)} : {}),
      stars: input.stars,
      freeCancellation: input.freeCancellation,
      ...(input.paymentMode ? {paymentMode: input.paymentMode} : {}),
      limit: Math.min(input.pageSize, 20),
      maxRatesPerHotel: 1,
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

async function safeNuiteeDestinationRows(
  destination: Pick<ResolvedDestination, "nameEn" | "countryCode">,
  input: DiscoverySearchInput,
  context: VisibilitySearchContext,
): Promise<NuiteeSearchResult[]> {
  if (input.children > 0 && input.childrenAges.length !== input.children) return [];
  try {
    return await searchNuiteeCatalog({
      destination: destination.nameEn,
      countryCode: destination.countryCode,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      ...(input.childrenAges.length ? {childrenAges: input.childrenAges} : {}),
      ...(context.travelerCountry ? {guestNationality: context.travelerCountry} : {}),
      currency: NUITEE_PAYMENT_CURRENCY,
      ...(input.minPrice !== undefined ? {minPrice: nuiteeUsdBound(input.minPrice)} : {}),
      ...(input.maxPrice !== undefined ? {maxPrice: nuiteeUsdBound(input.maxPrice)} : {}),
      stars: input.stars,
      freeCancellation: input.freeCancellation,
      ...(input.paymentMode ? {paymentMode: input.paymentMode} : {}),
      limit: Math.min(input.pageSize, 20),
      maxRatesPerHotel: 1,
    });
  } catch (error) {
    console.error("Nuitee Connect search unavailable; continuing with existing inventory", error);
    return [];
  }
}

async function addNuiteeDestinationInventory(
  base: SearchResult,
  input: DiscoverySearchInput,
  context: VisibilitySearchContext,
  prefetchedRows?: Promise<NuiteeSearchResult[]>,
): Promise<SearchResult> {
  if (input.children > 0 && input.childrenAges.length !== input.children) return base;
  const destination = base.resolvedDestination;
  if (!destination) return base;

  const rows = prefetchedRows
    ? await prefetchedRows
    : await safeNuiteeDestinationRows(destination, input, context);
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

function nuiteeUsdBound(value:number):number {
  return convertCurrency(value,"JOD",NUITEE_PAYMENT_CURRENCY) ?? value;
}

function dedupeResults(results: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  return results.filter((hotel) => {
    if (seen.has(hotel.id)) return false;
    seen.add(hotel.id);
    return true;
  });
}
