import type {NuiteeHotelDetails, NuiteePhoto, NuiteePrebook, NuiteeSearchInput, NuiteeSearchResult} from "./types";
import {number, offersFromHotel, record, records, text} from "./normalize";

type RawRecord = Record<string, unknown>;

export function searchViews(payload: unknown, input: NuiteeSearchInput): NuiteeSearchResult[] {
  const root = record(payload);
  const hotels = new Map(
    records(root.hotels)
      .map((hotel) => [text(hotel.id) ?? text(hotel.hotelId) ?? "", hotel] as const)
      .filter(([id]) => Boolean(id)),
  );
  return records(root.data).flatMap((row) => {
    const code = text(row.hotelId);
    if (!code) return [];
    const offers = offersFromHotel(row, input);
    const from = offers[0];
    if (!from) return [];
    const content = hotels.get(code) ?? {};
    const name = text(content.name) ?? `Nuitee hotel ${code}`;
    const photos = hotelPhotos(content, name);
    return [{
      id: `nuitee:${code}`,
      slug: `nuitee-${code}`,
      source: "NUITEE_API" as const,
      providerHotelCode: code,
      name,
      city: text(content.city) ?? input.destination,
      countryCode: (text(content.country) ?? text(content.countryCode) ?? input.countryCode ?? "").toUpperCase(),
      area: text(content.area) ?? text(content.neighborhood),
      address: text(content.address),
      starRating: stars(number(content.starRating) ?? number(content.stars)),
      currency: from.currency,
      coverPhoto: photos[0] ?? null,
      photos,
      amenities: amenities(content),
      reviewSummary: reviewSummary(content),
      availableOffers: offers.length,
      rates: offers,
      from,
    }];
  });
}

export function hotelView(code: string, contentPayload: unknown, ratesPayload: unknown, input: NuiteeSearchInput, sandbox: boolean): NuiteeHotelDetails | null {
  const content = record(record(contentPayload).data);
  const rateRows = records(record(ratesPayload).data);
  const row = rateRows.find((item) => text(item.hotelId) === code) ?? rateRows[0];
  if (!row) return null;
  const offers = offersFromHotel(row, input);
  if (!offers.length) return null;
  const name = text(content.name) ?? `Nuitee hotel ${code}`;
  const photos = hotelPhotos(content, name);
  const times = record(content.checkinCheckoutTimes);
  return {
    id: `nuitee:${code}`,
    slug: `nuitee-${code}`,
    source: "NUITEE_API",
    providerHotelCode: code,
    name,
    city: text(content.city) ?? input.destination,
    countryCode: (text(content.country) ?? text(content.countryCode) ?? input.countryCode ?? "").toUpperCase(),
    area: text(content.area) ?? text(content.neighborhood),
    address: text(content.address),
    description: plainText(text(content.hotelDescription)),
    starRating: stars(number(content.starRating) ?? number(content.stars)),
    currency: offers[0]!.currency,
    coverPhoto: photos[0] ?? null,
    photos,
    amenities: amenities(content),
    reviewSummary: reviewSummary(content),
    checkInTime: text(times.checkin) ?? text(times.checkinStart),
    checkOutTime: text(times.checkout),
    offers,
    sandbox,
  };
}

export function prebookView(payload: unknown, fallbackOfferId: string, sandbox: boolean): NuiteePrebook {
  const root = record(payload);
  const data = record(root.data);
  const room = records(data.roomTypes)[0] ?? {};
  const rate = records(room.rates)[0] ?? {};
  const retail = record(rate.retailRate);
  const total = records(retail.total)[0] ?? {};
  const policies = record(rate.cancellationPolicies);
  const rules = records(policies.cancelPolicyInfos).map((item) => ({
    amount: number(item.amount) ?? number(item.cancelAmount) ?? number(item.penaltyAmount) ?? 0,
    from: text(item.cancelTime) ?? text(item.from),
  }));
  const refundable = text(policies.refundableTag)?.toUpperCase() === "RFN";
  return {
    prebookId: text(data.prebookId) ?? "",
    offerId: text(data.offerId) ?? fallbackOfferId,
    hotelId: text(data.hotelId) ?? "",
    price: number(data.price) ?? number(total.amount) ?? number(retail.amount) ?? 0,
    currency: text(data.currency) ?? text(total.currency) ?? text(retail.currency) ?? "USD",
    commission: number(data.commission),
    roomName: text(rate.name),
    boardName: text(rate.boardName),
    cancellationPolicy: {name: refundable ? "Refundable rate" : "Non-refundable / provider policy", rules},
    sandbox: Boolean(root.sandbox) || sandbox,
    raw: payload,
  };
}

function hotelPhotos(content: RawRecord, hotelName: string): NuiteePhoto[] {
  const seen = new Set<string>();
  const photos: NuiteePhoto[] = [];
  const main = text(content.main_photo) ?? text(content.mainPhoto);
  if (main) { seen.add(main); photos.push({url: main, alt: hotelName, sortOrder: 0}); }
  for (const [index, image] of records(content.hotelImages).entries()) {
    const url = text(image.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    photos.push({url, alt: text(image.caption) ?? `${hotelName} photo ${index + 1}`, sortOrder: number(image.order) ?? index + 1});
  }
  return photos.sort((left, right) => left.sortOrder - right.sortOrder);
}

function amenities(content: RawRecord): Array<{code: string; name: string; category: string | null}> {
  const rich = records(content.facilities).flatMap((item, index) => {
    const name = text(item.name);
    return name ? [{code: String(number(item.facilityId) ?? text(item.code) ?? index), name, category: null}] : [];
  });
  if (rich.length) return rich;
  return Array.isArray(content.hotelFacilities)
    ? content.hotelFacilities.flatMap((item, index) => typeof item === "string" && item.trim() ? [{code: `facility-${index}`, name: item.trim(), category: null}] : [])
    : [];
}

function reviewSummary(content: RawRecord): {count: number; overall: number | null} {
  const count = Math.max(0, Math.round(number(content.reviewCount) ?? 0));
  const rating = number(content.rating);
  return {count, overall: rating === null ? null : Math.max(0, Math.min(10, rating))};
}
function stars(value: number | null): number | null { return value === null ? null : Math.max(0, Math.min(5, value)); }
function plainText(value: string | null): string | null { return value ? value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim() || null : null; }
