import { randomUUID } from "node:crypto";
import { database, type Prisma } from "@platform/database";

export type OutboxPublisher = (event: Readonly<{
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  schemaVersion: number;
  payload: unknown;
  createdAt: Date;
}>) => Promise<void>;

export type OutboxWriteClient = Pick<ReturnType<typeof database>, "platformOutboxEvent">;

export async function enqueueOutboxEvent(
  client: OutboxWriteClient,
  input: Readonly<{
    topic: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    schemaVersion?: number;
    payload: Prisma.InputJsonValue;
    deduplicationKey: string;
    availableAt?: Date;
  }>,
): Promise<{id: string; reused: boolean}> {
  const existing = await client.platformOutboxEvent.findUnique({where: {deduplicationKey: input.deduplicationKey}, select: {id: true}});
  if (existing) return {id: existing.id, reused: true};
  try {
    const row = await client.platformOutboxEvent.create({data: {
      topic: input.topic,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      schemaVersion: input.schemaVersion ?? 1,
      payload: input.payload,
      deduplicationKey: input.deduplicationKey,
      availableAt: input.availableAt ?? new Date(),
    }, select: {id: true}});
    return {id: row.id, reused: false};
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const raced = await client.platformOutboxEvent.findUnique({where: {deduplicationKey: input.deduplicationKey}, select: {id: true}});
    if (!raced) throw error;
    return {id: raced.id, reused: true};
  }
}

export async function processOutboxBatch(
  publishers: Readonly<Record<string, OutboxPublisher>>,
  options: Readonly<{batchSize?: number; workerId?: string; maxAttempts?: number}> = {},
): Promise<{claimed: number; published: number; failed: number; dead: number}> {
  const db = database();
  const batchSize = bounded(options.batchSize ?? 100, 1, 500);
  const workerId = options.workerId?.trim() || `outbox-${process.pid}-${randomUUID().slice(0, 8)}`;
  const maxAttempts = bounded(options.maxAttempts ?? 12, 1, 50);
  const now = new Date();
  const candidates = await db.platformOutboxEvent.findMany({
    where: {
      status: {in: ["PENDING", "FAILED"]},
      availableAt: {lte: now},
      OR: [{lockedAt: null}, {lockedAt: {lt: new Date(now.getTime() - 5 * 60_000)}}],
    },
    orderBy: [{availableAt: "asc"}, {createdAt: "asc"}],
    take: batchSize * 2,
  });

  let claimed = 0;
  let published = 0;
  let failed = 0;
  let dead = 0;

  for (const candidate of candidates) {
    if (claimed >= batchSize) break;
    const claim = await db.platformOutboxEvent.updateMany({
      where: {
        id: candidate.id,
        status: {in: ["PENDING", "FAILED"]},
        availableAt: {lte: now},
        OR: [{lockedAt: null}, {lockedAt: {lt: new Date(now.getTime() - 5 * 60_000)}}],
      },
      data: {status: "PROCESSING", lockedAt: new Date(), lockedBy: workerId},
    });
    if (claim.count !== 1) continue;
    claimed += 1;

    const publisher = publishers[candidate.topic];
    if (!publisher) {
      const attempts = candidate.attempts + 1;
      const terminal = attempts >= maxAttempts;
      await db.platformOutboxEvent.updateMany({
        where: {id: candidate.id, status: "PROCESSING", lockedBy: workerId},
        data: {
          status: terminal ? "DEAD" : "FAILED",
          attempts,
          availableAt: retryAt(attempts),
          lockedAt: null,
          lockedBy: null,
          lastError: `No publisher registered for topic ${candidate.topic}`,
        },
      });
      terminal ? dead += 1 : failed += 1;
      continue;
    }

    try {
      await publisher({
        id: candidate.id,
        topic: candidate.topic,
        aggregateType: candidate.aggregateType,
        aggregateId: candidate.aggregateId,
        eventType: candidate.eventType,
        schemaVersion: candidate.schemaVersion,
        payload: candidate.payload,
        createdAt: candidate.createdAt,
      });
      await db.platformOutboxEvent.updateMany({
        where: {id: candidate.id, status: "PROCESSING", lockedBy: workerId},
        data: {status: "PUBLISHED", attempts: {increment: 1}, publishedAt: new Date(), lockedAt: null, lockedBy: null, lastError: null},
      });
      published += 1;
    } catch (error) {
      const attempts = candidate.attempts + 1;
      const terminal = attempts >= maxAttempts;
      await db.platformOutboxEvent.updateMany({
        where: {id: candidate.id, status: "PROCESSING", lockedBy: workerId},
        data: {
          status: terminal ? "DEAD" : "FAILED",
          attempts,
          availableAt: retryAt(attempts),
          lockedAt: null,
          lockedBy: null,
          lastError: error instanceof Error ? error.message.slice(0, 4000) : "Unknown outbox publisher error",
        },
      });
      terminal ? dead += 1 : failed += 1;
    }
  }

  return {claimed, published, failed, dead};
}

export async function requeueDeadOutboxEvent(id: string): Promise<boolean> {
  const result = await database().platformOutboxEvent.updateMany({
    where: {id, status: "DEAD"},
    data: {status: "PENDING", attempts: 0, availableAt: new Date(), lockedAt: null, lockedBy: null, lastError: null},
  });
  return result.count === 1;
}

function retryAt(attempt: number): Date {
  const delayMs = Math.min(60 * 60_000, 1_000 * 2 ** Math.min(12, Math.max(0, attempt - 1)));
  const jitter = Math.round(delayMs * 0.2 * Math.random());
  return new Date(Date.now() + delayMs + jitter);
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === "P2002";
}

function bounded(value: number, min: number, max: number): number {
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : min;
}
