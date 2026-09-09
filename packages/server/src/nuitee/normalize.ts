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

    const rawAvailability = number(room.availableToSell) ?? number(rate.availableToSell);
    // Never convert an explicit supplier zero into one available room. A stale or
    // sold-out offer should disappear before checkout instead of producing avoidable
    // 409 "No availability found" responses at prebook time.
    if (rawAvailability !== null && rawAvailability <= 0) return [];

    const offerRetail = records(room.offerRetailRate)[0] ?? record(room.offerRetailRate);
    const summed = records(room.rates).reduce((sum, item) => sum + (rateTotal(item) ?? 0), 0);
    const total = number(offerRetail.amount) ?? summed;
    if (!(total > 0)) return [];
    const currency = text(offerRetail.currency) ?? rateCurrency(rate) ?? "USD";
    const policy = cancellation(rate);
    const refundable = text(record(rate.cancellationPolicies).refundableTag)?.toUpperCase() === "RFN";
    const freeCancellationNow = refundable && hasNoActivePositivePenalty(policy.rules);
    const normalizedBoardCode = boardCode(rate);
    return [{
      offerId,
      rateId: text(rate.rateId),
      // Nuitee documents rates[].name as the supplier room name. The offer-level
      // roomTypes item is an offer container, so its name must not override the
      // supplier rate name or room-to-rate mapping can be displayed incorrectly.
      roomName: text(rate.name) ?? text(room.name) ?? "Provider room",
      mappedRoomId: text(rate.mappedRoomId),
      boardCode: normalizedBoardCode,
      boardName: text(rate.boardName) ?? boardFallbackName(normalizedBoardCode),
      total,
      currency,
      averageNightlyTotal: money(total / nights),
      availableToSell: rawAvailability === null ? 1 : Math.max(1, Math.round(rawAvailability)),
      paymentModes: ["PAY_NOW"] as const,
      freeCancellationNow,
      cancellationPolicy: policy,
      promotion: promotion(rate),
    }];
  }).filter((offer) => offerMatches(offer, input)).sort((left, right) => left.total - right.total);
}

function boardCode(rate: RawRecord): string | null {
  const raw = text(rate.boardType)?.trim().toUpperCase() ?? null;
  if (!raw) return null;
  if (raw === "BI" || /^BB\d*$/.test(raw)) return "BB";
  if (raw === "BDI" || raw === "BLI" || raw === "LDI" || /^HB\d*$/.test(raw)) return "HB";
  if (/^FB\d*$/.test(raw)) return "FB";
  if (/^AI\d*$/.test(raw)) return "AI";
  return raw;
}

function boardFallbackName(code: string | null): string | null {
  if (code === "RO") return "Room Only";
  if (code === "BB") return "Breakfast Included";
  if (code === "HB") return "Half Board";
  if (code === "FB") return "Full Board";
  if (code === "AI") return "All Inclusive";
  return null;
}

function cancellation(rate: RawRecord): NuiteeOffer["cancellationPolicy"] {
  const policies = record(rate.cancellationPolicies);
  const rules = records(policies.cancelPolicyInfos).map((item) => ({
    amount: number(item.amount) ?? number(item.cancelAmount) ?? number(item.penaltyAmount) ?? 0,
    from: text(item.cancelTime) ?? text(item.from),
    currency: text(item.currency),
    timezone: text(item.timezone) ?? text(item.timeZone) ?? "GMT",
  })).sort(compareCancellationRules);
  const refundable = text(policies.refundableTag)?.toUpperCase() === "RFN";
  return {name: refundable ? "Refundable rate" : "Non-refundable / provider policy", rules};
}

function compareCancellationRules(left:NuiteeOffer["cancellationPolicy"]["rules"][number], right:NuiteeOffer["cancellationPolicy"]["rules"][number]):number {
  const leftTime = cancellationTime(left.from);
  const rightTime = cancellationTime(right.from);
  if (leftTime === null && rightTime === null) return 0;
  if (leftTime === null) return 1;
  if (rightTime === null) return -1;
  return leftTime - rightTime;
}

function hasNoActivePositivePenalty(rules:NuiteeOffer["cancellationPolicy"]["rules"]):boolean {
  const now = Date.now();
  for (const rule of rules) {
    if (!(rule.amount > 0)) continue;
    const when = cancellationTime(rule.from);
    // Missing or malformed timing means we cannot safely advertise "free now".
    if (when === null || when <= now) return false;
  }
  return true;
}

function cancellationTime(value:string|null):number|null {
  if (!value) return null;
  // Nuitee commonly sends `YYYY-MM-DD HH:mm:ss`; normalizing the separator makes
  // parsing consistent in Node while preserving timestamps already in ISO form.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value) ? value.replace(" ", "T") + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? "" : "Z") : value;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function promotion(rate: RawRecord): NuiteeOffer["promotion"] {
  const retail = record(rate.retailRate);
  const item = records(retail.promotions)[0];
  if (!item) return null;
  const discount = number(item.discount);
  const discountType = text(item.discountType)?.toLowerCase();
  if (!(discount !== null && discount > 0) || discountType !== "percentage") return null;
  return {name: text(item.name) ?? "Promotion", discountPercent: Math.round(discount * 100) / 100};
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
