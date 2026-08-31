-- Platform 10x foundation: durable delivery, analytics envelopes, search indexing and experiments.

CREATE TYPE "PlatformOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD');
CREATE TYPE "PlatformJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD');
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "ExperimentAllocationBasis" AS ENUM ('USER', 'SESSION', 'DEVICE');

CREATE TABLE "PlatformOutboxEvent" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "status" "PlatformOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformOutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformOutboxEvent_deduplicationKey_key" ON "PlatformOutboxEvent"("deduplicationKey");
CREATE INDEX "PlatformOutboxEvent_status_availableAt_createdAt_idx" ON "PlatformOutboxEvent"("status", "availableAt", "createdAt");
CREATE INDEX "PlatformOutboxEvent_topic_status_availableAt_idx" ON "PlatformOutboxEvent"("topic", "status", "availableAt");
CREATE INDEX "PlatformOutboxEvent_aggregateType_aggregateId_createdAt_idx" ON "PlatformOutboxEvent"("aggregateType", "aggregateId", "createdAt");

CREATE TABLE "PlatformDurableJob" (
    "id" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "payload" JSONB NOT NULL,
    "status" "PlatformJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformDurableJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformDurableJob_dedupeKey_key" ON "PlatformDurableJob"("dedupeKey");
CREATE INDEX "PlatformDurableJob_queue_status_availableAt_priority_idx" ON "PlatformDurableJob"("queue", "status", "availableAt", "priority");
CREATE INDEX "PlatformDurableJob_status_leaseExpiresAt_idx" ON "PlatformDurableJob"("status", "leaseExpiresAt");

CREATE TABLE "AnalyticsEnvelope" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "subjectKey" TEXT,
    "sessionId" TEXT,
    "hotelId" TEXT,
    "bookingId" TEXT,
    "requestId" TEXT,
    "source" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsEnvelope_eventId_key" ON "AnalyticsEnvelope"("eventId");
CREATE INDEX "AnalyticsEnvelope_name_occurredAt_idx" ON "AnalyticsEnvelope"("name", "occurredAt");
CREATE INDEX "AnalyticsEnvelope_hotelId_name_occurredAt_idx" ON "AnalyticsEnvelope"("hotelId", "name", "occurredAt");
CREATE INDEX "AnalyticsEnvelope_bookingId_occurredAt_idx" ON "AnalyticsEnvelope"("bookingId", "occurredAt");
CREATE INDEX "AnalyticsEnvelope_subjectKey_occurredAt_idx" ON "AnalyticsEnvelope"("subjectKey", "occurredAt");

CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "allocationBasis" "ExperimentAllocationBasis" NOT NULL DEFAULT 'USER',
    "trafficPercent" INTEGER NOT NULL DEFAULT 10000,
    "salt" TEXT NOT NULL,
    "eligibility" JSONB,
    "primaryMetric" TEXT NOT NULL,
    "guardrailMetrics" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Experiment_key_key" ON "Experiment"("key");
CREATE INDEX "Experiment_status_startsAt_endsAt_idx" ON "Experiment"("status", "startsAt", "endsAt");

CREATE TABLE "ExperimentVariant" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExperimentVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperimentVariant_experimentId_key_key" ON "ExperimentVariant"("experimentId", "key");
CREATE INDEX "ExperimentVariant_experimentId_weight_idx" ON "ExperimentVariant"("experimentId", "weight");

CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperimentAssignment_experimentId_subjectKey_key" ON "ExperimentAssignment"("experimentId", "subjectKey");
CREATE INDEX "ExperimentAssignment_variantId_assignedAt_idx" ON "ExperimentAssignment"("variantId", "assignedAt");

CREATE TABLE "ExperimentExposure" (
    "id" TEXT NOT NULL,
    "exposureId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "sessionId" TEXT,
    "context" JSONB,
    "exposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentExposure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperimentExposure_exposureId_key" ON "ExperimentExposure"("exposureId");
CREATE INDEX "ExperimentExposure_experimentId_exposedAt_idx" ON "ExperimentExposure"("experimentId", "exposedAt");
CREATE INDEX "ExperimentExposure_variantId_exposedAt_idx" ON "ExperimentExposure"("variantId", "exposedAt");
CREATE INDEX "ExperimentExposure_subjectKey_exposedAt_idx" ON "ExperimentExposure"("subjectKey", "exposedAt");

CREATE TABLE "ExperimentMetricEvent" (
    "id" TEXT NOT NULL,
    "metricEventId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "properties" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentMetricEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperimentMetricEvent_metricEventId_key" ON "ExperimentMetricEvent"("metricEventId");
CREATE INDEX "ExperimentMetricEvent_experimentId_metric_occurredAt_idx" ON "ExperimentMetricEvent"("experimentId", "metric", "occurredAt");
CREATE INDEX "ExperimentMetricEvent_variantId_metric_occurredAt_idx" ON "ExperimentMetricEvent"("variantId", "metric", "occurredAt");
CREATE INDEX "ExperimentMetricEvent_subjectKey_occurredAt_idx" ON "ExperimentMetricEvent"("subjectKey", "occurredAt");

CREATE TABLE "SearchIndexTask" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "status" "PlatformJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchIndexTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchIndexTask_entityType_entityId_revision_key" ON "SearchIndexTask"("entityType", "entityId", "revision");
CREATE INDEX "SearchIndexTask_status_availableAt_createdAt_idx" ON "SearchIndexTask"("status", "availableAt", "createdAt");
CREATE INDEX "SearchIndexTask_entityType_status_availableAt_idx" ON "SearchIndexTask"("entityType", "status", "availableAt");

ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExperimentVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentExposure" ADD CONSTRAINT "ExperimentExposure_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentExposure" ADD CONSTRAINT "ExperimentExposure_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExperimentVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentMetricEvent" ADD CONSTRAINT "ExperimentMetricEvent_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentMetricEvent" ADD CONSTRAINT "ExperimentMetricEvent_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExperimentVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep allocation percentages safe at the database boundary. 10000 = 100.00%.
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_trafficPercent_check" CHECK ("trafficPercent" >= 0 AND "trafficPercent" <= 10000);
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_weight_check" CHECK ("weight" > 0);
ALTER TABLE "PlatformDurableJob" ADD CONSTRAINT "PlatformDurableJob_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" > 0);
ALTER TABLE "SearchIndexTask" ADD CONSTRAINT "SearchIndexTask_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" > 0);
