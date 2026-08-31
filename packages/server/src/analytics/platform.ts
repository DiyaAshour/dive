import { randomUUID } from "node:crypto";
import { database, type Prisma } from "@platform/database";
import { enqueueOutboxEvent } from "../reliability/outbox";

export type AnalyticsEventInput = Readonly<{
  eventId?: string;
  name: string;
  schemaVersion?: number;
  subjectKey?: string | null;
  sessionId?: string | null;
  hotelId?: string | null;
  bookingId?: string | null;
  requestId?: string | null;
  source: "web" | "api" | "worker" | "admin" | "partner" | "system";
  properties?: Prisma.InputJsonObject;
  occurredAt?: Date;
}>;

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<{eventId: string; reused: boolean}> {
  const db = database();
  const eventId = input.eventId ?? randomUUID();
  const existing = await db.analyticsEnvelope.findUnique({where: {eventId}, select: {eventId: true}});
  if (existing) return {eventId, reused: true};

  try {
    await db.$transaction(async (tx) => {
      await tx.analyticsEnvelope.create({data: {
        eventId,
        name: input.name,
        schemaVersion: input.schemaVersion ?? 1,
        subjectKey: input.subjectKey ?? null,
        sessionId: input.sessionId ?? null,
        hotelId: input.hotelId ?? null,
        bookingId: input.bookingId ?? null,
        requestId: input.requestId ?? null,
        source: input.source,
        properties: input.properties ?? {},
        occurredAt: input.occurredAt ?? new Date(),
      }});
      await enqueueOutboxEvent(tx, {
        topic: "analytics",
        aggregateType: "AnalyticsEnvelope",
        aggregateId: eventId,
        eventType: input.name,
        schemaVersion: input.schemaVersion ?? 1,
        deduplicationKey: `analytics:${eventId}`,
        payload: {
          eventId,
          name: input.name,
          schemaVersion: input.schemaVersion ?? 1,
          subjectKey: input.subjectKey ?? null,
          sessionId: input.sessionId ?? null,
          hotelId: input.hotelId ?? null,
          bookingId: input.bookingId ?? null,
          requestId: input.requestId ?? null,
          source: input.source,
          properties: input.properties ?? {},
          occurredAt: (input.occurredAt ?? new Date()).toISOString(),
        },
      });
    });
    return {eventId, reused: false};
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const raced = await db.analyticsEnvelope.findUnique({where: {eventId}, select: {eventId: true}});
    if (!raced) throw error;
    return {eventId, reused: true};
  }
}

export async function analyticsPipelineHealth(): Promise<{
  pending: number;
  failed: number;
  dead: number;
  oldestPendingAgeSeconds: number | null;
}> {
  const db = database();
  const [pending, failed, dead, oldest] = await Promise.all([
    db.platformOutboxEvent.count({where: {topic: "analytics", status: "PENDING"}}),
    db.platformOutboxEvent.count({where: {topic: "analytics", status: "FAILED"}}),
    db.platformOutboxEvent.count({where: {topic: "analytics", status: "DEAD"}}),
    db.platformOutboxEvent.findFirst({where: {topic: "analytics", status: {in: ["PENDING", "FAILED"]}}, orderBy: {createdAt: "asc"}, select: {createdAt: true}}),
  ]);
  return {
    pending,
    failed,
    dead,
    oldestPendingAgeSeconds: oldest ? Math.max(0, Math.round((Date.now() - oldest.createdAt.getTime()) / 1000)) : null,
  };
}

export async function exportAnalyticsEventToStdout(event: Readonly<{payload: unknown}>): Promise<void> {
  if ((process.env.ANALYTICS_STDOUT_EXPORT ?? "false").toLowerCase() !== "true") {
    throw new Error("Analytics publisher is not configured. Set a warehouse publisher or ANALYTICS_STDOUT_EXPORT=true for development.");
  }
  console.info(JSON.stringify({event: "analytics_export", payload: event.payload, at: new Date().toISOString()}));
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === "P2002";
}
