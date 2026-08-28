import { database } from "@platform/database";
import { emailCapabilities } from "../communications/email";
import { paymentCapabilities } from "../payments/registry";

export async function platformReadiness() {
  const startedAt = Date.now();
  try {
    await database().user.count({take: 1});
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

function storageCapability() {
  const provider = (process.env.STORAGE_PROVIDER ?? "none").trim().toLowerCase();
  if (provider === "s3") {
    return {configured: Boolean(process.env.S3_BUCKET?.trim() && process.env.S3_ACCESS_KEY_ID?.trim() && process.env.S3_SECRET_ACCESS_KEY?.trim()), provider};
  }
  return {configured: false, provider: null};
}
