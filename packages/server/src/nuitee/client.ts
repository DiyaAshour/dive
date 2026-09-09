import {hotelView, prebookView, searchViews} from "./views";
import {occupancy, record, records, text} from "./normalize";
import type {NuiteeBookingInput, NuiteeBookingResult, NuiteeHotelDetails, NuiteePrebook, NuiteeSearchInput, NuiteeSearchResult} from "./types";

const API_BASE = "https://api.liteapi.travel/v3.0";
const BOOK_BASE = "https://book.liteapi.travel/v3.0";
const REQUEST_TIMEOUT_MS = 15_000;
export const NUITEE_PAYMENT_CURRENCY = "USD";

type RawRecord = Record<string, unknown>;
export type NuiteeHotelNameSuggestion = Readonly<{
  id: string;
  name: string;
  city: string;
  countryCode: string;
  address: string | null;
}>;
export type NuiteeHotelNameSearchInput = Omit<NuiteeSearchInput, "destination"> & Readonly<{hotelName: string}>;

export class NuiteeConfigurationError extends Error {
  constructor() {
    super("Nuitee Connect API key is not configured");
    this.name = "NuiteeConfigurationError";
  }
}

export class NuiteeApiError extends Error {
  readonly status: number;
  readonly code: number | null;
  readonly description: string | null;
  readonly providerMessage: string | null;

  constructor(input: Readonly<{status:number;code:number|null;description:string|null;providerMessage:string|null}>) {
    const detail = input.description ?? input.providerMessage;
    super(detail ? `Nuitee request failed (${input.status}): ${detail}` : `Nuitee request failed (${input.status})`);
    this.name = "NuiteeApiError";
    this.status = input.status;
    this.code = input.code;
    this.description = input.description;
    this.providerMessage = input.providerMessage;
  }
}

export async function searchNuiteeHotelSuggestions(query: string, limit = 5, countryCode = "JO"): Promise<NuiteeHotelNameSuggestion[]> {
  if (!isNuiteeConfigured()) return [];
  const hotelName = query.trim();
  if (hotelName.length < 2) return [];
  const country = countryCode.trim().toUpperCase() || "JO";
  const params = new URLSearchParams({
    countryCode: country,
    hotelName,
    offset: "0",
    limit: String(Math.max(1, Math.min(limit, 12))),
  });
  const payload = await request<unknown>(`${API_BASE}/data/hotels?${params.toString()}`, "GET", undefined, 8_000);
  return records(record(payload).data).flatMap((hotel) => {
    const id = text(hotel.id) ?? text(hotel.hotelId);
    const name = text(hotel.name) ?? text(hotel.hotelName);
    if (!id || !name) return [];
    return [{
      id,
      name,
      city: text(hotel.city) ?? text(hotel.cityName) ?? "",
      countryCode: (text(hotel.countryCode) ?? text(hotel.country) ?? country).toUpperCase(),
      address: text(hotel.address),
    }];
  });
}

export async function searchNuiteeByHotelName(input: NuiteeHotelNameSearchInput): Promise<NuiteeSearchResult[]> {
  if (!isNuiteeConfigured()) return [];
  if (input.paymentMode === "PAY_AT_HOTEL") return [];
  if (input.children > 0 && input.childrenAges?.length !== input.children) return [];
  const hotelName = input.hotelName.trim();
  if (hotelName.length < 2) return [];
  const maxHotels = Math.max(1, Math.min(input.limit ?? 20, 20));
  const countryCode = input.countryCode?.trim().toUpperCase() || "JO";
  const matches = await searchNuiteeHotelSuggestions(hotelName, maxHotels, countryCode);
  if (!matches.length) return [];
  const body: RawRecord = {
    hotelIds: matches.map((hotel) => hotel.id),
    occupancies: [occupancy({...input, destination: hotelName})],
    currency: (input.currency ?? NUITEE_PAYMENT_CURRENCY).trim().toUpperCase(),
    guestNationality: (input.guestNationality ?? countryCode).trim().toUpperCase(),
    checkin: input.arrival,
    checkout: input.departure,
    roomMapping: true,
    includeHotelData: true,
    maxRatesPerHotel: Math.max(1, Math.min(25, input.maxRatesPerHotel ?? 3)),
    limit: matches.length,
    timeout: 8,
    ...(input.stars?.length ? {starRating: input.stars} : {}),
    ...(input.freeCancellation ? {refundableRatesOnly: true} : {}),
    ...marginBody(),
  };
  const payload = await request<unknown>(`${API_BASE}/hotels/rates`, "POST", body);
  const {hotelName: _hotelName, ...rest} = input;
  return searchViews(payload, {...rest, destination: hotelName, countryCode});
}

export async function searchNuiteeHotelIds(input: NuiteeSearchInput & Readonly<{hotelIds: readonly string[]}>): Promise<NuiteeSearchResult[]> {
  if (!isNuiteeConfigured()) return [];
  if (input.paymentMode === "PAY_AT_HOTEL") return [];
  if (input.children > 0 && input.childrenAges?.length !== input.children) return [];
  const hotelIds = [...new Set(input.hotelIds.map((id) => id.trim()).filter((id) => /^[A-Za-z0-9_-]+$/.test(id)))].slice(0, 50);
  if (!hotelIds.length) return [];
  const guestNationality = (input.guestNationality ?? input.countryCode ?? "JO").trim().toUpperCase();
  const body: RawRecord = {
    hotelIds,
    occupancies: [occupancy(input)],
    currency: (input.currency ?? NUITEE_PAYMENT_CURRENCY).trim().toUpperCase(),
    guestNationality,
    checkin: input.arrival,
    checkout: input.departure,
    roomMapping: true,
    includeHotelData: true,
    maxRatesPerHotel: Math.max(1, Math.min(25, input.maxRatesPerHotel ?? 3)),
    limit: Math.min(hotelIds.length, Math.max(1, Math.min(50, input.limit ?? hotelIds.length))),
    timeout: 8,
    ...(input.stars?.length ? {starRating: input.stars} : {}),
    ...(input.freeCancellation ? {refundableRatesOnly: true} : {}),
    ...marginBody(),
  };
  const payload = await request<unknown>(`${API_BASE}/hotels/rates`, "POST", body);
  return searchViews(payload, input);
}

export async function searchNuitee(input: NuiteeSearchInput): Promise<NuiteeSearchResult[]> {
  if (!isNuiteeConfigured()) return [];
  if (input.paymentMode === "PAY_AT_HOTEL") return [];
  if (input.children > 0 && input.childrenAges?.length !== input.children) return [];
  const countryCode = (input.countryCode ?? "JO").trim().toUpperCase();
  const body: RawRecord = {
    occupancies: [occupancy(input)],
    currency: (input.currency ?? NUITEE_PAYMENT_CURRENCY).trim().toUpperCase(),
    guestNationality: (input.guestNationality ?? countryCode).trim().toUpperCase(),
    checkin: input.arrival,
    checkout: input.departure,
    countryCode,
    cityName: input.destination.trim(),
    roomMapping: true,
    includeHotelData: true,
    maxRatesPerHotel: Math.max(1, Math.min(25, input.maxRatesPerHotel ?? 3)),
    limit: Math.max(1, Math.min(50, input.limit ?? 20)),
    timeout: 8,
    ...(input.stars?.length ? {starRating: input.stars} : {}),
    ...(input.freeCancellation ? {refundableRatesOnly: true} : {}),
    ...marginBody(),
  };
  const payload = await request<unknown>(`${API_BASE}/hotels/rates`, "POST", body);
  return searchViews(payload, input);
}

export async function getNuiteeHotelDetails(code: string, input: NuiteeSearchInput): Promise<NuiteeHotelDetails | null> {
  const clean = code.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(clean)) return null;
  if (input.children > 0 && input.childrenAges?.length !== input.children) throw new Error("Nuitee requires the age of each child");
  const rateBody: RawRecord = {
    hotelIds: [clean],
    occupancies: [occupancy(input)],
    currency: (input.currency ?? NUITEE_PAYMENT_CURRENCY).trim().toUpperCase(),
    guestNationality: (input.guestNationality ?? input.countryCode ?? "JO").trim().toUpperCase(),
    checkin: input.arrival,
    checkout: input.departure,
    roomMapping: true,
    includeHotelData: true,
    maxRatesPerHotel: Math.max(1, Math.min(50, input.maxRatesPerHotel ?? 20)),
    timeout: 10,
    ...(input.freeCancellation ? {refundableRatesOnly: true} : {}),
    ...marginBody(),
  };
  const [content, rates] = await Promise.all([
    request<unknown>(`${API_BASE}/data/hotel?hotelId=${encodeURIComponent(clean)}`, "GET"),
    request<unknown>(`${API_BASE}/hotels/rates`, "POST", rateBody),
  ]);
  return hotelView(clean, content, rates, input, isNuiteeSandbox());
}

export async function prebookNuitee(offerId: string): Promise<NuiteePrebook> {
  const clean = offerId.trim();
  if (!clean) throw new Error("Nuitee offerId is required");
  const body = {offerId: clean, usePaymentSdk: true};
  // A payment-enabled prebook creates a new transaction/payment intent. Do not
  // retry this call automatically: every successful prebook produces a new
  // prebookId + transactionId pair, so a blind replay can orphan the first pair.
  const payload = await request<unknown>(`${BOOK_BASE}/rates/prebook?timeout=30`, "POST", body, 35_000);
  const view = prebookView(payload, clean, isNuiteeSandbox());
  if (!view.prebookId) throw new Error("Nuitee did not return a prebookId");
  if (!view.transactionId || !view.secretKey) throw new Error("Nuitee Payment SDK data was not returned by prebook");
  return view;
}

export function nuiteeClientReference(transactionId: string): string {
  return `HMK-${transactionId}`.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 120);
}

export async function findNuiteeBookingByClientReference(clientReference: string): Promise<NuiteeBookingResult | null> {
  const clean = clientReference.trim();
  if (!clean) return null;
  const params = new URLSearchParams({clientReference: clean, timeout: "4"});
  const payload = await request<unknown>(`${BOOK_BASE}/bookings?${params.toString()}`, "GET", undefined, 10_000);
  const root = record(payload);
  const dataRecord = record(root.data);
  const rows = records(root.data).length
    ? records(root.data)
    : records(dataRecord.bookings).length
      ? records(dataRecord.bookings)
      : records(root.bookings);
  const row = rows[0];
  if (!row) return null;
  const nested = record(row.booking);
  const source = Object.keys(nested).length ? nested : row;
  const bookingId = text(source.bookingId) ?? text(source.id) ?? text(source.bookingReference);
  if (!bookingId) return null;
  return {
    bookingId,
    hotelConfirmationCode: text(source.hotelConfirmationCode) ?? text(source.confirmationCode) ?? text(source.hotelConfirmationNumber),
    status: text(source.status),
    raw: payload,
  };
}

export async function bookNuitee(input: NuiteeBookingInput): Promise<NuiteeBookingResult> {
  const prebookId = input.prebookId.trim();
  const transactionId = input.transactionId.trim();
  const phone = input.phone?.trim();
  if (!prebookId) throw new Error("Nuitee prebookId is required");
  if (!transactionId) throw new Error("Nuitee transactionId is required");
  const payload = await request<unknown>(`${BOOK_BASE}/rates/book`, "POST", {
    prebookId,
    clientReference: nuiteeClientReference(transactionId),
    holder: {
      firstName: input.holderFirstName.trim(),
      lastName: input.holderLastName.trim(),
      email: input.email.trim(),
      ...(phone ? {phone} : {}),
    },
    guests: [{occupancyNumber: 1, firstName: input.holderFirstName.trim(), lastName: input.holderLastName.trim(), email: input.email.trim(), ...(phone ? {phone} : {})}],
    payment: {method: "TRANSACTION", transactionId},
  }, 70_000);
  const data = record(record(payload).data);
  return {
    bookingId: text(data.bookingId) ?? text(data.id) ?? text(record(payload).bookingId),
    hotelConfirmationCode: text(data.hotelConfirmationCode) ?? text(data.confirmationCode),
    status: text(data.status),
    raw: payload,
  };
}

async function request<T>(url: string, method: "GET" | "POST", body?: RawRecord, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const apiKey = process.env.NUITEE_API_KEY?.trim();
  if (!apiKey) throw new NuiteeConfigurationError();
  const response = await fetch(url, {
    method,
    headers: {accept: "application/json", "X-API-Key": apiKey, ...(body ? {"content-type": "application/json"} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 204) return {data: []} as T;
  const raw = await response.text();
  if (!response.ok) {
    const provider = parseProviderError(raw);
    console.error("Nuitee request failed", {path: new URL(url).pathname, status: response.status, code: provider.code, description: provider.description, message: provider.providerMessage});
    throw new NuiteeApiError({status: response.status, ...provider});
  }
  try { return JSON.parse(raw) as T; } catch { throw new Error("Nuitee returned an invalid response"); }
}

function parseProviderError(raw: string): {code:number|null;description:string|null;providerMessage:string|null} {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const provider = record(record(parsed).error);
    const rawCode = provider.code;
    const code = typeof rawCode === "number" && Number.isFinite(rawCode)
      ? rawCode
      : typeof rawCode === "string" && /^\d+$/.test(rawCode) ? Number(rawCode) : null;
    return {code, description: text(provider.description), providerMessage: text(provider.message)};
  } catch {
    return {code:null, description:null, providerMessage:null};
  }
}
function marginBody(): RawRecord {
  const margin = Number(process.env.NUITEE_MARGIN_PERCENT ?? "");
  return Number.isFinite(margin) && margin >= 0 && margin <= 50 ? {margin} : {};
}
export function isNuiteeConfigured(): boolean { return Boolean(process.env.NUITEE_API_KEY?.trim()); }
export function isNuiteeSandbox(): boolean {
  const key = process.env.NUITEE_API_KEY?.trim().toLowerCase() ?? "";
  return key.startsWith("sand_") || key.startsWith("sandbox_");
}
export type {NuiteeBookingInput, NuiteeBookingResult, NuiteeHotelDetails, NuiteeOffer, NuiteePrebook, NuiteeSearchInput, NuiteeSearchResult} from "./types";
