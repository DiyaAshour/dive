import { createHash, randomBytes, randomUUID } from "node:crypto";
import { database, type Prisma } from "@platform/database";
import { enqueueOutboxEvent } from "../reliability/outbox";

export type ExperimentVariantInput = Readonly<{key: string; name: string; weight: number; configuration?: Prisma.InputJsonObject | null}>;

export async function createExperiment(input: Readonly<{
  key: string;
  name: string;
  description?: string | null;
  allocationBasis?: "USER" | "SESSION" | "DEVICE";
  trafficPercent?: number;
  eligibility?: Prisma.InputJsonObject | null;
  primaryMetric: string;
  guardrailMetrics?: Prisma.InputJsonArray | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  variants: readonly ExperimentVariantInput[];
}>) {
  validateExperimentInput(input);
  return database().experiment.create({
    data: {
      key: normalizeKey(input.key),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      allocationBasis: input.allocationBasis ?? "USER",
      trafficPercent: input.trafficPercent ?? 10000,
      salt: randomBytes(24).toString("hex"),
      ...(input.eligibility == null ? {} : {eligibility: input.eligibility}),
      primaryMetric: input.primaryMetric.trim(),
      ...(input.guardrailMetrics == null ? {} : {guardrailMetrics: input.guardrailMetrics}),
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      variants: {create: input.variants.map((variant) => ({
        key: normalizeKey(variant.key),
        name: variant.name.trim(),
        weight: Math.trunc(variant.weight),
        ...(variant.configuration == null ? {} : {configuration: variant.configuration}),
      }))},
    },
    include: {variants: true},
  });
}

export async function startExperiment(key: string): Promise<void> {
  const experiment = await getExperiment(key);
  validateWeights(experiment.variants);
  if (experiment.trafficPercent <= 0) throw new Error("Experiment trafficPercent must be greater than zero before start");
  if (experiment.endsAt && experiment.endsAt.getTime() <= Date.now()) throw new Error("Experiment end time is already in the past");
  await database().experiment.update({where: {id: experiment.id}, data: {status: "RUNNING", killSwitch: false, startsAt: experiment.startsAt ?? new Date()}});
}

export async function pauseExperiment(key: string): Promise<void> {
  await database().experiment.update({where: {key: normalizeKey(key)}, data: {status: "PAUSED"}});
}

export async function completeExperiment(key: string): Promise<void> {
  await database().experiment.update({where: {key: normalizeKey(key)}, data: {status: "COMPLETED", endsAt: new Date()}});
}

export async function setExperimentKillSwitch(key: string, enabled: boolean): Promise<void> {
  await database().experiment.update({where: {key: normalizeKey(key)}, data: {killSwitch: enabled}});
}

export async function assignExperiment(key: string, subjectKey: string): Promise<
  | {eligible: false; reason: "NOT_RUNNING" | "KILLED" | "NOT_STARTED" | "ENDED" | "OUTSIDE_TRAFFIC"}
  | {eligible: true; experimentId: string; experimentKey: string; variantId: string; variantKey: string; configuration: unknown; reused: boolean}
> {
  const db = database();
  const experiment = await getExperiment(key);
  const subject = subjectKey.trim();
  if (!subject) throw new Error("Experiment subjectKey is required");
  if (experiment.killSwitch) return {eligible: false, reason: "KILLED"};
  if (experiment.status !== "RUNNING") return {eligible: false, reason: "NOT_RUNNING"};
  const now = Date.now();
  if (experiment.startsAt && experiment.startsAt.getTime() > now) return {eligible: false, reason: "NOT_STARTED"};
  if (experiment.endsAt && experiment.endsAt.getTime() <= now) return {eligible: false, reason: "ENDED"};

  const existing = await db.experimentAssignment.findUnique({
    where: {experimentId_subjectKey: {experimentId: experiment.id, subjectKey: subject}},
    include: {variant: true},
  });
  if (existing) return assignmentResult(experiment, existing.variant, true);

  if (bucket(`${experiment.salt}:traffic:${subject}`, 10000) >= experiment.trafficPercent) return {eligible: false, reason: "OUTSIDE_TRAFFIC"};
  validateWeights(experiment.variants);
  const selected = selectVariant(experiment.salt, subject, experiment.variants);

  try {
    const assignment = await db.experimentAssignment.create({
      data: {experimentId: experiment.id, variantId: selected.id, subjectKey: subject},
      include: {variant: true},
    });
    return assignmentResult(experiment, assignment.variant, false);
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const raced = await db.experimentAssignment.findUnique({
      where: {experimentId_subjectKey: {experimentId: experiment.id, subjectKey: subject}},
      include: {variant: true},
    });
    if (!raced) throw error;
    return assignmentResult(experiment, raced.variant, true);
  }
}

export async function recordExperimentExposure(input: Readonly<{
  exposureId?: string;
  experimentKey: string;
  subjectKey: string;
  sessionId?: string | null;
  context?: Prisma.InputJsonObject | null;
}>): Promise<{recorded: boolean; exposureId: string; variantKey: string | null}> {
  const exposureId = input.exposureId ?? randomUUID();
  const assignment = await assignExperiment(input.experimentKey, input.subjectKey);
  if (!assignment.eligible) return {recorded: false, exposureId, variantKey: null};
  const db = database();
  const existing = await db.experimentExposure.findUnique({where: {exposureId}, select: {id: true}});
  if (existing) return {recorded: false, exposureId, variantKey: assignment.variantKey};

  await db.$transaction(async (tx) => {
    await tx.experimentExposure.create({data: {
      exposureId,
      experimentId: assignment.experimentId,
      variantId: assignment.variantId,
      subjectKey: input.subjectKey.trim(),
      sessionId: input.sessionId ?? null,
      ...(input.context == null ? {} : {context: input.context}),
    }});
    await enqueueOutboxEvent(tx, {
      topic: "analytics",
      aggregateType: "Experiment",
      aggregateId: assignment.experimentId,
      eventType: "experiment_exposure",
      deduplicationKey: `experiment-exposure:${exposureId}`,
      payload: {
        exposureId,
        experimentKey: assignment.experimentKey,
        variantKey: assignment.variantKey,
        subjectKey: input.subjectKey.trim(),
        sessionId: input.sessionId ?? null,
        context: input.context ?? {},
        occurredAt: new Date().toISOString(),
      },
    });
  });
  return {recorded: true, exposureId, variantKey: assignment.variantKey};
}

export async function recordExperimentMetric(input: Readonly<{
  metricEventId?: string;
  experimentKey: string;
  subjectKey: string;
  metric: string;
  value?: number;
  properties?: Prisma.InputJsonObject | null;
}>): Promise<{recorded: boolean; metricEventId: string; variantKey: string | null}> {
  const metricEventId = input.metricEventId ?? randomUUID();
  const assignment = await assignExperiment(input.experimentKey, input.subjectKey);
  if (!assignment.eligible) return {recorded: false, metricEventId, variantKey: null};
  if (!input.metric.trim()) throw new Error("Experiment metric is required");
  if (!Number.isFinite(input.value ?? 1)) throw new Error("Experiment metric value must be finite");
  const db = database();
  const existing = await db.experimentMetricEvent.findUnique({where: {metricEventId}, select: {id: true}});
  if (existing) return {recorded: false, metricEventId, variantKey: assignment.variantKey};

  await db.$transaction(async (tx) => {
    await tx.experimentMetricEvent.create({data: {
      metricEventId,
      experimentId: assignment.experimentId,
      variantId: assignment.variantId,
      subjectKey: input.subjectKey.trim(),
      metric: input.metric.trim(),
      value: input.value ?? 1,
      ...(input.properties == null ? {} : {properties: input.properties}),
    }});
    await enqueueOutboxEvent(tx, {
      topic: "analytics",
      aggregateType: "Experiment",
      aggregateId: assignment.experimentId,
      eventType: "experiment_metric",
      deduplicationKey: `experiment-metric:${metricEventId}`,
      payload: {
        metricEventId,
        experimentKey: assignment.experimentKey,
        variantKey: assignment.variantKey,
        subjectKey: input.subjectKey.trim(),
        metric: input.metric.trim(),
        value: input.value ?? 1,
        properties: input.properties ?? {},
        occurredAt: new Date().toISOString(),
      },
    });
  });
  return {recorded: true, metricEventId, variantKey: assignment.variantKey};
}

export async function experimentReport(key: string) {
  const experiment = await getExperiment(key);
  const [exposureRows, metricRows] = await Promise.all([
    database().experimentExposure.groupBy({by: ["variantId"], where: {experimentId: experiment.id}, _count: {_all: true}}),
    database().experimentMetricEvent.groupBy({by: ["variantId", "metric"], where: {experimentId: experiment.id}, _count: {_all: true}, _sum: {value: true}}),
  ]);
  const exposureMap = new Map(exposureRows.map((row) => [row.variantId, row._count._all]));
  const metrics = new Map<string, Array<{metric: string; events: number; value: number}>>();
  for (const row of metricRows) {
    const rows = metrics.get(row.variantId) ?? [];
    rows.push({metric: row.metric, events: row._count._all, value: Number(row._sum.value ?? 0)});
    metrics.set(row.variantId, rows);
  }
  const srm = detectSampleRatioMismatch(experiment.variants.map((variant) => ({weight: variant.weight, observed: exposureMap.get(variant.id) ?? 0})));
  return {
    experiment: {id: experiment.id, key: experiment.key, name: experiment.name, status: experiment.status, primaryMetric: experiment.primaryMetric, killSwitch: experiment.killSwitch},
    variants: experiment.variants.map((variant) => ({
      id: variant.id,
      key: variant.key,
      name: variant.name,
      weight: variant.weight,
      exposures: exposureMap.get(variant.id) ?? 0,
      metrics: metrics.get(variant.id) ?? [],
    })),
    sampleRatioMismatch: srm,
  };
}

async function getExperiment(key: string) {
  const experiment = await database().experiment.findUnique({where: {key: normalizeKey(key)}, include: {variants: {orderBy: {key: "asc"}}}});
  if (!experiment) throw new Error(`Experiment ${key} not found`);
  return experiment;
}

function assignmentResult(experiment: Awaited<ReturnType<typeof getExperiment>>, variant: Awaited<ReturnType<typeof getExperiment>>["variants"][number], reused: boolean) {
  return {
    eligible: true as const,
    experimentId: experiment.id,
    experimentKey: experiment.key,
    variantId: variant.id,
    variantKey: variant.key,
    configuration: variant.configuration,
    reused,
  };
}

function selectVariant(salt: string, subjectKey: string, variants: Awaited<ReturnType<typeof getExperiment>>["variants"]) {
  const total = variants.reduce((sum, variant) => sum + variant.weight, 0);
  let point = bucket(`${salt}:variant:${subjectKey}`, total);
  for (const variant of variants) {
    if (point < variant.weight) return variant;
    point -= variant.weight;
  }
  return variants[variants.length - 1]!;
}

function bucket(value: string, modulo: number): number {
  if (modulo <= 0) throw new Error("Experiment bucket modulo must be positive");
  const digest = createHash("sha256").update(value).digest();
  return digest.readUInt32BE(0) % modulo;
}

function validateExperimentInput(input: Readonly<{key: string; name: string; primaryMetric: string; trafficPercent?: number; startsAt?: Date | null; endsAt?: Date | null; variants: readonly ExperimentVariantInput[]}>): void {
  if (!normalizeKey(input.key)) throw new Error("Experiment key is required");
  if (!input.name.trim()) throw new Error("Experiment name is required");
  if (!input.primaryMetric.trim()) throw new Error("Experiment primaryMetric is required");
  if (input.variants.length < 2) throw new Error("Experiments require at least two variants");
  const keys = input.variants.map((variant) => normalizeKey(variant.key));
  if (new Set(keys).size !== keys.length) throw new Error("Experiment variant keys must be unique");
  validateWeights(input.variants);
  const traffic = input.trafficPercent ?? 10000;
  if (!Number.isInteger(traffic) || traffic < 0 || traffic > 10000) throw new Error("trafficPercent must be an integer between 0 and 10000");
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Experiment endsAt must be after startsAt");
}

function validateWeights(variants: readonly {weight: number}[]): void {
  if (!variants.length || variants.some((variant) => !Number.isInteger(variant.weight) || variant.weight <= 0)) throw new Error("Experiment variant weights must be positive integers");
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === "P2002";
}

function detectSampleRatioMismatch(rows: readonly {weight: number; observed: number}[]) {
  const totalObserved = rows.reduce((sum, row) => sum + row.observed, 0);
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  if (totalObserved < 100 || totalWeight <= 0 || rows.length < 2) return {suspected: false, chiSquare: 0, degreesOfFreedom: Math.max(0, rows.length - 1), threshold: null, reason: "INSUFFICIENT_SAMPLE" as const};
  let chiSquare = 0;
  for (const row of rows) {
    const expected = totalObserved * row.weight / totalWeight;
    if (expected > 0) chiSquare += (row.observed - expected) ** 2 / expected;
  }
  const df = rows.length - 1;
  const threshold = chiSquareCritical001(df);
  return {suspected: chiSquare >= threshold, chiSquare, degreesOfFreedom: df, threshold, reason: chiSquare >= threshold ? "SRM_P_LT_0_001" as const : "OK" as const};
}

function chiSquareCritical001(df: number): number {
  const known = [0, 10.828, 13.816, 16.266, 18.467, 20.515, 22.458, 24.322, 26.125, 27.877, 29.588];
  if (df < known.length) return known[df]!;
  // Wilson-Hilferty approximation for the 99.9th percentile, accurate enough for an operational guardrail.
  const z = 3.090232306;
  return df * (1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df))) ** 3;
}
