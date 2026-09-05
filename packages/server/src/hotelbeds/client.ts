import {createHash, createHmac, timingSafeEqual} from "node:crypto";
import {convertCurrency} from "@platform/core";

const TEST_API_BASE = "https://api.test.hotelbeds.com/hotel-api/1.0";
const LIVE_API_BASE = "https://api.hotelbeds.com/hotel-api/1.0";
const REQUEST_TIMEOUT_MS = 12_000;
const HOTELBEDS_PHOTO_BASE = "https://photos.hotelbeds.com/giata/";

export type HotelbedsSearchInput = Readonly<{
  destination?: string;
  destinationCode?: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  childrenAges?: readonly number[];
  sourceMarket?: string;
  minPrice?: number;
  maxPrice?: number;
  priceCurrency?: string;
  stars?: readonly number[];
  freeCancellation?: boolean;
  paymentMode?: "PAY_NOW" | "PAY_AT_HOTEL";
  amenities?: readonly string[];
}>;

type RawRecord = Record<string, unknown>;

export type HotelbedsCancellation = Readonly<{
  amount: number;
  from: string | null;
}>;

export type HotelbedsRateSnapshot = Readonly<{
  rateKey: string;
  rateType: string;
  roomCode: string;
  roomName: string;
  boardCode: string | null;
  boardName: string | null;
  net: number;
  sellingRate: number | null;
  total: number;
  currency: string;
  paymentType: string | null;
  cancellationPolicies: readonly HotelbedsCancellation[];
  rateCommentsId: string | null;
  quoteSignature: string | null;
}>;

export type HotelbedsOffer = Readonly<HotelbedsRateSnapshot & {
  availableToSell: number;
  averageNightlyTotal: number;
  paymentModes: readonly ("PAY_NOW" | "PAY_AT_HOTEL")[];
  freeCancellationNow: boolean;
  cancellationPolicy: {name: string; rules: readonly HotelbedsCancellation[]};
  promotion: {name: string; discountPercent: number} | null;
}>;

export type HotelbedsPhoto = Readonly<{
  url: string;
  alt: string;
  sortOrder: number;
}>;

export type HotelbedsSearchResult = Readonly<{
  id: string;
  slug: string;
  source: "HOTELBEDS_API";
  providerHotelCode: string;
  name: string;
  city: string;
  countryCode: string;
  area: string | null;
  address: string | null;
  starRating: number | null;
  currency: string;
  coverPhoto: HotelbedsPhoto | null;
  photos: readonly HotelbedsPhoto[];
  amenities: ReadonlyArray<{code: string; name: string; category: string | null}>;
  reviewSummary: {count: number; overall: number | null};
  availableOffers: number;
  rates: readonly HotelbedsOffer[];
  from: HotelbedsOffer;
}>;

export type HotelbedsHotelDetails = Readonly<{
  id: string;
  slug: string;
  source: "HOTELBEDS_API";
  providerHotelCode: string;
  name: string;
  city: string;
  countryCode: string;
  area: string | null;
  address: string | null;
  description: string | null;
  starRating: number | null;
  currency: string;
  coverPhoto: HotelbedsPhoto | null;
  photos: readonly HotelbedsPhoto[];
  amenities: ReadonlyArray<{code: string; name: string; category: string | null}>;
  reviewSummary: {count: number; overall: number | null};
  offers: readonly HotelbedsOffer[];
}>;

type HotelbedsAvailabilityResponse = Readonly<{
  hotels?: Readonly<{hotels?: readonly unknown[]}>;
}>;

export type HotelbedsBookingInput = Readonly<{
  rateKey: string;
  adults?: number;
  holderName: string;
  holderSurname: string;
  email: string;
  phone?: string;
  clientReference: string;
  childrenAges?: readonly number[];
}>;

export type HotelbedsBookingResult = Readonly<{
  providerReference: string | null;
  raw: unknown;
}>;

export type HotelbedsQuoteVerificationInput = Readonly<{
  hotelCode: string;
  rateKey: string;
  rateType: string;
  arrival: string;
  departure: string;
  net: number;
  sellingRate: number | null;
  total: number;
  currency: string;
  paymentModes: readonly string[];
  quoteSignature?: string;
}>;

export class HotelbedsConfigurationError extends Error {
  constructor() {
    super("Hotelbeds API credentials are not configured");
    this.name = "HotelbedsConfigurationError";
  }
}

export async function searchHotelbeds(input: HotelbedsSearchInput): Promise<HotelbedsSearchResult[]> {
  if (input.children > 0 && input.childrenAges?.length !== input.children) return [];
  const body = availabilityBody(input);
  if (!body) return [];
  const payload = await hotelbedsRequest<HotelbedsAvailabilityResponse>("/hotels", body);
  const hotels = payload.hotels?.hotels ?? [];
  return hotels.flatMap((item) => normalizeHotelbedsHotel(asRecord(item), input));
}

export async function getHotelbedsHotelDetails(code: string, input: HotelbedsSearchInput): Promise<HotelbedsHotelDetails | null> {
  if (!/^\d+$/.test(code)) return null;
  if (input.children > 0 && input.childrenAges?.length !== input.children) throw new Error("Hotelbeds requires the age of each child");
  const body = availabilityBody(input, [code]);
  if (!body) return null;
  const payload = await hotelbedsRequest<HotelbedsAvailabilityResponse>("/hotels", body);
  const hotel = (payload.hotels?.hotels ?? []).map((item) => asRecord(item)).find((item) => stringValue(item.code) === code);
  if (!hotel) return null;
  const offers = hotelOffers(hotel, input);
  const cheapest = offers[0];
  if (!cheapest) return null;
  return hotelDetails(hotel, code, input, offers, cheapest.currency);
}

export async function checkHotelbedsRate(rateKey: string, nights: number, expectedHotelCode?: string): Promise<{offer: HotelbedsOffer; raw: unknown} | null> {
  const payload = await hotelbedsRequest<unknown>("/checkrates", {rooms: [{rateKey}]});
  const hotel = hotelFromPayload(payload);
  if (!hotel) return null;
  const returnedHotelCode = stringValue(hotel.code);
  if (expectedHotelCode && returnedHotelCode && returnedHotelCode !== expectedHotelCode) return null;
  const offers = records(hotel.rooms)
    .flatMap((room) => records(room.rates).map((rate) => normalizeRate(room, rate, nights)))
    .filter((offer): offer is HotelbedsOffer => offer !== null);
  const offer = offers.find((item) => item.rateKey === rateKey);
  return offer ? {offer, raw: payload} : null;
}

export async function bookHotelbeds(input: HotelbedsBookingInput): Promise<HotelbedsBookingResult> {
  const paxes: RawRecord[] = [];
  for (let index = 0; index < (input.adults ?? 1); index += 1) paxes.push({roomId: 1, type: "AD", name: input.holderName, surname: input.holderSurname});
  for (const age of input.childrenAges ?? []) paxes.push({roomId: 1, type: "CH", age, name: input.holderName, surname: input.holderSurname});
  const payload = await hotelbedsRequest<unknown>("/bookings", {
    holder: {name: input.holderName, surname: input.holderSurname, email: input.email, ...(input.phone ? {phone: input.phone} : {})},
    rooms: [{rateKey: input.rateKey, paxes}],
    clientReference: input.clientReference,
    remark: "HandMeKey Hotelbeds API booking",
  }, 65_000);
  return {providerReference: bookingReference(payload), raw: payload};
}

export function verifyHotelbedsQuote(input: HotelbedsQuoteVerificationInput): boolean {
  const supplied = input.quoteSignature?.trim().toLowerCase();
  const secret = process.env.HOTELBEDS_SECRET?.trim();
  if (!secret || !supplied || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  const expected = quoteSignature(input, secret);
  const expectedBuffer = Buffer.from(expected, "hex");
  const suppliedBuffer = Buffer.from(supplied, "hex");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function hotelbedsRequest<T>(path: string, body: RawRecord, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const apiKey = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_SECRET;
  if (!apiKey || !secret) throw new HotelbedsConfigurationError();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha256").update(apiKey + secret + timestamp).digest("hex");
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {accept: "application/json", "accept-encoding": "gzip", "content-type": "application/json", "api-key": apiKey, "x-signature": signature},
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text();
  if (!response.ok) {
    console.error("Hotelbeds request failed", {path, status: response.status, body: raw.slice(0, 500)});
    throw new Error(`Hotelbeds request failed (${response.status})`);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Hotelbeds returned an invalid response");
  }
}

function apiBase(): string {
  const environment = (process.env.HOTELBEDS_ENV ?? "test").trim().toLowerCase();
  if (environment === "live") return LIVE_API_BASE;
  if (environment === "test") return TEST_API_BASE;
  throw new Error("HOTELBEDS_ENV must be either 'test' or 'live'");
}

function availabilityBody(input: HotelbedsSearchInput, hotelCodes?: readonly string[]): RawRecord | null {
  const destinationCode = input.destinationCode?.trim().toUpperCase() || (input.destination ? destinationCodeFor(input.destination) : null);
  if (!destinationCode && !hotelCodes?.length) return null;
  const occupancy: RawRecord = {rooms: 1, adults: input.adults, children: input.children};
  if (input.children > 0 && input.childrenAges?.length === input.children) occupancy.paxes = input.childrenAges.map((age) => ({type: "CH", age}));
  const body: RawRecord = {dailyRate: true, stay: {checkIn: input.arrival, checkOut: input.departure}, occupancies: [occupancy]};
  if (input.sourceMarket) body.sourceMarket = input.sourceMarket.trim().toUpperCase();
  if (hotelCodes?.length) body.hotels = {hotel: hotelCodes.map((code) => Number(code))};
  else if (destinationCode) body.destination = {code: destinationCode};
  return body;
}

function normalizeHotelbedsHotel(hotel: RawRecord, input: HotelbedsSearchInput): HotelbedsSearchResult[] {
  const code = stringValue(hotel.code);
  if (!code) return [];
  if (!hotelMatchesFilters(hotel, input)) return [];
  const offers = hotelOffers(hotel, input);
  const cheapest = offers[0];
  if (!cheapest) return [];
  return [{...hotelDetails(hotel, code, input, offers, cheapest.currency), availableOffers: offers.length, rates: offers, from: cheapest}];
}

function hotelDetails(hotel: RawRecord, code: string, input: HotelbedsSearchInput, offers: readonly HotelbedsOffer[], currency: string): HotelbedsHotelDetails & Pick<HotelbedsSearchResult, "coverPhoto" | "amenities" | "reviewSummary" | "availableOffers" | "rates" | "from"> {
  const photos = hotelPhotos(hotel, stringValue(hotel.name) ?? `Hotelbeds hotel ${code}`);
  return {
    id: `hotelbeds:${code}`,
    slug: `hotelbeds-${code}`,
    source: "HOTELBEDS_API",
    providerHotelCode: code,
    name: stringValue(hotel.name) ?? `Hotelbeds hotel ${code}`,
    city: stringValue(hotel.destinationName) ?? input.destination ?? "Hotelbeds",
    countryCode: stringValue(hotel.countryCode) ?? "",
    area: stringValue(hotel.zoneName),
    address: stringValue(hotel.address),
    description: null,
    starRating: categoryStars(hotel.categoryCode),
    currency,
    offers,
    coverPhoto: photos[0] ?? null,
    photos,
    amenities: hotelAmenities(hotel),
    reviewSummary: hotelReviewSummary(hotel),
    availableOffers: offers.length,
    rates: offers,
    from: offers[0]!,
  };
}

function hotelOffers(hotel: RawRecord, input: HotelbedsSearchInput): HotelbedsOffer[] {
  const nights = stayNights(input.arrival, input.departure);
  const hotelCode = stringValue(hotel.code);
  return records(hotel.rooms)
    .flatMap((room) => records(room.rates).map((rate) => normalizeRate(room, rate, nights)))
    .filter((offer): offer is HotelbedsOffer => offer !== null)
    .filter((offer) => offerMatchesFilters(offer, input))
    .map((offer) => hotelCode ? {...offer, quoteSignature: quoteSignatureForOffer(offer, input, hotelCode)} : offer)
    .sort((a, b) => a.total - b.total);
}

function hotelFromPayload(payload: unknown): RawRecord | null {
  const root = asRecord(payload);
  const directHotel = asRecord(root.hotel);
  if (Object.keys(directHotel).length && (directHotel.rooms || directHotel.code)) return directHotel;
  const nestedHotels = asRecord(root.hotels);
  const firstNested = records(nestedHotels.hotels)[0];
  if (firstNested && (firstNested.rooms || firstNested.code)) return firstNested;
  const rootHotels = records(root.hotels)[0];
  if (rootHotels && (rootHotels.rooms || rootHotels.code)) return rootHotels;
  return root.rooms ? root : null;
}

function bookingReference(payload: unknown): string | null {
  const root = asRecord(payload);
  const booking = asRecord(root.booking);
  return stringValue(booking.reference) ?? stringValue(booking.bookingReference) ?? stringValue(root.reference);
}

function normalizeRate(room: RawRecord, rate: RawRecord, nights: number): HotelbedsOffer | null {
  const rateKey = stringValue(rate.rateKey);
  const net = numberValue(rate.net);
  if (!rateKey || net === null) return null;
  const sellingRate = numberValue(rate.sellingRate);
  const total = sellingRate ?? net;
  const cancellationPolicies = records(rate.cancellationPolicies).flatMap((item) => {
    const amount = numberValue(item.amount);
    return amount === null ? [] : [{amount, from: stringValue(item.from)}];
  });
  const firstCancellation = cancellationPolicies[0];
  const freeCancellationNow = Boolean(firstCancellation && firstCancellation.amount === 0 && (!firstCancellation.from || Date.parse(firstCancellation.from) > Date.now()));
  const roomCode = stringValue(room.code) ?? "ROOM";
  const paymentModes = paymentModesFor(stringValue(rate.paymentType));
  if (paymentModes.length === 0 || (numberValue(rate.allotment) ?? 1) <= 0) return null;
  return {
    rateKey,
    rateType: stringValue(rate.rateType) ?? "BOOKABLE",
    roomCode,
    roomName: stringValue(room.name) ?? roomCode,
    boardCode: stringValue(rate.boardCode),
    boardName: stringValue(rate.boardName),
    net,
    sellingRate,
    total,
    currency: stringValue(rate.currency) ?? "EUR",
    paymentType: stringValue(rate.paymentType),
    cancellationPolicies,
    rateCommentsId: stringValue(rate.rateCommentsId),
    quoteSignature: null,
    availableToSell: numberValue(rate.allotment) ?? 1,
    averageNightlyTotal: roundMoney(total / nights),
    paymentModes,
    freeCancellationNow,
    cancellationPolicy: {name: cancellationPolicies.length ? (freeCancellationNow ? "Free cancellation" : "Cancellation penalty may apply") : "See cancellation policy", rules: cancellationPolicies},
    promotion: promotionValue(rate),
  };
}

function paymentModesFor(paymentType: string | null): HotelbedsOffer["paymentModes"] {
  const normalized = paymentType?.trim().toUpperCase();
  if (!normalized) return [];
  if (normalized.includes("HOTEL")) return ["PAY_AT_HOTEL"];
  if (normalized.includes("PREPAID") || normalized.includes("PAY_NOW") || normalized.includes("CREDIT") || normalized.includes("AT_WEB") || normalized === "WEB" || normalized.includes("ONLINE")) return ["PAY_NOW"];
  return [];
}

function hotelMatchesFilters(hotel: RawRecord, input: HotelbedsSearchInput): boolean {
  const stars = categoryStars(hotel.categoryCode);
  if (input.stars?.length && (stars === null || !input.stars.includes(stars))) return false;
  const areaFilter = input.amenities?.find((value) => value.toUpperCase().startsWith("FILTER:AREA:"));
  if (areaFilter) {
    const requested = normalizeFilterText(areaFilter.slice("FILTER:AREA:".length));
    const area = normalizeFilterText(`${stringValue(hotel.zoneName) ?? ""} ${stringValue(hotel.destinationName) ?? ""}`);
    if (!area.includes(requested)) return false;
  }
  const propertyFilter = input.amenities?.find((value) => value.toUpperCase().startsWith("FILTER:PROPERTY:"));
  if (propertyFilter && !propertyMatches(hotel, propertyFilter.slice("FILTER:PROPERTY:".length))) return false;
  const needsFacilityFilter = input.amenities?.some((value) => !value.toUpperCase().startsWith("FILTER:") && value.trim()) || input.amenities?.includes("FILTER:ACCESSIBLE");
  if (needsFacilityFilter) {
    const facilities = hotelAmenities(hotel);
    if (!facilities.length) return false;
    for (const raw of input.amenities ?? []) {
      const value = raw.trim().toUpperCase();
      if (!value || value.startsWith("FILTER:")) continue;
      if (!facilityMatches(facilities, value)) return false;
    }
    if (input.amenities?.includes("FILTER:ACCESSIBLE") && !facilityMatches(facilities, "WHEELCHAIR_ACCESS")) return false;
  }
  if (input.amenities?.some((value) => value.toUpperCase().startsWith("FILTER:ROOM:"))) return false;
  return true;
}

function offerMatchesFilters(offer: HotelbedsOffer, input: HotelbedsSearchInput): boolean {
  if (input.paymentMode && !offer.paymentModes.includes(input.paymentMode)) return false;
  if (input.freeCancellation && !offer.freeCancellationNow) return false;
  const priceCurrency = input.priceCurrency?.trim().toUpperCase() || "JOD";
  // The public search filter is explicitly nightly. Partner inventory uses the
  // same averageNightlyTotal field, so Hotelbeds must use it as well instead of
  // comparing a multi-night stay total to a nightly budget.
  const comparablePrice = convertCurrency(offer.averageNightlyTotal, offer.currency, priceCurrency);
  if (comparablePrice !== null) {
    if (input.minPrice !== undefined && comparablePrice < input.minPrice) return false;
    if (input.maxPrice !== undefined && comparablePrice > input.maxPrice) return false;
  }
  for (const raw of input.amenities ?? []) {
    const value = raw.trim().toUpperCase();
    if (value.startsWith("FILTER:MEAL:")) {
      const requested = value.slice("FILTER:MEAL:".length);
      const board = `${offer.boardCode ?? ""} ${offer.boardName ?? ""}`.toUpperCase();
      if (!board.includes(requested)) return false;
    }
    if (value === "FILTER:DEAL:ONLY" && !offer.promotion) return false;
  }
  return true;
}

function propertyMatches(hotel: RawRecord, value: string): boolean {
  const requested = value.trim().toUpperCase();
  const text = `${stringValue(hotel.name) ?? ""} ${stringValue(hotel.categoryName) ?? ""}`.toUpperCase();
  if (requested === "HOTEL") return !text.includes("RESORT") && !text.includes("APARTMENT") && !text.includes("VILLA");
  if (requested === "RESORT") return text.includes("RESORT");
  if (requested === "APARTMENT") return text.includes("APARTMENT");
  if (requested === "VILLA") return text.includes("VILLA");
  return false;
}

function hotelAmenities(hotel: RawRecord): Array<{code: string; name: string; category: string | null}> {
  return records(hotel.facilities).flatMap((facility) => {
    const code = stringValue(facility.facilityCode) ?? stringValue(facility.code);
    const name = stringValue(facility.facilityName) ?? stringValue(facility.name);
    return code && name ? [{code, name, category: stringValue(facility.facilityGroupName) ?? stringValue(facility.category)}] : [];
  });
}

function hotelReviewSummary(hotel: RawRecord): {count: number; overall: number | null} {
  const review = asRecord(hotel.reviews);
  const count = numberValue(review.count) ?? numberValue(hotel.reviewCount) ?? 0;
  const overall = numberValue(review.rating) ?? numberValue(review.overall) ?? numberValue(hotel.rating);
  return {count: Math.max(0, Math.round(count)), overall: overall === null ? null : Math.max(0, Math.min(10, overall))};
}

function facilityMatches(facilities: readonly {code: string; name: string}[], requested: string): boolean {
  const aliases: Record<string, readonly string[]> = {
    WIFI: ["WIFI", "INTERNET", "WIRELESS"],
    PARKING: ["PARKING", "CAR PARK"],
    POOL: ["POOL", "SWIMMING"],
    GYM: ["GYM", "FITNESS"],
    BREAKFAST: ["BREAKFAST"],
    WHEELCHAIR_ACCESS: ["WHEELCHAIR", "ACCESSIBLE", "DISABLED"],
  };
  const terms = aliases[requested] ?? [requested];
  return facilities.some((facility) => terms.some((term) => `${facility.code} ${facility.name}`.toUpperCase().includes(term)));
}

function promotionValue(rate: RawRecord): HotelbedsOffer["promotion"] {
  const promotion = asRecord(rate.promotion);
  const name = stringValue(promotion.name) ?? stringValue(promotion.code);
  const discountPercent = numberValue(promotion.discountPercent) ?? numberValue(promotion.discount);
  return name && discountPercent !== null ? {name, discountPercent} : null;
}

function hotelPhotos(hotel: RawRecord, hotelName: string): HotelbedsPhoto[] {
  const containers = [hotel.images, hotel.photos, hotel.hotelImages, hotel.image].flatMap((value) => {
    if (Array.isArray(value)) return value.map(asRecord);
    const record = asRecord(value);
    return [record, ...records(record.image), ...records(record.images)];
  });
  const seen = new Set<string>();
  const photos: HotelbedsPhoto[] = [];
  for (const [index, image] of containers.entries()) {
    const rawPath = stringValue(image.path) ?? stringValue(image.imagePath) ?? stringValue(image.url) ?? stringValue(image.name);
    if (!rawPath) continue;
    const url = rawPath.startsWith("http://") || rawPath.startsWith("https://")
      ? rawPath
      : `${HOTELBEDS_PHOTO_BASE}${rawPath.replace(/^\/+/, "")}`;
    if (seen.has(url)) continue;
    seen.add(url);
    photos.push({
      url,
      alt: stringValue(image.description) ?? stringValue(image.alt) ?? `${hotelName} photo ${index + 1}`,
      sortOrder: numberValue(image.order) ?? numberValue(image.sortOrder) ?? index,
    });
  }
  return photos.sort((left, right) => left.sortOrder - right.sortOrder);
}

function quoteSignatureForOffer(offer: HotelbedsOffer, input: HotelbedsSearchInput, hotelCode: string): string | null {
  const secret = process.env.HOTELBEDS_SECRET?.trim();
  return secret ? quoteSignature({
    hotelCode,
    rateKey: offer.rateKey,
    rateType: offer.rateType,
    arrival: input.arrival,
    departure: input.departure,
    net: offer.net,
    sellingRate: offer.sellingRate,
    total: offer.total,
    currency: offer.currency,
    paymentModes: offer.paymentModes,
  }, secret) : null;
}

function quoteSignature(input: Omit<HotelbedsQuoteVerificationInput, "quoteSignature">, secret: string): string {
  const material = [
    input.hotelCode,
    input.rateKey,
    input.rateType,
    input.arrival,
    input.departure,
    input.net.toFixed(2),
    input.sellingRate === null ? "" : input.sellingRate.toFixed(2),
    input.total.toFixed(2),
    input.currency.trim().toUpperCase(),
    [...input.paymentModes].join(","),
  ].join("|");
  return createHmac("sha256", secret).update(material).digest("hex");
}

function normalizeFilterText(value: string): string { return value.trim().replace(/\s+/g, " ").toUpperCase(); }

export function destinationCodeFor(destination: string): string | null {
  const normalized = destination.trim().toLowerCase();
  const codes: Record<string, string> = {
    amman: "AMM", "عمّان": "AMM", عمان: "AMM", aqaba: "AQJ", العقبة: "AQJ", petra: "PET", البتراء: "PET", "wadi musa": "PET", "وادي موسى": "PET", "dead sea": "DSE", "البحر الميت": "DSE", sweimeh: "DSE", سويمة: "DSE",
  };
  return codes[normalized] ?? (/^[a-z]{3}$/i.test(normalized) ? normalized.toUpperCase() : null);
}

function categoryStars(value: unknown): number | null { const stars = Number.parseInt(stringValue(value) ?? "", 10); return Number.isFinite(stars) && stars >= 1 && stars <= 5 ? stars : null; }
function stayNights(arrival: string, departure: string): number { return Math.max(1, Math.round((Date.parse(departure) - Date.parse(arrival)) / 86_400_000)); }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function stringValue(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : value === null || value === undefined ? null : String(value); }
function numberValue(value: unknown): number | null { const number = typeof value === "number" ? value : Number(value); return Number.isFinite(number) ? number : null; }
function asRecord(value: unknown): RawRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as RawRecord : {}; }
function records(value: unknown): RawRecord[] { return Array.isArray(value) ? value.map(asRecord) : []; }
