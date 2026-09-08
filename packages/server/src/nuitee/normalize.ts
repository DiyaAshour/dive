import type {NuiteeOffer, NuiteeSearchInput} from "./types";

type RawRecord = Record<string, unknown>;

export function occupancy(input: NuiteeSearchInput): RawRecord {
  const children = input.childrenAges ?? [];
  return {adults: input.adults, ...(children.length ? {children} : {})};
}

export function offersFromHotel(hotel: RawRecord, input: NuiteeSearchInput): NuiteeOffer[] {
  const nights = stayNights(input.arrival, input.departure);
  return records(hotel.roomTypes).flatMap((room) => {
    const offerId = text(room.offerId);
    const rate = records(room.rates)[0];
    if (!offerId || !rate) return [];
    const offerRetail = record(room.offerRetailRate);
    const summed = records(room.rates).reduce((sum, item) => sum + (rateTotal(item) ?? 0), 0);
    const total = number(offerRetail.amount) ?? summed;
    if (!(total > 0)) return [];
    const currency = text(offerRetail.currency) ?? rateCurrency(rate) ?? "USD";
    const policy = cancellation(rate);
    const refundable = text(record(rate.cancellationPolicies).refundableTag)?.toUpperCase() === "RFN";
    const deadline = policy.rules.find((rule) => rule.from)?.from ?? null;
    const freeCancellationNow = refundable && (!deadline || Date.parse(deadline) > Date.now());
    return [{
      offerId,
      rateId: text(rate.rateId),
      roomName: text(rate.name) ?? "Provider room",
      mappedRoomId: text(rate.mappedRoomId),
      boardCode: text(rate.boardType),
      boardName: text(rate.boardName),
      total,
      currency,
      averageNightlyTotal: money(total / nights),
      availableToSell: Math.max(1, Math.round(number(room.availableToSell) ?? number(rate.availableToSell) ?? 1)),
      paymentModes: ["PAY_NOW"] as const,
      freeCancellationNow,
      cancellationPolicy: policy,
      promotion: null,
    }];
  }).filter((offer) => offerMatches(offer, input)).sort((left, right) => left.total - right.total);
}

function cancellation(rate: RawRecord): NuiteeOffer["cancellationPolicy"] {
  const policies = record(rate.cancellationPolicies);
  const rules = records(policies.cancelPolicyInfos).map((item) => ({
    amount: number(item.amount) ?? number(item.cancelAmount) ?? number(item.penaltyAmount) ?? 0,
    from: text(item.cancelTime) ?? text(item.from),
  }));
  const refundable = text(policies.refundableTag)?.toUpperCase() === "RFN";
  return {name: refundable ? "Refundable rate" : "Non-refundable / provider policy", rules};
}

function offerMatches(offer: NuiteeOffer, input: NuiteeSearchInput): boolean {
  if (input.paymentMode === "PAY_AT_HOTEL") return false;
  if (input.freeCancellation && !offer.freeCancellationNow) return false;
  if (input.minPrice !== undefined && offer.averageNightlyTotal < input.minPrice) return false;
  if (input.maxPrice !== undefined && offer.averageNightlyTotal > input.maxPrice) return false;
  return true;
}

function rateTotal(rate: RawRecord): number | null {
  const retail = record(rate.retailRate);
  return number(records(retail.total)[0]?.amount) ?? number(retail.amount);
}
function rateCurrency(rate: RawRecord): string | null {
  const retail = record(rate.retailRate);
  return text(records(retail.total)[0]?.currency) ?? text(retail.currency);
}
function stayNights(arrival: string, departure: string): number {
  return Math.max(1, Math.round((Date.parse(`${departure}T00:00:00.000Z`) - Date.parse(`${arrival}T00:00:00.000Z`)) / 86_400_000));
}
function money(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
export function record(value: unknown): RawRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as RawRecord : {}; }
export function records(value: unknown): RawRecord[] { return Array.isArray(value) ? value.map(record) : []; }
export function text(value: unknown): string | null { if (typeof value === "string" && value.trim()) return value.trim(); if (typeof value === "number" && Number.isFinite(value)) return String(value); return null; }
export function number(value: unknown): number | null { const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN; return Number.isFinite(parsed) ? parsed : null; }
