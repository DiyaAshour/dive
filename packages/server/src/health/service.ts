import { database } from "@platform/database";
import { analyticsPipelineHealth } from "../analytics/platform";
import { emailCapabilities } from "../communications/email";
import { paymentCapabilities } from "../payments/registry";
import { searchPlatformHealth } from "../search/platform";

export async function platformReadiness() {
  const startedAt = Date.now();
  try {
    await database().$queryRaw`SELECT 1`;
  } catch (error) {
    return {
      ready: false,
      database: {ready: false, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message.slice(0,200) : "database unavailable"},
      email: emailCapabilities(),
      payments: paymentCapabilities(),
      storage: storageCapability(),
    };
  }
  return {
    ready: true,
    database: {ready: true, latencyMs: Date.now() - startedAt},
    email: emailCapabilities(),
    payments: paymentCapabilities(),
    storage: storageCapability(),
  };
}

export async function platformOperationalHealth() {
  const db = database();
  const [readiness, analytics, search, jobBacklog, deadJobs, oldestJob] = await Promise.all([
    platformReadiness(),
    safeHealth("analytics", analyticsPipelineHealth),
    safeHealth("search", searchPlatformHealth),
    db.platformDurableJob.count({where: {status: {in: ["PENDING", "FAILED"]}}}).catch(() => -1),
    db.platformDurableJob.count({where: {status: "DEAD"}}).catch(() => -1),
    db.platformDurableJob.findFirst({where: {status: {in: ["PENDING", "FAILED"]}}, orderBy: {createdAt: "asc"}, select: {createdAt: true}}).catch(() => null),
  ]);
  const oldestJobAgeSeconds = oldestJob ? Math.max(0, Math.round((Date.now() - oldestJob.createdAt.getTime()) / 1000)) : null;
  return {
    ready: readiness.ready,
    readiness,
    queues: {pendingOrFailed: jobBacklog, dead: deadJobs, oldestPendingAgeSeconds: oldestJobAgeSeconds},
    analytics,
    search,
    process: {
      pid: process.pid,
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage(),
    },
    observedAt: new Date().toISOString(),
  };
}

async function safeHealth<T>(name: string, operation: () => Promise<T>): Promise<T | {ready: false; error: string}> {
  try {
    return await operation();
  } catch (error) {
    return {ready: false, error: `${name}: ${error instanceof Error ? error.message.slice(0, 300) : "health check failed"}`};
  }
}

function storageCapability() {
  const provider = (process.env.STORAGE_PROVIDER ?? "none").trim().toLowerCase();
  if (provider === "s3") {
    return {configured: Boolean(process.env.S3_BUCKET?.trim() && process.env.S3_ACCESS_KEY_ID?.trim() && process.env.S3_SECRET_ACCESS_KEY?.trim()), provider};
  }
  return {configured: false, provider: null};
}
