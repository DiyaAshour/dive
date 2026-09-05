import type { DiscoverySearchInput } from "@platform/contracts";
import { database } from "@platform/database";
import { demoSearchFallback } from "../discovery/demo-fallback";
import { searchHotels } from "../discovery/service";
import { searchHotelsV2 } from "../discovery/search-v2";
import { searchHotelbeds } from "../hotelbeds/client";

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
  // Hotelbeds requires every child's age. The current public search form does not
  // collect those ages yet, so keep the partner search complete for family queries.
  if (input.children > 0) return [];
  try {
    const rows = await searchHotelbeds({
      destination: base.resolvedDestination?.nameEn ?? input.destination,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      ...(context.travelerCountry ? {sourceMarket: context.travelerCountry} : {}),
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
      coverPhoto: null,
      amenities: [],
      reviewSummary: hotel.reviewSummary,
      availableOffers: hotel.availableOffers,
      from: hotel.from,
    } as unknown as SearchV2Item));
  } catch (error) {
    console.error("Hotelbeds search unavailable; continuing with HandMeKey inventory", error);
    return [];
  }
}

function mergeProviderResults(partnerResults: SearchV2Item[], providerResults: SearchV2Item[], pageSize: number): SearchV2Item[] {
  if (!providerResults.length) return partnerResults;
  if (!partnerResults.length) return providerResults.slice(0, pageSize);
  const providerQuota = Math.min(providerResults.length, Math.max(2, Math.floor(pageSize / 5)));
  const partnerQuota = Math.max(0, pageSize - providerQuota);
  const partners = partnerResults.slice(0, partnerQuota);
  const merged: SearchV2Item[] = [];
  const interval = Math.max(1, Math.ceil(partners.length / providerQuota));
  let providerIndex = 0;
  for (let index = 0; index < partners.length || providerIndex < providerQuota; index += 1) {
    if (index < partners.length) merged.push(partners[index]!);
    if ((index + 1) % interval === 0 && providerIndex < providerQuota) merged.push(providerResults[providerIndex++]!);
  }
  while (providerIndex < providerQuota) merged.push(providerResults[providerIndex++]!);
  return merged.slice(0, pageSize);
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

  const providerResults = await searchHotelbedsSafely(input, base, context);
  const combined = mergeProviderResults(base.results, providerResults, input.pageSize);
  return {
    ...base,
    count: combined.length,
    candidateCount: base.candidateCount + providerResults.length,
    results: await safeVisibilityBoost(combined,input,context.travelerCountry),
  };
}
