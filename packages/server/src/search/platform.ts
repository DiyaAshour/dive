import { randomUUID } from "node:crypto";
import { database, type Prisma } from "@platform/database";

export type SearchCandidate = Readonly<{
  id: string;
  score: number;
  name: string;
  city: string;
  countryCode: string;
}>;

export type SearchDocument = Readonly<{
  id: string;
  slug: string;
  name: string;
  city: string;
  area: string | null;
  countryCode: string;
  starRating: number | null;
  latitude: number | null;
  longitude: number | null;
  amenities: readonly string[];
  active: boolean;
  revision: number;
}>;

export interface SearchIndexProvider {
  readonly name: string;
  search(query: string, limit: number): Promise<readonly SearchCandidate[]>;
  upsert(document: SearchDocument): Promise<void>;
  remove(id: string): Promise<void>;
  health(): Promise<{ready: boolean; detail?: string}>;
}

let provider: SearchIndexProvider | null = null;

export function registerSearchIndexProvider(value: SearchIndexProvider): void {
  provider = value;
}

export function searchIndexProvider(): SearchIndexProvider {
  return provider ?? postgresSearchProvider;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchCandidates(query: string, limit = 30): Promise<readonly SearchCandidate[]> {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return searchIndexProvider().search(normalized, clamp(limit, 1, 100));
}

export async function queueHotelSearchIndex(hotelId: string, revision: number, operation: "UPSERT" | "DELETE" = "UPSERT"): Promise<void> {
  await database().searchIndexTask.upsert({
    where: {entityType_entityId_revision: {entityType: "HOTEL", entityId: hotelId, revision}},
    create: {entityType: "HOTEL", entityId: hotelId, revision, operation, payload: {}},
    update: {operation, status: "PENDING", attempts: 0, availableAt: new Date(), lockedAt: null, lockedBy: null, leaseExpiresAt: null, completedAt: null, lastError: null},
  });
}

export async function queueFullHotelReindex(batchSize = 500): Promise<number> {
  const db = database();
  const hotels = await db.hotel.findMany({select: {id: true, publishRevision: true, status: true, verified: true}, take: clamp(batchSize, 1, 5000), orderBy: {updatedAt: "asc"}});
  for (const hotel of hotels) {
    await queueHotelSearchIndex(hotel.id, hotel.publishRevision, hotel.status === "ACTIVE" && hotel.verified ? "UPSERT" : "DELETE");
  }
  return hotels.length;
}

export async function processSearchIndexBatch(options: Readonly<{batchSize?: number; workerId?: string; leaseMs?: number}> = {}) {
  const db = database();
  const batchSize = clamp(options.batchSize ?? 50, 1, 200);
  const leaseMs = clamp(options.leaseMs ?? 60_000, 5_000, 10 * 60_000);
  const workerId = options.workerId?.trim() || `search-${process.pid}-${randomUUID().slice(0, 8)}`;
  const now = new Date();

  await db.searchIndexTask.updateMany({
    where: {status: "PROCESSING", leaseExpiresAt: {lt: now}},
    data: {status: "FAILED", lockedAt: null, lockedBy: null, leaseExpiresAt: null, availableAt: now, lastError: "Search indexing worker lease expired"},
  });

  const candidates = await db.searchIndexTask.findMany({
    where: {status: {in: ["PENDING", "FAILED"]}, availableAt: {lte: now}},
    orderBy: [{availableAt: "asc"}, {createdAt: "asc"}],
    take: batchSize * 2,
  });

  let claimed = 0;
  let completed = 0;
  let failed = 0;
  let dead = 0;

  for (const task of candidates) {
    if (claimed >= batchSize) break;
    const claim = await db.searchIndexTask.updateMany({
      where: {id: task.id, status: {in: ["PENDING", "FAILED"]}, availableAt: {lte: new Date()}},
      data: {status: "PROCESSING", lockedAt: new Date(), lockedBy: workerId, leaseExpiresAt: new Date(Date.now() + leaseMs)},
    });
    if (claim.count !== 1) continue;
    claimed += 1;
    try {
      if (task.operation === "DELETE") await searchIndexProvider().remove(task.entityId);
      else await searchIndexProvider().upsert(await hotelSearchDocument(task.entityId, task.revision));
      await db.searchIndexTask.updateMany({
        where: {id: task.id, status: "PROCESSING", lockedBy: workerId},
        data: {status: "COMPLETED", attempts: {increment: 1}, completedAt: new Date(), lockedAt: null, lockedBy: null, leaseExpiresAt: null, lastError: null},
      });
      completed += 1;
    } catch (error) {
      const attempts = task.attempts + 1;
      const terminal = attempts >= task.maxAttempts;
      await db.searchIndexTask.updateMany({
        where: {id: task.id, status: "PROCESSING", lockedBy: workerId},
        data: {
          status: terminal ? "DEAD" : "FAILED",
          attempts,
          availableAt: terminal ? new Date() : retryAt(attempts),
          lockedAt: null,
          lockedBy: null,
          leaseExpiresAt: null,
          lastError: error instanceof Error ? error.message.slice(0, 4000) : "Unknown search indexing error",
        },
      });
      terminal ? dead += 1 : failed += 1;
    }
  }

  return {claimed, completed, failed, dead, provider: searchIndexProvider().name};
}

export async function searchPlatformHealth() {
  const db = database();
  const [providerHealth, pending, failed, dead, oldest] = await Promise.all([
    searchIndexProvider().health(),
    db.searchIndexTask.count({where: {status: "PENDING"}}),
    db.searchIndexTask.count({where: {status: "FAILED"}}),
    db.searchIndexTask.count({where: {status: "DEAD"}}),
    db.searchIndexTask.findFirst({where: {status: {in: ["PENDING", "FAILED"]}}, orderBy: {createdAt: "asc"}, select: {createdAt: true}}),
  ]);
  return {
    provider: searchIndexProvider().name,
    providerReady: providerHealth.ready,
    detail: providerHealth.detail ?? null,
    pending,
    failed,
    dead,
    oldestPendingAgeSeconds: oldest ? Math.max(0, Math.round((Date.now() - oldest.createdAt.getTime()) / 1000)) : null,
  };
}

async function hotelSearchDocument(hotelId: string, revision: number): Promise<SearchDocument> {
  const hotel = await database().hotel.findUnique({
    where: {id: hotelId},
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      area: true,
      countryCode: true,
      starRating: true,
      latitude: true,
      longitude: true,
      status: true,
      verified: true,
      amenities: {select: {code: true}},
    },
  });
  if (!hotel) throw new Error(`Hotel ${hotelId} no longer exists`);
  return {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    city: hotel.city,
    area: hotel.area,
    countryCode: hotel.countryCode,
    starRating: hotel.starRating,
    latitude: hotel.latitude === null ? null : Number(hotel.latitude),
    longitude: hotel.longitude === null ? null : Number(hotel.longitude),
    amenities: hotel.amenities.map((item) => item.code),
    active: hotel.status === "ACTIVE" && hotel.verified,
    revision,
  };
}

const postgresSearchProvider: SearchIndexProvider = {
  name: "postgres-live",
  async search(query, limit) {
    const db = database();
    const normalized = normalizeSearchText(query);
    const tokens = normalized.split(" ").filter(Boolean).slice(0, 8);
    if (!tokens.length) return [];
    const hotels = await db.hotel.findMany({
      where: {
        status: "ACTIVE",
        verified: true,
        AND: tokens.map((token) => ({OR: [
          {name: {contains: token, mode: "insensitive"}},
          {city: {contains: token, mode: "insensitive"}},
          {area: {contains: token, mode: "insensitive"}},
          {address: {contains: token, mode: "insensitive"}},
        ]})),
      },
      select: {id: true, name: true, city: true, countryCode: true},
      take: limit,
    });
    return hotels.map((hotel, index) => ({...hotel, score: Math.max(0, 1 - index / Math.max(1, hotels.length))}));
  },
  async upsert() {
    // PostgreSQL-backed live search reads the source tables directly. No secondary index write is required.
  },
  async remove() {
    // PostgreSQL-backed live search reads publication state directly. No secondary index delete is required.
  },
  async health() {
    try {
      await database().$queryRaw`SELECT 1`;
      return {ready: true};
    } catch (error) {
      return {ready: false, detail: error instanceof Error ? error.message.slice(0, 200) : "database unavailable"};
    }
  },
};

function retryAt(attempt: number): Date {
  const delayMs = Math.min(30 * 60_000, 1_000 * 2 ** Math.min(10, Math.max(0, attempt - 1)));
  return new Date(Date.now() + delayMs + Math.round(Math.random() * delayMs * 0.25));
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : min;
}
