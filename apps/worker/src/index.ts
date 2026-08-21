import { expireStaleHolds } from "@platform/server";

const intervalMs = boundedInteger(process.env.HOLD_EXPIRY_INTERVAL_MS, 30_000, 5_000, 300_000);
const batchSize = boundedInteger(process.env.HOLD_EXPIRY_BATCH_SIZE, 200, 1, 500);
let running = false;
let stopping = false;

async function tick(): Promise<void> {
  if (running || stopping) return;
  running = true;
  try {
    const expired = await expireStaleHolds(batchSize);
    if (expired > 0) console.info(JSON.stringify({event:"booking_holds_expired", count:expired, at:new Date().toISOString()}));
  } catch (error) {
    console.error(JSON.stringify({event:"booking_hold_expiry_failed", message:error instanceof Error ? error.message : "unknown error", at:new Date().toISOString()}));
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
