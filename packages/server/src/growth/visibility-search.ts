import type { DiscoverySearchInput } from "@platform/contracts";
import {convertCurrency} from "@platform/core";
import { database } from "@platform/database";
import { demoSearchFallback } from "../discovery/demo-fallback";
import { searchHotels } from "../discovery/service";
import { searchHotelsV2 } from "../discovery/search-v2";
import {destinationCodeFor, searchHotelbeds} from "../hotelbeds/client";

type CampaignSnapshot = Readonly<{
  id: string;
  targetCountries: string[];
  bookingStartsOn: string;
  bookingEndsOn: string;
  stayStartsOn: string;
  stayEndsOn: string;
  extraCommissionPercent: number;
  guestSegment: "ALL" | "COUPLES" | "FAMILIES" | "BUSINESS" | "SOLO";
  minimumNights: number;
  maximumNights: number | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
}>;

type VisibilityTag = Readonly<{sponsored: true; campaignId: string; extraCommissionPercent: number}>;
type VisibilityTagged<T> = T & Readonly<{visibilityBoost: VisibilityTag | null}>;
type VisibilitySearchContext = Readonly<{travelerCountry?: string | undefined}>;

function snapshot(value: unknown): CampaignSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<CampaignSnapshot>;
  return candidate.id && Array.isArray(candidate.targetCountries) ? candidate as CampaignSnapshot : null;
}

function nightsBetween(arrival: string, departure: string) {
  return Math.max(1, Math.round((Date.parse(`${departure}T00:00:00.000Z`) - Date.parse(`${arrival}T00:00:00.000Z`)) / 86_400_000));
}

function segmentMatches(campaign: CampaignSnapshot, input: DiscoverySearchInput) {
  if (campaign.guestSegment === "ALL") return true;
  if (campaign.guestSegment === "FAMILIES") return input.children > 0;
  if (campaign.guestSegment === "COUPLES") return input.children === 0 && input.adults === 2;
  if (campaign.guestSegment === "SOLO") return input.children === 0 && input.adults === 1;
  return false;
}

async function matchingCampaigns(hotelIds: string[], input: DiscoverySearchInput, country: string) {
  const logs = await database().auditLog.findMany({
    where: {hotelId: {in: hotelIds}, entityType: "VisibilityBoostCampaign"},
    orderBy: {createdAt: "desc"},
    take: 3000,
    select: {hotelId: true, entityId: true, after: true},
  });
  const bookingDate = new Date().toISOString().slice(0, 10);
  const nights = nightsBetween(input.arrival, input.departure);
  const seen = new Set<string>();
  const bestByHotel = new Map<string, CampaignSnapshot>();
  for (const log of logs) {
    if (!log.hotelId || !log.entityId) continue;
    const dedupeKey = `${log.hotelId}:${log.entityId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const campaign = snapshot(log.after);
    if (!campaign || campaign.status !== "ACTIVE") continue;
    if (!campaign.targetCountries.includes(country)) continue;
    if (bookingDate < campaign.bookingStartsOn || bookingDate > campaign.bookingEndsOn) continue;
    if (input.arrival < campaign.stayStartsOn || input.departure > campaign.stayEndsOn) continue;
    if (nights < campaign.minimumNights || (campaign.maximumNights !== null && nights > campaign.maximumNights)) continue;
    if (!segmentMatches(campaign, input)) continue;
    const current = bestByHotel.get(log.hotelId);
    if (!current || campaign.extraCommissionPercent > current.extraCommissionPercent) bestByHotel.set(log.hotelId, campaign);
  }
  return bestByHotel;
}

function tagged<T extends Readonly<{id:string}>>(result:T, campaign:CampaignSnapshot | undefined):VisibilityTagged<T> {
  return {...result,visibilityBoost:campaign ? {sponsored:true,campaignId:campaign.id,extraCommissionPercent:campaign.extraCommissionPercent} : null};
}

function rankWithCampaigns<T extends Readonly<{id:string}>>(results: T[], bestByHotel: Map<string, CampaignSnapshot>): VisibilityTagged<T>[] {
  return results.map((result, organicIndex) => {
    const campaign = bestByHotel.get(result.id);
    const uplift = campaign ? Math.min(12, campaign.extraCommissionPercent * 1.5) : 0;
    return {result:tagged(result,campaign),score:organicIndex-uplift,organicIndex};
  }).sort((a,b)=>a.score-b.score||a.organicIndex-b.organicIndex).map((item)=>item.result);
}

async function applyVisibilityBoost<T extends Readonly<{id:string}>>(results:T[], input:DiscoverySearchInput, travelerCountry?:string):Promise<VisibilityTagged<T>[]> {
  const country = travelerCountry?.trim().toUpperCase();
  if (!country || input.sort !== "RECOMMENDED" || results.length < 2) return results.map((result)=>tagged(result,undefined));
  const bestByHotel = await matchingCampaigns(results.map((result)=>result.id), input, country);
  return bestByHotel.size ? rankWithCampaigns(results,bestByHotel) : results.map((result)=>tagged(result,undefined));
}

async function safeVisibilityBoost<T extends Readonly<{id:string}>>(results:T[], input:DiscoverySearchInput, travelerCountry?:string):Promise<VisibilityTagged<T>[]> {
  try {
    return await applyVisibilityBoost(results,input,travelerCountry);
  } catch (error) {
    console.error("Visibility boost unavailable; continuing with organic results", error);
    return results.map((result)=>tagged(result,undefined));
  }
}

export async function searchHotelsWithVisibilityBoost(input: DiscoverySearchInput, context: VisibilitySearchContext = {}) {
  const base = await searchHotels(input);
  return {...base, results: await safeVisibilityBoost(base.results,input,context.travelerCountry)};
}

type SearchV2Result = Awaited<ReturnType<typeof searchHotelsV2>>;
type SearchV2Item = SearchV2Result["results"][number];

async function searchHotelbedsSafely(input: DiscoverySearchInput, base: SearchV2Result, context: VisibilitySearchContext): Promise<SearchV2Item[]> {
  // Hotelbeds requires every child's age. If a caller has not supplied them yet,
  // keep the partner search complete instead of sending an invalid provider request.
  if (input.children > 0 && input.childrenAges.length !== input.children) return [];
  try {
    const destinationCode = destinationCodeFor(base.resolvedDestination?.nameEn ?? input.destination);
    const rows = await searchHotelbeds({
      destination: base.resolvedDestination?.nameEn ?? input.destination,
      ...(destinationCode ? {destinationCode} : {}),
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
    console.info("Hotelbeds search completed", {
      destination: base.resolvedDestination?.nameEn ?? input.destination,
      destinationCode,
      resultCount: rows.length,
    });
    return rows.map((hotel) => ({
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
    } as unknown as SearchV2Item));
  } catch (error) {
    console.error("Hotelbeds search unavailable; continuing with HandMeKey inventory", error);
    return [];
  }
}

function mergeProviderResults(partnerResults: SearchV2Item[], providerResults: SearchV2Item[], pageSize: number, sort: DiscoverySearchInput["sort"]): SearchV2Item[] {
  const seen = new Set<string>();
  const all = [...partnerResults, ...providerResults].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  const ranked = all
    .map((item, index) => ({item, index}))
    .sort((left, right) => compareUnifiedResults(left.item, right.item, sort) || left.index - right.index)
    .map((entry) => entry.item);
  const visible = ranked.slice(0, pageSize);
  if (!providerResults.length || visible.some((item) => item.slug.startsWith("hotelbeds-"))) return visible;

  // Keep unified ranking, but do not let a full partner page hide a working
  // provider completely. This is the explicit “beside partner inventory”
  // rule for the first page; later cursored pages remain partner-only.
  const provider = ranked.find((item) => item.slug.startsWith("hotelbeds-"));
  if (!provider || !visible.length) return visible;
  visible[visible.length - 1] = provider;
  return visible
    .map((item, index) => ({item, index}))
    .sort((left, right) => compareUnifiedResults(left.item, right.item, sort) || left.index - right.index)
    .map((entry) => entry.item);
}

function compareUnifiedResults(left: SearchV2Item, right: SearchV2Item, sort: DiscoverySearchInput["sort"]): number {
  const leftPrice = convertCurrency(left.from.total, left.currency, "JOD") ?? left.from.total;
  const rightPrice = convertCurrency(right.from.total, right.currency, "JOD") ?? right.from.total;
  if (sort === "PRICE_ASC") return leftPrice - rightPrice || (right.starRating ?? 0) - (left.starRating ?? 0);
  if (sort === "PRICE_DESC") return rightPrice - leftPrice || (right.starRating ?? 0) - (left.starRating ?? 0);
  if (sort === "STARS_DESC") return (right.starRating ?? 0) - (left.starRating ?? 0) || rightPrice - leftPrice;
  if (sort === "RATING_DESC") return (right.reviewSummary.overall ?? -1) - (left.reviewSummary.overall ?? -1) || right.reviewSummary.count - left.reviewSummary.count || rightPrice - leftPrice;
  return recommendedScore(right) - recommendedScore(left) || leftPrice - rightPrice;
}

function recommendedScore(result: SearchV2Item): number {
  const reviews = result.reviewSummary.overall ?? 0;
  const volume = Math.min(3, Math.log10(result.reviewSummary.count + 1));
  const stars = (result.starRating ?? 0) * 0.4;
  const providerAvailability = result.slug.startsWith("hotelbeds-") ? 0.25 : 0;
  return reviews * 2 + volume + stars + providerAvailability;
}

export async function searchHotelsV2WithVisibilityBoost(input: DiscoverySearchInput, context: VisibilitySearchContext = {}) {
  type SearchV2Result = Awaited<ReturnType<typeof searchHotelsV2>>;
  let base: SearchV2Result;

  try {
    base = await searchHotelsV2(input);
    if (base.results.length === 0) {
      const demo = demoSearchFallback(input);
      if (demo.results.length > 0) base = demo as unknown as SearchV2Result;
    }
  } catch (error) {
    console.error("Production hotel search unavailable; serving demo catalog", error);
    base = demoSearchFallback(input) as unknown as SearchV2Result;
  }

  // The provider stream is joined on the first page only. Partner pagination remains
  // untouched on later pages, so the same Hotelbeds hotel cannot reappear as a duplicate.
  const providerResults = input.cursor ? [] : await searchHotelbedsSafely(input, base, context);
  const combined = mergeProviderResults(base.results, providerResults, input.pageSize, input.sort);
  return {
    ...base,
    count: combined.length,
    candidateCount: base.candidateCount + providerResults.length,
    results: await safeVisibilityBoost(combined,input,context.travelerCountry),
  };
}
