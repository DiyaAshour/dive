import {createHmac, timingSafeEqual} from "node:crypto";
import type {HotelbedsOffer} from "./client";

export type HotelbedsCheckoutStay = Readonly<{
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  childrenAges: readonly number[];
}>;

export type HotelbedsCheckoutHotel = Readonly<{
  providerHotelCode: string;
  name: string;
  city: string;
  countryCode: string;
  area: string | null;
  address: string | null;
  starRating: number | null;
}>;

export type HotelbedsCheckoutSnapshot = Readonly<{
  v: 1;
  iat: number;
  exp: number;
  hotel: HotelbedsCheckoutHotel;
  offer: HotelbedsOffer;
  stay: HotelbedsCheckoutStay;
  checked: boolean;
  sourceRateType: string;
  rateComments: string | null;
}>;

type SnapshotInput = Readonly<{
  hotel: HotelbedsCheckoutHotel;
  offer: HotelbedsOffer;
  stay: HotelbedsCheckoutStay;
  checked?: boolean;
  sourceRateType?: string;
  rateComments?: string | null;
  ttlSeconds?: number;
}>;

export function createHotelbedsCheckoutToken(input: SnapshotInput): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(60, Math.min(input.ttlSeconds ?? 30 * 60, 60 * 60));
  const payload: HotelbedsCheckoutSnapshot = {
    v: 1,
    iat: now,
    exp: now + ttl,
    hotel: input.hotel,
    offer: input.offer,
    stay: input.stay,
    checked: Boolean(input.checked),
    sourceRateType: (input.sourceRateType ?? input.offer.rateType).trim().toUpperCase(),
    rateComments: input.rateComments?.trim() || null,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${mac(encoded)}`;
}

export function readHotelbedsCheckoutToken(token: string | null | undefined): HotelbedsCheckoutSnapshot | null {
  const value = token?.trim();
  if (!value || value.length > 24_000) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const encoded = value.slice(0, separator);
  const supplied = value.slice(separator + 1);
  const expected = mac(encoded);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<HotelbedsCheckoutSnapshot>;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.v !== 1 || !parsed.exp || parsed.exp < now || !parsed.iat || parsed.iat > now + 60) return null;
    if (!parsed.hotel || !/^\d+$/.test(parsed.hotel.providerHotelCode ?? "")) return null;
    if (!parsed.offer?.rateKey || !parsed.stay?.arrival || !parsed.stay?.departure) return null;
    if (!Number.isInteger(parsed.stay.adults) || parsed.stay.adults! < 1 || !Number.isInteger(parsed.stay.children) || parsed.stay.children! < 0) return null;
    if (!Array.isArray(parsed.stay.childrenAges) || parsed.stay.childrenAges.length !== parsed.stay.children) return null;
    return parsed as HotelbedsCheckoutSnapshot;
  } catch {
    return null;
  }
}

function mac(encoded: string): string {
  const secret = process.env.HOTELBEDS_SECRET?.trim();
  if (!secret) throw new Error("HOTELBEDS_SECRET is required to sign Hotelbeds checkout snapshots");
  return createHmac("sha256", secret).update(`hotelbeds-checkout:${encoded}`).digest("base64url");
}
