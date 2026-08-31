import { randomUUID } from "node:crypto";
import { database, type Prisma } from "@platform/database";

export type DurableJobHandler = (job: Readonly<{id: string; type: string; payload: unknown; attempts: number}>) => Promise<void>;
export type DurableJobWriteClient = Pick<ReturnType<typeof database>, "platformDurableJob">;

export async function enqueueDurableJob(
  client: DurableJobWriteClient,
  input: Readonly<{
    queue: string;
    type: string;
    payload: Prisma.InputJsonValue;
    dedupeKey?: string | null;
    priority?: number;
    maxAttempts?: number;
    availableAt?: Date;
  }>,
): Promise<{id: string; reused: boolean}> {
  if (input.dedupeKey) {
    const existing = await client.platformDurableJob.findUnique({where: {dedupeKey: input.dedupeKey}, select: {id: true}});
    if (existing) return {id: existing.id, reused: true};
  }
  try {
    const row = await client.platformDurableJob.create({data: {
      queue: input.queue,
      type: input.type,
      payload: input.payload,
      dedupeKey: input.dedupeKey ?? null,
      priority: input.priority ?? 100,
      maxAttempts: clamp(input.maxAttempts ?? 8, 1, 50),
      availableAt: input.availableAt ?? new Date(),
    }, select: {id: true}});
    return {id: row.id, reused: false};
  } catch (error) {
    if (!input.dedupeKey || !isUniqueConflict(error)) throw error;
    const raced = await client.platformDurableJob.findUnique({where: {dedupeKey: input.dedupeKey}, select: {id: true}});
    if (!raced) throw error;
    return {id: raced.id, reused: true};
  }
}

export async function processDurableJobBatch(
  queue: string,
  handlers: Readonly<Record<string, DurableJobHandler>>,
  options: Readonly<{batchSize?: number; workerId?: string; leaseMs?: number}> = {},
): Promise<{claimed: number; completed: number; failed: number; dead: number}> {
  const db = database();
  const batchSize = clamp(options.batchSize ?? 50, 1, 200);
  const leaseMs = clamp(options.leaseMs ?? 60_000, 5_000, 15 * 60_000);
  const workerId = options.workerId?.trim() || `jobs-${process.pid}-${randomUUID().slice(0, 8)}`;
  const now = new Date();

  // Recover jobs abandoned by crashed workers before claiming new work.
  await db.platformDurableJob.updateMany({
    where: {queue, status: "PROCESSING", leaseExpiresAt: {lt: now}},
    data: {status: "FAILED", lockedAt: null, lockedBy: null, leaseExpiresAt: null, availableAt: now, lastError: "Worker lease expired before completion"},
  });

  const candidates = await db.platformDurableJob.findMany({
    where: {queue, status: {in: ["PENDING", "FAILED"]}, availableAt: {lte: now}},
    orderBy: [{priority: "asc"}, {availableAt: "asc"}, {createdAt: "asc"}],
    take: batchSize * 2,
  });

  let claimed = 0;
  let completed = 0;
  let failed = 0;
  let dead = 0;

  for (const candidate of candidates) {
    if (claimed >= batchSize) break;
    const leaseExpiresAt = new Date(Date.now() + leaseMs);
    const claim = await db.platformDurableJob.updateMany({
      where: {id: candidate.id, status: {in: ["PENDING", "FAILED"]}, availableAt: {lte: new Date()}},
      data: {status: "PROCESSING", lockedAt: new Date(), lockedBy: workerId, leaseExpiresAt},
    });
    if (claim.count !== 1) continue;
    claimed += 1;

    const handler = handlers[candidate.type];
    if (!handler) {
      const nextAttempts = candidate.attempts + 1;
      const terminal = nextAttempts >= candidate.maxAttempts;
      await failJob(candidate.id, workerId, nextAttempts, terminal, `No handler registered for job type ${candidate.type}`);
      terminal ? dead += 1 : failed += 1;
      continue;
    }

    try {
      await handler({id: candidate.id, type: candidate.type, payload: candidate.payload, attempts: candidate.attempts});
      await db.platformDurableJob.updateMany({
        where: {id: candidate.id, status: "PROCESSING", lockedBy: workerId},
        data: {status: "COMPLETED", attempts: {increment: 1}, completedAt: new Date(), lockedAt: null, lockedBy: null, leaseExpiresAt: null, lastError: null},
      });
      completed += 1;
    } catch (error) {
      const nextAttempts = candidate.attempts + 1;
      const terminal = nextAttempts >= candidate.maxAttempts;
      await failJob(candidate.id, workerId, nextAttempts, terminal, error instanceof Error ? error.message : "Unknown job error");
      terminal ? dead += 1 : failed += 1;
    }
  }

  return {claimed, completed, failed, dead};
}

export async function requeueDeadJob(id: string): Promise<boolean> {
  const result = await database().platformDurableJob.updateMany({
    where: {id, status: "DEAD"},
    data: {status: "PENDING", attempts: 0, completedAt: null, lockedAt: null, lockedBy: null, leaseExpiresAt: null, availableAt: new Date(), lastError: null},
  });
  return result.count === 1;
}

async function failJob(id: string, workerId: string, attempts: number, terminal: boolean, message: string): Promise<void> {
  await database().platformDurableJob.updateMany({
    where: {id, status: "PROCESSING", lockedBy: workerId},
    data: {
      status: terminal ? "DEAD" : "FAILED",
      attempts,
      availableAt: terminal ? new Date() : retryAt(attempts),
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      lastError: message.slice(0, 4000),
    },
  });
}

function retryAt(attempt: number): Date {
  const delayMs = Math.min(30 * 60_000, 1_000 * 2 ** Math.min(10, Math.max(0, attempt - 1)));
  return new Date(Date.now() + delayMs + Math.round(Math.random() * delayMs * 0.25));
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === "P2002";
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : min;
}
