import {createHash} from "node:crypto";

const TEST_API_BASE = "https://api.test.hotelbeds.com/hotel-api/1.0";
const LIVE_API_BASE = "https://api.hotelbeds.com/hotel-api/1.0";

type JsonRecord = Record<string, unknown>;
export type HotelbedsCancellationMode = "SIMULATION" | "CANCELLATION";

export type HotelbedsPostBookingResult = Readonly<{
  reference: string;
  status: string | null;
  currency: string | null;
  amount: number | null;
  raw: unknown;
}>;

export async function getHotelbedsBookingDetail(reference: string): Promise<HotelbedsPostBookingResult> {
  const cleanReference = bookingReference(reference);
  const payload = await hotelbedsBookingRequest(`/bookings/${encodeURIComponent(cleanReference)}`, "GET");
  return postBookingView(cleanReference, payload);
}

export async function simulateHotelbedsBookingCancellation(reference: string): Promise<HotelbedsPostBookingResult> {
  return hotelbedsCancellation(reference, "SIMULATION");
}

export async function cancelHotelbedsBooking(reference: string): Promise<HotelbedsPostBookingResult> {
  return hotelbedsCancellation(reference, "CANCELLATION");
}

async function hotelbedsCancellation(reference: string, mode: HotelbedsCancellationMode): Promise<HotelbedsPostBookingResult> {
  const cleanReference = bookingReference(reference);
  const payload = await hotelbedsBookingRequest(`/bookings/${encodeURIComponent(cleanReference)}?cancellationFlag=${mode}`, "DELETE");
  return postBookingView(cleanReference, payload);
}

async function hotelbedsBookingRequest(path: string, method: "GET" | "DELETE"): Promise<unknown> {
  const apiKey = process.env.HOTELBEDS_API_KEY?.trim();
  const secret = process.env.HOTELBEDS_SECRET?.trim();
  if (!apiKey || !secret) throw new Error("Hotelbeds API credentials are not configured");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha256").update(apiKey + secret + timestamp).digest("hex");
  const response = await fetch(`${bookingApiBase()}${path}`, {
    method,
    headers: {accept: "application/json", "accept-encoding": "gzip", "api-key": apiKey, "x-signature": signature},
    cache: "no-store",
    signal: AbortSignal.timeout(65_000),
  });
  const raw = await response.text();
  if (!response.ok) {
    console.error("Hotelbeds post-booking request failed", {method, path: path.split("?")[0], status: response.status, body: raw.slice(0, 500)});
    throw new Error(`Hotelbeds post-booking request failed (${response.status})`);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Hotelbeds returned an invalid post-booking response");
  }
}

function postBookingView(reference: string, payload: unknown): HotelbedsPostBookingResult {
  const booking = findBooking(payload);
  return {
    reference: stringValue(booking.reference) ?? reference,
    status: stringValue(booking.status),
    currency: stringValue(booking.currency),
    amount: firstNumber(booking, ["totalNet", "totalAmount", "pendingAmount", "totalSellingRate"]),
    raw: payload,
  };
}

function findBooking(payload: unknown): JsonRecord {
  const root = record(payload);
  const direct = record(root.booking);
  if (Object.keys(direct).length) return direct;
  const bookings = record(root.bookings);
  const nested = array(bookings.bookings)[0] ?? array(bookings.booking)[0];
  if (nested) return nested;
  return root;
}

function bookingReference(value: string): string {
  const clean = value.trim();
  if (!clean || !/^[A-Za-z0-9-]+$/.test(clean)) throw new Error("Invalid Hotelbeds booking reference");
  return clean;
}
function firstNumber(source: JsonRecord, keys: readonly string[]): number | null { for (const key of keys) { const value = Number(source[key]); if (Number.isFinite(value)) return value; } return null; }
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function array(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.map(record) : []; }
function stringValue(value: unknown): string | null { if (value === null || value === undefined) return null; const text = String(value).trim(); return text || null; }
function bookingApiBase(): string {
  const environment = (process.env.HOTELBEDS_ENV ?? "test").trim().toLowerCase();
  if (environment === "live") return LIVE_API_BASE;
  if (environment === "test") return TEST_API_BASE;
  throw new Error("HOTELBEDS_ENV must be either 'test' or 'live'");
}
