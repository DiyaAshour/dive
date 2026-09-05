import {createHash} from "node:crypto";
import {database} from "@platform/database";

const TEST_CONTENT_BASE = "https://api.test.hotelbeds.com/hotel-content-api/1.0";
const LIVE_CONTENT_BASE = "https://api.hotelbeds.com/hotel-content-api/1.0";
const DEFAULT_DESTINATIONS = ["AMM", "AQJ", "PET", "DSE"] as const;
const PAGE_SIZE = 1000;

type JsonRecord = Record<string, unknown>;
type CachedComment = Readonly<{dateStart: string | null; dateEnd: string | null; description: string}>;

export type HotelbedsCatalogHotel = Readonly<{
  code: string;
  name: string;
  destinationCode: string | null;
  destinationName: string | null;
  countryCode: string | null;
  zoneName: string | null;
  address: string | null;
  postalCode: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  description: string | null;
}>;

export async function searchHotelbedsContentHotels(query: string, limit = 8): Promise<HotelbedsCatalogHotel[]> {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) return [];
  const rows = await database().hotelbedsContentHotel.findMany({
    where: {
      OR: [
        {name: {contains: normalized, mode: "insensitive"}},
        {destinationName: {contains: normalized, mode: "insensitive"}},
        {zoneName: {contains: normalized, mode: "insensitive"}},
      ],
    },
    orderBy: [{name: "asc"}],
    take: Math.max(1, Math.min(limit, 20)),
  });
  return rows.map(catalogView);
}

export async function getHotelbedsContentHotel(code: string): Promise<HotelbedsCatalogHotel | null> {
  if (!/^\d+$/.test(code.trim())) return null;
  const row = await database().hotelbedsContentHotel.findUnique({where: {code: code.trim()}});
  return row ? catalogView(row) : null;
}

export async function getCachedHotelbedsRateComments(rateCommentsId: string, checkIn: string): Promise<string | null> {
  const id = rateCommentsId.trim();
  if (!/^\d+\|\d+\|\d+$/.test(id)) return null;
  const row = await database().hotelbedsRateCommentCache.findUnique({where: {id}});
  if (!row) return null;
  const comments = cachedComments(row.comments).filter((item) => {
    if (item.dateStart && checkIn < item.dateStart) return false;
    if (item.dateEnd && checkIn > item.dateEnd) return false;
    return true;
  });
  const text = [...new Set(comments.map((item) => item.description.trim()).filter(Boolean))].join("\n");
  if (!text) return null;
  const hotel = row.hotelCode ? await database().hotelbedsContentHotel.findUnique({where: {code: row.hotelCode}}) : null;
  return appendVoucherStaticContent(text, hotel?.issues, hotel?.facilities, checkIn);
}

export async function syncHotelbedsContentCatalog(options: Readonly<{destinationCodes?: readonly string[]; language?: string; lastUpdateTime?: string}> = {}) {
  const configured = process.env.HOTELBEDS_CONTENT_DESTINATIONS?.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
  const destinationCodes = options.destinationCodes ?? (configured?.length ? configured : DEFAULT_DESTINATIONS);
  const language = (options.language ?? process.env.HOTELBEDS_CONTENT_LANGUAGE ?? "ENG").trim().toUpperCase();
  const startedAt = new Date();
  let requests = 0;
  let upserted = 0;

  for (const destinationCode of destinationCodes) {
    let from = 1;
    while (true) {
      const url = contentUrl("/hotels", {
        fields: "all",
        language,
        from: String(from),
        to: String(from + PAGE_SIZE - 1),
        useSecondaryLanguage: "true",
        destinationCode,
        ...(options.lastUpdateTime ? {lastUpdateTime: options.lastUpdateTime} : {}),
      });
      const payload = await hotelbedsContentRequest(url);
      requests += 1;
      const hotels = contentHotels(payload);
      if (!hotels.length) break;
      for (const raw of hotels) {
        const normalized = normalizeContentHotel(raw, destinationCode);
        if (!normalized) continue;
        // Prisma's generated JSON input types distinguish SQL NULL from JSON
        // values. normalizeContentHotel produces JSON-safe runtime values, so
        // the cast is intentionally kept at this database boundary only.
        await database().hotelbedsContentHotel.upsert({
          where: {code: normalized.code},
          create: normalized as never,
          update: {...normalized, syncedAt: new Date()} as never,
        });
        upserted += 1;
      }
      if (hotels.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return {ok: true, scope: destinationCodes, requests, upserted, startedAt, finishedAt: new Date()};
}

export async function syncHotelbedsRateCommentCatalog(options: Readonly<{language?: string; lastUpdateTime?: string; maxPages?: number}> = {}) {
  const language = (options.language ?? process.env.HOTELBEDS_CONTENT_LANGUAGE ?? "ENG").trim().toUpperCase();
  const maxPages = Math.max(1, Math.min(options.maxPages ?? Number(process.env.HOTELBEDS_RATE_COMMENT_MAX_PAGES ?? 10), 200));
  let requests = 0;
  let upserted = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const from = page * PAGE_SIZE + 1;
    const url = contentUrl("/types/ratecomments", {
      fields: "all",
      language,
      from: String(from),
      to: String(from + PAGE_SIZE - 1),
      useSecondaryLanguage: "true",
      ...(options.lastUpdateTime ? {lastUpdateTime: options.lastUpdateTime} : {}),
    });
    const payload = await hotelbedsContentRequest(url);
    requests += 1;
    const rateComments = findArray(payload, ["rateComments", "ratecomments"]);
    if (!rateComments.length) break;
    for (const item of rateComments) {
      const incoming = stringValue(item.incoming);
      const code = stringValue(item.code);
      const hotelCode = stringValue(item.hotel);
      if (!incoming || !code) continue;
      const groups = findArray(item.commentsByRates, ["commentByRates", "commentsByRates"]);
      for (const group of groups) {
        const rateCodes = stringValue(group.rateCodes);
        if (!rateCodes) continue;
        const comments = findArray(group.comments, ["comments"]).flatMap((comment) => {
          const description = contentText(comment.description);
          return description ? [{dateStart: dateOnly(comment.dateStart), dateEnd: dateOnly(comment.dateEnd), description}] : [];
        });
        if (!comments.length) continue;
        const id = `${incoming}|${code}|${rateCodes.replace(/\s+/g, "")}`;
        await database().hotelbedsRateCommentCache.upsert({
          where: {id},
          create: {id, incoming, code, rateCodes: rateCodes.replace(/\s+/g, ""), hotelCode, comments},
          update: {incoming, code, rateCodes: rateCodes.replace(/\s+/g, ""), hotelCode, comments, syncedAt: new Date()},
        });
        upserted += 1;
      }
    }
    if (rateComments.length < PAGE_SIZE) break;
  }
  return {ok: true, requests, upserted};
}

function normalizeContentHotel(raw: JsonRecord, fallbackDestination: string) {
  const code = stringValue(raw.code);
  const name = contentText(raw.name) ?? stringValue(raw.name);
  if (!code || !name) return null;
  const coordinates = record(raw.coordinates);
  const destination = record(raw.destination);
  const country = record(raw.country);
  const category = record(raw.category);
  const zone = record(raw.zone);
  const phones = findArray(raw.phones, ["phones", "phone"]);
  const phone = phones.map((item) => stringValue(item.phoneNumber) ?? stringValue(item.number) ?? stringValue(item.phone)).find(Boolean) ?? stringValue(raw.phone);
  const providerUpdatedAt = dateValue(raw.lastUpdate ?? raw.lastUpdateTime ?? raw.updatedAt);
  return {
    code,
    name,
    destinationCode: stringValue(destination.code) ?? stringValue(raw.destinationCode) ?? fallbackDestination,
    destinationName: contentText(destination.name) ?? contentText(raw.destinationName) ?? stringValue(raw.destinationName),
    countryCode: stringValue(country.isoCode) ?? stringValue(country.code) ?? stringValue(raw.countryCode),
    zoneName: contentText(zone.name) ?? stringValue(raw.zoneName),
    address: contentText(raw.address) ?? stringValue(raw.address),
    postalCode: stringValue(raw.postalCode),
    categoryCode: stringValue(category.code) ?? stringValue(raw.categoryCode),
    categoryName: contentText(category.description) ?? contentText(raw.categoryName) ?? stringValue(raw.categoryName),
    latitude: numberValue(coordinates.latitude ?? raw.latitude),
    longitude: numberValue(coordinates.longitude ?? raw.longitude),
    phone: phone ?? null,
    description: contentText(raw.description),
    facilities: jsonSafe(raw.facilities),
    images: jsonSafe(raw.images),
    issues: jsonSafe(raw.issues),
    raw: jsonSafe(raw),
    providerUpdatedAt,
    syncedAt: new Date(),
  };
}

function appendVoucherStaticContent(base: string, issuesValue: unknown, facilitiesValue: unknown, checkIn: string): string {
  const extra: string[] = [];
  for (const issue of findArray(issuesValue, ["issues", "issue"])) {
    const from = dateOnly(issue.dateFrom);
    const to = dateOnly(issue.dateTo);
    if (from && checkIn < from) continue;
    if (to && checkIn > to) continue;
    const description = contentText(issue.description);
    if (description) extra.push(description);
  }
  for (const facility of findArray(facilitiesValue, ["facilities", "facility"])) {
    if (!truthy(facility.voucher)) continue;
    const description = contentText(facility.description);
    if (!description) continue;
    const number = stringValue(facility.number);
    extra.push(number ? `${description}: ${number}` : description);
  }
  return [...new Set([base, ...extra].map((value) => value.trim()).filter(Boolean))].join("\n");
}

async function hotelbedsContentRequest(url: URL): Promise<unknown> {
  const apiKey = process.env.HOTELBEDS_API_KEY?.trim();
  const secret = process.env.HOTELBEDS_SECRET?.trim();
  if (!apiKey || !secret) throw new Error("Hotelbeds API credentials are not configured");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha256").update(apiKey + secret + timestamp).digest("hex");
  const response = await fetch(url, {
    headers: {accept: "application/json", "accept-encoding": "gzip", "api-key": apiKey, "x-signature": signature},
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const raw = await response.text();
  if (!response.ok) {
    console.error("Hotelbeds Content API request failed", {path: url.pathname, status: response.status, body: raw.slice(0, 300)});
    throw new Error(`Hotelbeds Content API request failed (${response.status})`);
  }
  return JSON.parse(raw) as unknown;
}

function contentUrl(path: string, query: Record<string, string>): URL {
  const url = new URL(`${contentBase()}${path}`);
  for (const [key, value] of Object.entries(query)) if (value) url.searchParams.set(key, value);
  return url;
}

function contentBase(): string {
  const environment = (process.env.HOTELBEDS_ENV ?? "test").trim().toLowerCase();
  if (environment === "live") return LIVE_CONTENT_BASE;
  if (environment === "test") return TEST_CONTENT_BASE;
  throw new Error("HOTELBEDS_ENV must be either 'test' or 'live'");
}

function contentHotels(payload: unknown): JsonRecord[] {
  const root = record(payload);
  if (Array.isArray(root.hotels)) return root.hotels.map(record);
  const hotels = record(root.hotels);
  if (Array.isArray(hotels.hotels)) return hotels.hotels.map(record);
  return findArray(payload, ["hotels", "hotel"]);
}

function catalogView(row: {code:string;name:string;destinationCode:string|null;destinationName:string|null;countryCode:string|null;zoneName:string|null;address:string|null;postalCode:string|null;categoryCode:string|null;categoryName:string|null;latitude:unknown;longitude:unknown;phone:string|null;description:string|null}): HotelbedsCatalogHotel {
  return {
    code: row.code,
    name: row.name,
    destinationCode: row.destinationCode,
    destinationName: row.destinationName,
    countryCode: row.countryCode,
    zoneName: row.zoneName,
    address: row.address,
    postalCode: row.postalCode,
    categoryCode: row.categoryCode,
    categoryName: row.categoryName,
    latitude: numberValue(row.latitude),
    longitude: numberValue(row.longitude),
    phone: row.phone,
    description: row.description,
  };
}

function cachedComments(value: unknown): CachedComment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    const description = stringValue(source.description);
    return description ? [{dateStart: dateOnly(source.dateStart), dateEnd: dateOnly(source.dateEnd), description}] : [];
  });
}

function findArray(value: unknown, keys: readonly string[]): JsonRecord[] {
  if (Array.isArray(value)) return value.map(record);
  const source = record(value);
  for (const key of keys) {
    const direct = source[key];
    if (Array.isArray(direct)) return direct.map(record);
    const nested = record(direct);
    for (const nestedValue of Object.values(nested)) if (Array.isArray(nestedValue)) return nestedValue.map(record);
  }
  for (const child of Object.values(source)) {
    const result = findArray(child, keys);
    if (result.length) return result;
  }
  return [];
}

function contentText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  const source = record(value);
  return stringValue(source.content) ?? stringValue(source.description) ?? stringValue(source.name);
}
function dateOnly(value: unknown): string | null { const text = stringValue(value); return text && /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null; }
function dateValue(value: unknown): Date | null { const text = stringValue(value); if (!text) return null; const date = new Date(text); return Number.isNaN(date.getTime()) ? null : date; }
function truthy(value: unknown): boolean { return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1"; }
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function stringValue(value: unknown): string | null { if (value === null || value === undefined) return null; const text = String(value).trim(); return text || null; }
function numberValue(value: unknown): number | null { const number = Number(value); return Number.isFinite(number) ? number : null; }
function jsonSafe(value: unknown): object | unknown[] | null { if (value === null || value === undefined) return null; return JSON.parse(JSON.stringify(value)) as object | unknown[]; }
