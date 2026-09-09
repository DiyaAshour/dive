import {createHash} from "node:crypto";
import {database} from "@platform/database";

const API_BASE = "https://api.liteapi.travel/v3.0";
const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_BATCH_SIZE = 300;
const DEFAULT_CONCURRENCY = 8;

type RawRecord = Record<string, unknown>;

export type NuiteeScheduledSyncResult = Readonly<{
  countryCode: string;
  offset: number;
  nextOffset: number;
  cycle: number;
  discovered: number;
  synced: number;
  unchanged: number;
  failed: number;
  completedCycle: boolean;
}>;

export async function runScheduledNuiteeContentSync(input: Readonly<{
  countryCode?: string;
  batchSize?: number;
  concurrency?: number;
}> = {}): Promise<NuiteeScheduledSyncResult> {
  const countryCode = cleanCountryCode(input.countryCode ?? process.env.NUITEE_CONTENT_SYNC_COUNTRY ?? "JO");
  const batchSize = clampInteger(input.batchSize ?? Number(process.env.NUITEE_CONTENT_CRON_BATCH_SIZE ?? DEFAULT_BATCH_SIZE), 1, 500);
  const concurrency = clampInteger(input.concurrency ?? Number(process.env.NUITEE_CONTENT_CRON_CONCURRENCY ?? DEFAULT_CONCURRENCY), 1, 10);
  const stateId = `country:${countryCode}`;

  const state = await database().nuiteeContentSyncState.upsert({
    where: {id: stateId},
    create: {id: stateId, countryCode},
    update: {countryCode},
    select: {nextOffset: true, cycle: true},
  });

  const offset = Math.max(0, state.nextOffset);

  try {
    const rows = await listHotels(countryCode, offset, batchSize);
    const ids = [...new Set(rows.map((row) => stringValue(row.id) ?? stringValue(row.hotelId)).filter((id): id is string => Boolean(id)))];

    let synced = 0;
    let unchanged = 0;
    let failed = 0;

    await mapWithConcurrency(ids, concurrency, async (providerHotelId) => {
      try {
        const payload = await request(`${API_BASE}/data/hotel?hotelId=${encodeURIComponent(providerHotelId)}`);
        const result = await persistHotel(providerHotelId, payload, countryCode);
        if (result === "unchanged") unchanged += 1;
        else synced += 1;
      } catch (error) {
        failed += 1;
        console.error("Scheduled Nuitee content sync hotel failed", {providerHotelId, error});
      }
    });

    const completedCycle = rows.length < batchSize;
    const nextOffset = completedCycle ? 0 : offset + rows.length;
    const nextCycle = completedCycle ? state.cycle + 1 : state.cycle;

    await database().nuiteeContentSyncState.update({
      where: {id: stateId},
      data: {
        nextOffset,
        cycle: nextCycle,
        ...(completedCycle ? {lastCompletedAt: new Date()} : {}),
        lastError: null,
      },
    });

    return {
      countryCode,
      offset,
      nextOffset,
      cycle: nextCycle,
      discovered: ids.length,
      synced,
      unchanged,
      failed,
      completedCycle,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await database().nuiteeContentSyncState.update({
      where: {id: stateId},
      data: {lastError: message.slice(0, 4000)},
    });
    throw error;
  }
}

async function listHotels(countryCode: string, offset: number, limit: number): Promise<RawRecord[]> {
  const params = new URLSearchParams({countryCode, offset: String(offset), limit: String(limit)});
  const payload = await request(`${API_BASE}/data/hotels?${params.toString()}`);
  return arrayRecords(record(payload).data);
}

async function persistHotel(providerHotelId: string, payload: unknown, fallbackCountryCode: string): Promise<"synced" | "unchanged"> {
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

  const countryCode = cleanCountryCodeOrNull(stringValue(content.countryCode) ?? stringValue(content.country) ?? fallbackCountryCode);
  const name = stringValue(content.name) ?? stringValue(content.hotelName) ?? `Nuitee hotel ${providerHotelId}`;
  const raw = JSON.parse(serialized);

  await database().nuiteeContentHotel.upsert({
    where: {providerHotelId},
    create: {
      providerHotelId,
      name,
      countryCode,
      city: stringValue(content.city) ?? stringValue(content.cityName),
      area: stringValue(content.area) ?? stringValue(content.neighborhood),
      address: stringValue(content.address),
      starRating: numberValue(content.starRating) ?? numberValue(content.stars),
      contentHash,
      raw,
      syncedAt: new Date(),
    },
    update: {
      name,
      countryCode,
      city: stringValue(content.city) ?? stringValue(content.cityName),
      area: stringValue(content.area) ?? stringValue(content.neighborhood),
      address: stringValue(content.address),
      starRating: numberValue(content.starRating) ?? numberValue(content.stars),
      contentHash,
      raw,
      syncedAt: new Date(),
    },
  });

  return "synced";
}

async function request(url: string): Promise<unknown> {
  const apiKey = process.env.NUITEE_API_KEY?.trim();
  if (!apiKey) throw new Error("Nuitee Connect API key is not configured");

  const response = await fetch(url, {
    method: "GET",
    headers: {accept: "application/json", "X-API-Key": apiKey},
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Nuitee request failed (${response.status}): ${raw.slice(0, 500)}`);
  if (!raw) return {data: []};
  try { return JSON.parse(raw) as unknown; }
  catch { throw new Error("Nuitee returned an invalid JSON response"); }
}

function cleanCountryCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error(`Invalid Nuitee country code: ${value}`);
  return code;
}

function cleanCountryCodeOrNull(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function record(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RawRecord : {};
}

function arrayRecords(value: unknown): RawRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
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
