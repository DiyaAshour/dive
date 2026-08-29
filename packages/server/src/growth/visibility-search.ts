import type { DiscoverySearchInput } from "@platform/contracts";
import { database } from "@platform/database";
import { searchHotels } from "../discovery/service";
import { searchHotelsV2 } from "../discovery/search-v2";

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

function rankWithCampaigns<T extends Readonly<{id:string}>>(results: T[], bestByHotel: Map<string, CampaignSnapshot>) {
  return results.map((result, organicIndex) => {
    const campaign = bestByHotel.get(result.id);
    const uplift = campaign ? Math.min(12, campaign.extraCommissionPercent * 1.5) : 0;
    const visibilityBoost: VisibilityTag | null = campaign ? {sponsored:true,campaignId:campaign.id,extraCommissionPercent:campaign.extraCommissionPercent} : null;
    return {result: visibilityBoost ? {...result, visibilityBoost} : result, score: organicIndex - uplift, organicIndex};
  }).sort((a,b)=>a.score-b.score||a.organicIndex-b.organicIndex).map((item)=>item.result);
}

async function applyVisibilityBoost<T extends Readonly<{id:string}>>(results:T[], input:DiscoverySearchInput, travelerCountry?:string) {
  const country = travelerCountry?.trim().toUpperCase();
  if (!country || input.sort !== "RECOMMENDED" || results.length < 2) return results;
  const bestByHotel = await matchingCampaigns(results.map((result)=>result.id), input, country);
  return bestByHotel.size ? rankWithCampaigns(results,bestByHotel) : results;
}

export async function searchHotelsWithVisibilityBoost(input: DiscoverySearchInput, context: Readonly<{travelerCountry?: string}> = {}) {
  const base = await searchHotels(input);
  return {...base, results: await applyVisibilityBoost(base.results,input,context.travelerCountry)};
}

export async function searchHotelsV2WithVisibilityBoost(input: DiscoverySearchInput, context: Readonly<{travelerCountry?: string}> = {}) {
  const base = await searchHotelsV2(input);
  return {...base, results: await applyVisibilityBoost(base.results,input,context.travelerCountry)};
}
