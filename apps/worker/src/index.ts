import { expirePendingMediaUploads, expireStaleHolds } from "@platform/server";

const intervalMs = boundedInteger(process.env.HOLD_EXPIRY_INTERVAL_MS, 30_000, 5_000, 300_000);
const bookingBatchSize = boundedInteger(process.env.HOLD_EXPIRY_BATCH_SIZE, 200, 1, 500);
const mediaBatchSize = boundedInteger(process.env.MEDIA_UPLOAD_CLEANUP_BATCH_SIZE, 200, 1, 500);
let running = false;
let stopping = false;

async function tick(): Promise<void> {
  if (running || stopping) return;
  running = true;
  try {
    try {
      const expired = await expireStaleHolds(bookingBatchSize);
      if (expired > 0) console.info(JSON.stringify({event:"booking_holds_expired", count:expired, at:new Date().toISOString()}));
    } catch (error) {
      console.error(JSON.stringify({event:"booking_hold_expiry_failed", message:error instanceof Error ? error.message : "unknown error", at:new Date().toISOString()}));
    }
    try {
      const expiredMedia = await expirePendingMediaUploads(mediaBatchSize);
      if (expiredMedia > 0) console.info(JSON.stringify({event:"media_uploads_expired", count:expiredMedia, at:new Date().toISOString()}));
    } catch (error) {
      console.error(JSON.stringify({event:"media_upload_cleanup_failed", message:error instanceof Error ? error.message : "unknown error", at:new Date().toISOString()}));
    }
  } finally {
    running = false;
  }
}

const timer = setInterval(() => void tick(), intervalMs);
void tick();

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    stopping = true;
    clearInterval(timer);
    const finish = () => process.exit(0);
    if (!running) finish();
    else {
      const check = setInterval(() => { if (!running) { clearInterval(check); finish(); } }, 100);
      setTimeout(() => process.exit(1), 10_000).unref();
    }
  });
}

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
