import {createHash} from "node:crypto";

const TEST_API_BASE = "https://api.test.hotelbeds.com/hotel-api/1.0";
const LIVE_API_BASE = "https://api.hotelbeds.com/hotel-api/1.0";
const REQUEST_TIMEOUT_MS = 12_000;

export type HotelbedsSearchInput = Readonly<{
  destination?: string;
  destinationCode?: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  childrenAges?: readonly number[];
  sourceMarket?: string;
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
}>;

export type HotelbedsOffer = Readonly<HotelbedsRateSnapshot & {
  availableToSell: number;
  averageNightlyTotal: number;
  paymentModes: readonly ("PAY_NOW" | "PAY_AT_HOTEL")[];
  freeCancellationNow: boolean;
  cancellationPolicy: {name: string; rules: readonly HotelbedsCancellation[]};
  promotion: null;
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
  coverPhoto: null;
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

export async function checkHotelbedsRate(rateKey: string, nights: number): Promise<{offer: HotelbedsOffer; raw: unknown} | null> {
  const payload = await hotelbedsRequest<unknown>("/checkrates", {rooms: [{rateKey}]});
  const hotel = hotelFromPayload(payload);
  if (!hotel) return null;
  const offers = records(hotel.rooms)
    .flatMap((room) => records(room.rates).map((rate) => normalizeRate(room, rate, nights)))
    .filter((offer): offer is HotelbedsOffer => offer !== null);
  const offer = offers.find((item) => item.rateKey === rateKey) ?? offers[0];
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

async function hotelbedsRequest<T>(path: string, body: RawRecord, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const apiKey = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_SECRET;
  if (!apiKey || !secret) return ({hotels: {hotels: []}} as T);

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

function apiBase(): string { return process.env.HOTELBEDS_ENV === "live" ? LIVE_API_BASE : TEST_API_BASE; }

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
  const offers = hotelOffers(hotel, input);
  const cheapest = offers[0];
  if (!cheapest) return [];
  return [{...hotelDetails(hotel, code, input, offers, cheapest.currency), coverPhoto: null, amenities: [], reviewSummary: {count: 0, overall: null}, availableOffers: offers.length, rates: offers, from: cheapest}];
}

function hotelDetails(hotel: RawRecord, code: string, input: HotelbedsSearchInput, offers: readonly HotelbedsOffer[], currency: string): HotelbedsHotelDetails & Pick<HotelbedsSearchResult, "coverPhoto" | "amenities" | "reviewSummary" | "availableOffers" | "rates" | "from"> {
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
    coverPhoto: null,
    amenities: [],
    reviewSummary: {count: 0, overall: null},
    availableOffers: offers.length,
    rates: offers,
    from: offers[0]!,
  };
}

function hotelOffers(hotel: RawRecord, input: HotelbedsSearchInput): HotelbedsOffer[] {
  const nights = stayNights(input.arrival, input.departure);
  return records(hotel.rooms).flatMap((room) => records(room.rates).map((rate) => normalizeRate(room, rate, nights))).filter((offer): offer is HotelbedsOffer => offer !== null).sort((a, b) => a.total - b.total);
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
    availableToSell: numberValue(rate.allotment) ?? 1,
    averageNightlyTotal: roundMoney(total / nights),
    paymentModes: paymentModesFor(stringValue(rate.paymentType)),
    freeCancellationNow,
    cancellationPolicy: {name: cancellationPolicies.length ? (freeCancellationNow ? "Free cancellation" : "Cancellation penalty may apply") : "See cancellation policy", rules: cancellationPolicies},
    promotion: null,
  };
}

function paymentModesFor(paymentType: string | null): HotelbedsOffer["paymentModes"] { return paymentType?.toUpperCase().includes("HOTEL") ? ["PAY_AT_HOTEL"] : ["PAY_NOW"]; }

function destinationCodeFor(destination: string): string | null {
  const normalized = destination.trim().toLowerCase();
  const codes: Record<string, string> = {amman: "AMM", "عمّان": "AMM", عمان: "AMM", aqaba: "AQJ", العقبة: "AQJ", petra: "PET", البتراء: "PET", "dead sea": "DSE", "البحر الميت": "DSE"};
  return codes[normalized] ?? (/^[a-z]{3}$/i.test(normalized) ? normalized.toUpperCase() : null);
}

function categoryStars(value: unknown): number | null { const stars = Number.parseInt(stringValue(value) ?? "", 10); return Number.isFinite(stars) && stars >= 1 && stars <= 5 ? stars : null; }
function stayNights(arrival: string, departure: string): number { return Math.max(1, Math.round((Date.parse(departure) - Date.parse(arrival)) / 86_400_000)); }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function stringValue(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : value === null || value === undefined ? null : String(value); }
function numberValue(value: unknown): number | null { const number = typeof value === "number" ? value : Number(value); return Number.isFinite(number) ? number : null; }
function asRecord(value: unknown): RawRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as RawRecord : {}; }
function records(value: unknown): RawRecord[] { return Array.isArray(value) ? value.map(asRecord) : []; }
