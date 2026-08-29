import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { VisibilityBoostCampaignInput } from "@platform/contracts";
import { database } from "@platform/database";
import { notFound } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";

const ENTITY_TYPE = "VisibilityBoostCampaign";
const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const VISIBILITY_BOOST_COOKIE = "hmk_visibility_boost";
export const VISIBILITY_BOOST_COOKIE_MAX_AGE = ATTRIBUTION_MAX_AGE_SECONDS;

type StoredVisibilityBoostCampaign = VisibilityBoostCampaignInput & Readonly<{
  id: string;
  baseCommissionRate: number;
  totalCommissionRate: number;
  createdAt: string;
  updatedAt: string;
}>;

type AttributionPayload = Readonly<{hotelId:string;campaignId:string;expiresAt:number}>;

type AttributionSelection = Readonly<{
  hotelId:string;
  arrival:string;
  departure:string;
  adults:number;
  children:number;
}>;

function asStoredCampaign(value: unknown): StoredVisibilityBoostCampaign | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<StoredVisibilityBoostCampaign>;
  if (!candidate.id || !candidate.name || !Array.isArray(candidate.targetCountries)) return null;
  return candidate as StoredVisibilityBoostCampaign;
}

async function latestCampaign(hotelId: string, campaignId: string) {
  const log = await database().auditLog.findFirst({
    where: {hotelId, entityType: ENTITY_TYPE, entityId: campaignId},
    orderBy: {createdAt: "desc"},
    select: {after: true},
  });
  return asStoredCampaign(log?.after ?? null);
}

function attributionSecret() {
  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("BOOKING_TOKEN_SECRET must be at least 32 characters");
  return secret;
}

function attributionMac(encodedPayload:string) {
  return createHmac("sha256", attributionSecret()).update(`visibility-boost:${encodedPayload}`).digest("base64url");
}

function parseAttributionToken(token:string | null | undefined): AttributionPayload | null {
  if (!token) return null;
  const [encodedPayload, suppliedMac] = token.split(".");
  if (!encodedPayload || !suppliedMac) return null;
  const expectedMac = attributionMac(encodedPayload);
  const supplied = Buffer.from(suppliedMac);
  const expected = Buffer.from(expectedMac);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload,"base64url").toString("utf8")) as Partial<AttributionPayload>;
    if (!payload.hotelId || !payload.campaignId || !Number.isFinite(payload.expiresAt) || Number(payload.expiresAt) <= Date.now()) return null;
    return {hotelId:payload.hotelId,campaignId:payload.campaignId,expiresAt:Number(payload.expiresAt)};
  } catch {
    return null;
  }
}

function stayNights(arrival:string,departure:string) {
  return Math.max(1,Math.round((Date.parse(`${departure}T00:00:00.000Z`)-Date.parse(`${arrival}T00:00:00.000Z`))/86_400_000));
}

function segmentMatches(campaign:StoredVisibilityBoostCampaign, selection:AttributionSelection) {
  if (campaign.guestSegment === "ALL") return true;
  if (campaign.guestSegment === "FAMILIES") return selection.children > 0;
  if (campaign.guestSegment === "COUPLES") return selection.children === 0 && selection.adults === 2;
  if (campaign.guestSegment === "SOLO") return selection.children === 0 && selection.adults === 1;
  return false;
}

export function visibilityBoostAttributionToken(hotelId:string,campaignId:string) {
  const payload:AttributionPayload = {hotelId,campaignId,expiresAt:Date.now()+ATTRIBUTION_MAX_AGE_SECONDS*1000};
  const encodedPayload = Buffer.from(JSON.stringify(payload),"utf8").toString("base64url");
  return `${encodedPayload}.${attributionMac(encodedPayload)}`;
}

export async function resolveVisibilityBoostAttribution(token:string | null | undefined, travelerCountry:string | null | undefined, selection:AttributionSelection) {
  const payload = parseAttributionToken(token);
  const country = travelerCountry?.trim().toUpperCase();
  if (!payload || !country || payload.hotelId !== selection.hotelId) return null;
  const campaign = await latestCampaign(selection.hotelId,payload.campaignId);
  if (!campaign || campaign.status !== "ACTIVE") return null;
  const today = new Date().toISOString().slice(0,10);
  if (today < campaign.bookingStartsOn || today > campaign.bookingEndsOn) return null;
  if (!campaign.targetCountries.includes(country)) return null;
  if (selection.arrival < campaign.stayStartsOn || selection.departure > campaign.stayEndsOn) return null;
  const nights = stayNights(selection.arrival,selection.departure);
  if (nights < campaign.minimumNights || (campaign.maximumNights !== null && nights > campaign.maximumNights)) return null;
  if (!segmentMatches(campaign,selection)) return null;
  return {campaignId:campaign.id,extraCommissionPercent:campaign.extraCommissionPercent};
}

export async function listHotelVisibilityBoostCampaigns(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const logs = await database().auditLog.findMany({
    where: {hotelId, entityType: ENTITY_TYPE},
    orderBy: {createdAt: "desc"},
    take: 1000,
    select: {entityId: true, after: true},
  });
  const seen = new Set<string>();
  const campaigns: StoredVisibilityBoostCampaign[] = [];
  for (const log of logs) {
    if (!log.entityId || seen.has(log.entityId)) continue;
    seen.add(log.entityId);
    const campaign = asStoredCampaign(log.after);
    if (campaign) campaigns.push(campaign);
  }
  return campaigns;
}

export async function createHotelVisibilityBoostCampaign(actorUserId: string, hotelId: string, input: VisibilityBoostCampaignInput) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const hotel = await database().hotel.findUnique({where: {id: hotelId}, select: {commissionRate: true}});
  if (!hotel) notFound("Hotel");
  const now = new Date().toISOString();
  const baseCommissionRate = Number(hotel.commissionRate);
  const campaign: StoredVisibilityBoostCampaign = {
    ...input,
    id: randomUUID(),
    baseCommissionRate,
    totalCommissionRate: baseCommissionRate + input.extraCommissionPercent / 100,
    createdAt: now,
    updatedAt: now,
  };
  await database().auditLog.create({data: {
    hotelId,
    actorUserId,
    action: "VISIBILITY_BOOST_CREATED",
    entityType: ENTITY_TYPE,
    entityId: campaign.id,
    after: campaign,
  }});
  return campaign;
}

export async function updateHotelVisibilityBoostCampaign(actorUserId: string, hotelId: string, campaignId: string, input: VisibilityBoostCampaignInput) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const before = await latestCampaign(hotelId, campaignId);
  if (!before) notFound("Visibility boost campaign");
  const after: StoredVisibilityBoostCampaign = {
    ...input,
    id: before.id,
    baseCommissionRate: before.baseCommissionRate,
    totalCommissionRate: before.baseCommissionRate + input.extraCommissionPercent / 100,
    createdAt: before.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await database().auditLog.create({data: {
    hotelId,
    actorUserId,
    action: "VISIBILITY_BOOST_UPDATED",
    entityType: ENTITY_TYPE,
    entityId: campaignId,
    before,
    after,
  }});
  return after;
}

export async function activeVisibilityBoostsForHotel(hotelId: string, options: Readonly<{countryCode?: string; bookingDate?: string; stayStart?: string; nights?: number}> = {}) {
  const logs = await database().auditLog.findMany({
    where: {hotelId, entityType: ENTITY_TYPE},
    orderBy: {createdAt: "desc"},
    take: 500,
    select: {entityId: true, after: true},
  });
  const seen = new Set<string>();
  const today = options.bookingDate ?? new Date().toISOString().slice(0, 10);
  const country = options.countryCode?.toUpperCase();
  const campaigns: StoredVisibilityBoostCampaign[] = [];
  for (const log of logs) {
    if (!log.entityId || seen.has(log.entityId)) continue;
    seen.add(log.entityId);
    const campaign = asStoredCampaign(log.after);
    if (!campaign || campaign.status !== "ACTIVE") continue;
    if (today < campaign.bookingStartsOn || today > campaign.bookingEndsOn) continue;
    if (country && !campaign.targetCountries.includes(country)) continue;
    if (options.stayStart && (options.stayStart < campaign.stayStartsOn || options.stayStart > campaign.stayEndsOn)) continue;
    if (options.nights !== undefined && options.nights < campaign.minimumNights) continue;
    if (options.nights !== undefined && campaign.maximumNights !== null && options.nights > campaign.maximumNights) continue;
    campaigns.push(campaign);
  }
  return campaigns;
}
