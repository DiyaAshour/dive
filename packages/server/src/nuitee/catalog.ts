import {createHash} from "node:crypto";
import {database} from "@platform/database";
import {hotelView, searchViews} from "./views";
import {number, occupancy, record, records, text} from "./normalize";
import type {NuiteeHotelDetails, NuiteeSearchInput, NuiteeSearchResult} from "./types";
import {isNuiteeSandbox, NUITEE_PAYMENT_CURRENCY} from "./client";

const API_BASE = "https://api.liteapi.travel/v3.0";
const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_SYNC_PAGE_SIZE = 250;
const DEFAULT_SYNC_CONCURRENCY = 6;
const DEFAULT_LAZY_FILL_LIMIT = 8;

type RawRecord = Record<string, unknown>;

type SyncOptions = Readonly<{
  countryCode?: string;
  pageSize?: number;
  concurrency?: number;
  maxHotels?: number;
}>;

export type NuiteeContentSyncResult = Readonly<{
  countryCode: string;
  discovered: number;
  synced: number;
  unchanged: number;
  failed: number;
}>;

export async function getNuiteeHotelDetailsCatalog(code: string, input: NuiteeSearchInput): Promise<NuiteeHotelDetails | null> {
  const clean = code.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(clean)) return null;
  if (input.children > 0 && input.childrenAges?.length !== input.children) {
    throw new Error("Nuitee requires the age of each child");
  }

  const rateBody: RawRecord = {
    hotelIds: [clean],
    occupancies: [occupancy(input)],
    currency: (input.currency ?? NUITEE_PAYMENT_CURRENCY).trim().toUpperCase(),
    guestNationality: (input.guestNationality ?? input.countryCode ?? "JO").trim().toUpperCase(),
    checkin: input.arrival,
    checkout: input.departure,
    roomMapping: true,
    includeHotelData: false,
    ...(input.maxRatesPerHotel !== undefined
      ? {maxRatesPerHotel: Math.max(1, Math.min(200, input.maxRatesPerHotel))}
      : {}),
    timeout: 10,
    ...(input.freeCancellation ? {refundableRatesOnly: true} : {}),
    ...marginBody(),
  };

  const [content, rates] = await Promise.all([
    getStoredOrLiveNuiteeContent(clean),
    nuiteeRequest(`${API_BASE}/hotels/rates`, "POST", rateBody),
  ]);

  return hotelView(clean, content, rates, input, isNuiteeSandbox());
}

export async function searchNuiteeCatalog(input: NuiteeSearchInput): Promise<NuiteeSearchResult[]> {
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
    includeHotelData: false,
    maxRatesPerHotel: Math.max(1, Math.min(25, input.maxRatesPerHotel ?? 3)),
    limit: Math.max(1, Math.min(50, input.limit ?? 20)),
    timeout: 8,
    ...(input.stars?.length ? {starRating: input.stars} : {}),
    ...(input.freeCancellation ? {refundableRatesOnly: true} : {}),
    ...marginBody(),
  };

  const payload = await nuiteeRequest(`${API_BASE}/hotels/rates`, "POST", body);
  const root = record(payload);
  const hotelIds = [...new Set(records(root.data).flatMap((row) => {
    const id = text(row.hotelId);
    return id ? [id] : [];
  }))];
  const hotels = await loadCatalogContent(hotelIds, countryCode);
  return searchViews({...root, hotels}, input);
}

export async function syncNuiteeHotelContent(options: SyncOptions = {}): Promise<NuiteeContentSyncResult> {
  const countryCode = (options.countryCode ?? "JO").trim().toUpperCase();
  const pageSize = Math.max(1, Math.min(1000, options.pageSize ?? DEFAULT_SYNC_PAGE_SIZE));
  const concurrency = Math.max(1, Math.min(12, options.concurrency ?? DEFAULT_SYNC_CONCURRENCY));
  const maxHotels = Math.max(1, options.maxHotels ?? Number(process.env.NUITEE_CONTENT_SYNC_MAX_HOTELS ?? 10000));

  const ids: string[] = [];
  let offset = 0;
  while (ids.length < maxHotels) {
    const params = new URLSearchParams({countryCode, offset: String(offset), limit: String(pageSize)});
    const payload = await nuiteeRequest(`${API_BASE}/data/hotels?${params.toString()}`, "GET");
    const rows = records(record(payload).data);
    if (!rows.length) break;
    for (const row of rows) {
      const id = text(row.id) ?? text(row.hotelId);
      if (id && !ids.includes(id)) ids.push(id);
      if (ids.length >= maxHotels) break;
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  let synced = 0;
  let unchanged = 0;
  let failed = 0;

  await mapWithConcurrency(ids, concurrency, async (id) => {
    try {
      const payload = await fetchLiveNuiteeContent(id);
      const result = await persistNuiteeContent(id, payload, countryCode);
      if (result === "unchanged") unchanged += 1;
      else synced += 1;
    } catch (error) {
      failed += 1;
      console.error("Nuitee content sync failed", {hotelId: id, error});
    }
  });

  return {countryCode, discovered: ids.length, synced, unchanged, failed};
}

export async function getStoredNuiteeHotelContent(providerHotelId: string): Promise<unknown | null> {
  try {
    const row = await database().nuiteeContentHotel.findUnique({
      where: {providerHotelId},
      select: {raw: true},
    });
    return row ? {data: row.raw} : null;
  } catch (error) {
    console.warn("Nuitee content catalog read failed; falling back to provider", {providerHotelId, error});
    return null;
  }
}

async function getStoredOrLiveNuiteeContent(providerHotelId: string): Promise<unknown> {
  const stored = await getStoredNuiteeHotelContent(providerHotelId);
  if (stored) return stored;
  const live = await fetchLiveNuiteeContent(providerHotelId);
  try {
    await persistNuiteeContent(providerHotelId, live);
  } catch (error) {
    console.warn("Nuitee content catalog write failed; continuing with live content", {providerHotelId, error});
  }
  return live;
}

async function loadCatalogContent(providerHotelIds: readonly string[], fallbackCountryCode: string): Promise<RawRecord[]> {
  if (!providerHotelIds.length) return [];
  const byId = new Map<string, RawRecord>();
  try {
    const rows = await database().nuiteeContentHotel.findMany({
      where: {providerHotelId: {in: [...providerHotelIds]}},
      select: {providerHotelId: true, raw: true},
    });
    for (const row of rows) byId.set(row.providerHotelId, record(row.raw));
  } catch (error) {
    console.warn("Nuitee catalog batch read failed", error);
  }

  const lazyFillLimit = Math.max(0, Number(process.env.NUITEE_CONTENT_LAZY_FILL_LIMIT ?? DEFAULT_LAZY_FILL_LIMIT));
  const missing = providerHotelIds.filter((id) => !byId.has(id)).slice(0, lazyFillLimit);
  await mapWithConcurrency(missing, Math.min(4, DEFAULT_SYNC_CONCURRENCY), async (id) => {
    try {
      const payload = await fetchLiveNuiteeContent(id);
      const content = record(record(payload).data);
      byId.set(id, content);
      await persistNuiteeContent(id, payload, fallbackCountryCode);
    } catch (error) {
      console.warn("Nuitee lazy content fill failed", {hotelId: id, error});
    }
  });

  return providerHotelIds.flatMap((id) => {
    const content = byId.get(id);
    return content ? [content] : [];
  });
}

async function fetchLiveNuiteeContent(providerHotelId: string): Promise<unknown> {
  return nuiteeRequest(`${API_BASE}/data/hotel?hotelId=${encodeURIComponent(providerHotelId)}`, "GET");
}

async function persistNuiteeContent(providerHotelId: string, payload: unknown, fallbackCountryCode?: string): Promise<"synced" | "unchanged"> {
  const content = record(record(payload).data);
  const serialized = JSON.stringify(content);
  const contentHash = createHash("sha256").update(serialized).digest("hex");
  const existing = await database().nuiteeContentHotel.findUnique({
    where: {providerHotelId},
    select: {contentHash: true},
  });
  if (existing?.contentHash === contentHash) {
    await database().nuiteeContentHotel.update({
      where: {providerHotelId},
      data: {syncedAt: new Date()},
    });
    return "unchanged";
  }

  const name = text(content.name) ?? text(content.hotelName) ?? `Nuitee hotel ${providerHotelId}`;
  const countryCode = (text(content.countryCode) ?? text(content.country) ?? fallbackCountryCode ?? "").trim().toUpperCase() || null;
  const starRating = number(content.starRating) ?? number(content.stars);
  const raw = JSON.parse(serialized);

  await database().nuiteeContentHotel.upsert({
    where: {providerHotelId},
    create: {
      providerHotelId,
      name,
      countryCode,
      city: text(content.city) ?? text(content.cityName),
      area: text(content.area) ?? text(content.neighborhood),
      address: text(content.address),
      starRating,
      contentHash,
      raw,
      syncedAt: new Date(),
    },
    update: {
      name,
      countryCode,
      city: text(content.city) ?? text(content.cityName),
      area: text(content.area) ?? text(content.neighborhood),
      address: text(content.address),
      starRating,
      contentHash,
      raw,
      syncedAt: new Date(),
    },
  });
  return "synced";
}

async function nuiteeRequest(url: string, method: "GET" | "POST", body?: RawRecord): Promise<unknown> {
  const apiKey = process.env.NUITEE_API_KEY?.trim();
  if (!apiKey) throw new Error("Nuitee Connect API key is not configured");
  const response = await fetch(url, {
    method,
    headers: {accept: "application/json", "X-API-Key": apiKey, ...(body ? {"content-type": "application/json"} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Nuitee request failed (${response.status}): ${raw.slice(0, 500)}`);
  if (!raw) return {data: []};
  try { return JSON.parse(raw) as unknown; }
  catch { throw new Error("Nuitee returned an invalid JSON response"); }
}

function marginBody(): RawRecord {
  const raw = process.env.NUITEE_MARGIN_PERCENT?.trim();
  if (!raw) return {};
  const margin = Number(raw);
  return Number.isFinite(margin) ? {margin} : {};
}

async function mapWithConcurrency<T>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]!);
    }
  }));
}
