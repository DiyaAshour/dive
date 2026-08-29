import { randomUUID } from "node:crypto";
import type { VisibilityBoostCampaignInput } from "@platform/contracts";
import { database } from "@platform/database";
import { notFound } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";

const ENTITY_TYPE = "VisibilityBoostCampaign";

type StoredVisibilityBoostCampaign = VisibilityBoostCampaignInput & Readonly<{
  id: string;
  baseCommissionRate: number;
  totalCommissionRate: number;
  createdAt: string;
  updatedAt: string;
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
