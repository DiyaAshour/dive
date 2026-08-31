import { database, type Prisma } from "@platform/database";
import { requirePlatformAdmin } from "../admin/authorization";
import { createExperiment, setExperimentKillSwitch, startExperiment, pauseExperiment, completeExperiment, experimentReport, type ExperimentVariantInput } from "./service";

export async function listPlatformExperiments(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  return database().experiment.findMany({
    include: {variants: {orderBy: {key: "asc"}}, _count: {select: {assignments: true, exposures: true, metrics: true}}},
    orderBy: {updatedAt: "desc"},
    take: 200,
  });
}

export async function getPlatformExperiment(actorUserId: string, key: string) {
  await requirePlatformAdmin(actorUserId);
  return experimentReport(key);
}

export async function createPlatformExperiment(actorUserId: string, input: Readonly<{
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
  await requirePlatformAdmin(actorUserId);
  const experiment = await createExperiment(input);
  await database().auditLog.create({data: {
    actorUserId,
    action: "EXPERIMENT_CREATED",
    entityType: "Experiment",
    entityId: experiment.id,
    after: {key: experiment.key, name: experiment.name, trafficPercent: experiment.trafficPercent, primaryMetric: experiment.primaryMetric, variants: input.variants.map((variant) => ({key: variant.key, weight: variant.weight}))},
  }});
  return experiment;
}

export async function controlPlatformExperiment(actorUserId: string, key: string, action: "START" | "PAUSE" | "COMPLETE" | "KILL" | "UNKILL") {
  await requirePlatformAdmin(actorUserId);
  const before = await database().experiment.findUnique({where: {key: key.trim().toLowerCase()}, select: {id: true, key: true, status: true, killSwitch: true}});
  if (!before) throw new Error(`Experiment ${key} not found`);
  if (action === "START") await startExperiment(key);
  else if (action === "PAUSE") await pauseExperiment(key);
  else if (action === "COMPLETE") await completeExperiment(key);
  else if (action === "KILL") await setExperimentKillSwitch(key, true);
  else await setExperimentKillSwitch(key, false);
  const after = await database().experiment.findUniqueOrThrow({where: {id: before.id}, select: {id: true, key: true, status: true, killSwitch: true}});
  await database().auditLog.create({data: {
    actorUserId,
    action: `EXPERIMENT_${action}`,
    entityType: "Experiment",
    entityId: before.id,
    before: {key: before.key, status: before.status, killSwitch: before.killSwitch},
    after: {key: after.key, status: after.status, killSwitch: after.killSwitch},
  }});
  return after;
}
