import {database} from "@platform/database";
import type {Prisma} from "@platform/database";
import {requirePlatformAdmin} from "../admin/authorization";
import {notFound} from "../errors";

const GOOGLE_HOTEL_SELECT = {
  id: true,
  slug: true,
  name: true,
  address: true,
  city: true,
  area: true,
  countryCode: true,
  latitude: true,
  longitude: true,
  status: true,
  verified: true,
  updatedAt: true,
} satisfies Prisma.HotelSelect;

type GoogleHotelRow = Prisma.HotelGetPayload<{select: typeof GOOGLE_HOTEL_SELECT}>;
export type GoogleHotelReadiness = "READY" | "NEEDS_DATA" | "EXCLUDED";

export type GoogleHotelDistributionFilters = Readonly<{
  query?: string;
  page?: number;
}>;

export function googleHotelsCapabilities(baseUrl: string) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const enabled = process.env.GOOGLE_HOTELS_ENABLED === "true";
  const accountId = clean(process.env.GOOGLE_HOTELS_ACCOUNT_ID);
  const partnerId = clean(process.env.GOOGLE_HOTELS_PARTNER_ID);
  const ariEndpoint = clean(process.env.GOOGLE_HOTELS_ARI_ENDPOINT);
  const ariUsername = clean(process.env.GOOGLE_HOTELS_ARI_USERNAME);
  const ariPassword = clean(process.env.GOOGLE_HOTELS_ARI_PASSWORD);
  const feedUsername = clean(process.env.GOOGLE_HOTELS_FEED_USERNAME);
  const feedPassword = clean(process.env.GOOGLE_HOTELS_FEED_PASSWORD);
  return {
    enabled,
    hotelCenterConfigured: Boolean(accountId && partnerId),
    accountId: accountId || null,
    partnerId: partnerId || null,
    ariConfigured: Boolean(ariEndpoint && ariUsername && ariPassword),
    feedAuthenticationConfigured: Boolean(feedUsername && feedPassword),
    hotelListFeedUrl: `${normalizedBase}/api/v1/integrations/google-hotels/hotel-list.xml`,
    landingPagesFeedUrl: `${normalizedBase}/api/v1/integrations/google-hotels/landing-pages.xml`,
    landingGatewayUrl: `${normalizedBase}/google/hotel`,
  };
}

export async function buildGoogleHotelListXml(): Promise<string> {
  const hotels = await database().hotel.findMany({
    where: {status: "ACTIVE", verified: true},
    select: GOOGLE_HOTEL_SELECT,
    orderBy: {id: "asc"},
  });
  const listings = hotels.filter((hotel) => classifyHotel(hotel).readiness === "READY").map(hotelListingXml).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<listings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.gstatic.com/localfeed/local_feed.xsd">\n  <language>en</language>${listings}\n</listings>\n`;
}

export function buildGoogleLandingPagesXml(baseUrl: string): string {
  const gateway = `${normalizeBaseUrl(baseUrl)}/google/hotel`;
  const target = `${gateway}?hotel_id=(PARTNER-HOTEL-ID)&checkin=(CHECKINYEAR)-(CHECKINMONTH)-(CHECKINDAY)&checkout=(CHECKOUTYEAR)-(CHECKOUTMONTH)-(CHECKOUTDAY)&adults=(NUM-ADULTS)&children=(NUM-CHILDREN)&language=(USER-LANGUAGE)&utm_source=google&utm_medium=free_booking_links&utm_campaign=google_hotels`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<PointsOfSale>\n  <PointOfSale id="handmekey">\n    <DisplayNames display_text="HandMeKey" display_language="en"/>\n    <Match status="yes"/>\n    <URL>${xml(target)}</URL>\n  </PointOfSale>\n</PointsOfSale>\n`;
}

export async function resolveGoogleHotelLanding(hotelId: string) {
  const hotel = await database().hotel.findFirst({
    where: {id: hotelId, status: "ACTIVE", verified: true},
    select: GOOGLE_HOTEL_SELECT,
  });
  if (!hotel || classifyHotel(hotel).readiness !== "READY") notFound("Google hotel landing");
  return {id: hotel.id, slug: hotel.slug, name: hotel.name};
}

export async function getGoogleHotelsDistributionOverview(actorUserId: string, baseUrl: string, filters: GoogleHotelDistributionFilters = {}) {
  await requirePlatformAdmin(actorUserId);
  const query = (filters.query ?? "").trim().slice(0, 120).toLowerCase();
  const page = Math.max(1, Math.min(Math.floor(filters.page ?? 1), 10_000));
  const pageSize = 50;
  const hotels = await database().hotel.findMany({select: GOOGLE_HOTEL_SELECT, orderBy: {updatedAt: "desc"}});
  const classified = hotels.map((hotel) => ({...hotel, ...classifyHotel(hotel)}));
  const filtered = query ? classified.filter((hotel) => [hotel.name, hotel.city, hotel.area, hotel.address, hotel.countryCode, hotel.slug, hotel.id].some((value) => value?.toLowerCase().includes(query))) : classified;
  const ready = classified.filter((hotel) => hotel.readiness === "READY");
  const needsData = classified.filter((hotel) => hotel.readiness === "NEEDS_DATA");
  const excluded = classified.filter((hotel) => hotel.readiness === "EXCLUDED");
  const strongMatch = ready.filter((hotel) => hotel.latitude !== null && hotel.longitude !== null);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const boundedPage = Math.min(page, pages);
  const items = filtered.slice((boundedPage - 1) * pageSize, boundedPage * pageSize).map((hotel) => ({
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    city: hotel.city,
    area: hotel.area,
    countryCode: hotel.countryCode,
    status: hotel.status,
    verified: hotel.verified,
    hasCoordinates: hotel.latitude !== null && hotel.longitude !== null,
    readiness: hotel.readiness,
    missing: hotel.missing,
    updatedAt: hotel.updatedAt,
    landingUrl: `${normalizeBaseUrl(baseUrl)}/google/hotel?hotel_id=${encodeURIComponent(hotel.id)}`,
    canonicalUrl: `${normalizeBaseUrl(baseUrl)}/hotel/${encodeURIComponent(hotel.slug)}`,
  }));
  return {
    capability: googleHotelsCapabilities(baseUrl),
    counts: {
      total: classified.length,
      ready: ready.length,
      needsData: needsData.length,
      excluded: excluded.length,
      strongMatch: strongMatch.length,
    },
    filters: {query},
    pagination: {page: boundedPage, pages, pageSize, total: filtered.length},
    items,
  };
}

function classifyHotel(hotel: GoogleHotelRow): {readiness: GoogleHotelReadiness; missing: string[]} {
  if (hotel.status !== "ACTIVE" || !hotel.verified) return {readiness: "EXCLUDED", missing: []};
  const missing: string[] = [];
  if (!clean(hotel.name)) missing.push("name");
  if (!clean(hotel.slug)) missing.push("slug");
  if (!clean(hotel.address)) missing.push("address");
  if (!clean(hotel.city)) missing.push("city");
  const country = clean(hotel.countryCode).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) missing.push("countryCode");
  return missing.length ? {readiness: "NEEDS_DATA", missing} : {readiness: "READY", missing: []};
}

function hotelListingXml(hotel: GoogleHotelRow): string {
  const coords = hotel.latitude !== null && hotel.longitude !== null
    ? `\n    <latitude>${Number(hotel.latitude).toFixed(6)}</latitude>\n    <longitude>${Number(hotel.longitude).toFixed(6)}</longitude>`
    : "";
  return `\n  <listing>\n    <id>${xml(hotel.id)}</id>\n    <name>${xml(hotel.name)}</name>\n    <address format="simple">\n      <component name="addr1">${xml(hotel.address)}</component>\n      <component name="city">${xml(hotel.city)}</component>\n    </address>\n    <country>${xml(hotel.countryCode.toUpperCase())}</country>${coords}\n  </listing>`;
}

function normalizeBaseUrl(value: string): string {
  const source = clean(value) || "https://handmekey.com";
  return source.replace(/\/+$/, "");
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function xml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
