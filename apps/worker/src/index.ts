import {
  evaluateActivePriceWatches,
  expirePendingMediaUploads,
  expireStaleHolds,
  exportAnalyticsEventToStdout,
  processEmailOutbox,
  processOutboxBatch,
  processSearchIndexBatch,
  reconcileHotelSearchIndex,
  syncBookingAnalyticsEvents,
  syncBookingLifecycleEmails,
  syncPriceWatchNotificationEmails,
} from "@platform/server";

const intervalMs = boundedInteger(process.env.HOLD_EXPIRY_INTERVAL_MS, 30_000, 5_000, 300_000);
const bookingBatchSize = boundedInteger(process.env.HOLD_EXPIRY_BATCH_SIZE, 200, 1, 500);
const mediaBatchSize = boundedInteger(process.env.MEDIA_UPLOAD_CLEANUP_BATCH_SIZE, 200, 1, 500);
const priceWatchBatchSize = boundedInteger(process.env.PRICE_WATCH_BATCH_SIZE, 100, 1, 500);
const priceWatchIntervalMs = boundedInteger(process.env.PRICE_WATCH_INTERVAL_MS, 3_600_000, 60_000, 86_400_000);
const emailBatchSize = boundedInteger(process.env.EMAIL_DELIVERY_BATCH_SIZE, 50, 1, 200);
const emailSyncIntervalMs = boundedInteger(process.env.EMAIL_SYNC_INTERVAL_MS, 60_000, 15_000, 3_600_000);
const searchIndexBatchSize = boundedInteger(process.env.SEARCH_INDEX_BATCH_SIZE, 50, 1, 200);
const searchIndexIntervalMs = boundedInteger(process.env.SEARCH_INDEX_INTERVAL_MS, 15_000, 5_000, 300_000);
const searchReconcileBatchSize = boundedInteger(process.env.SEARCH_RECONCILE_BATCH_SIZE, 500, 1, 2000);
const searchReconcileIntervalMs = boundedInteger(process.env.SEARCH_RECONCILE_INTERVAL_MS, 60_000, 15_000, 3_600_000);
const bookingAnalyticsBatchSize = boundedInteger(process.env.BOOKING_ANALYTICS_BATCH_SIZE, 500, 1, 2000);
const bookingAnalyticsIntervalMs = boundedInteger(process.env.BOOKING_ANALYTICS_INTERVAL_MS, 10_000, 5_000, 300_000);
const analyticsOutboxBatchSize = boundedInteger(process.env.ANALYTICS_OUTBOX_BATCH_SIZE, 100, 1, 500);
const analyticsOutboxIntervalMs = boundedInteger(process.env.ANALYTICS_OUTBOX_INTERVAL_MS, 10_000, 5_000, 300_000);
const analyticsStdoutExport = (process.env.ANALYTICS_STDOUT_EXPORT ?? "false").trim().toLowerCase() === "true";
let nextPriceWatchAt = 0;
let nextEmailSyncAt = 0;
let nextSearchIndexAt = 0;
let nextSearchReconcileAt = 0;
let nextBookingAnalyticsAt = 0;
let nextAnalyticsOutboxAt = 0;
let running = false;
let stopping = false;

async function tick(): Promise<void> {
  if (running || stopping) return;
  running = true;
  try {
    await run("booking_holds_expired", async () => ({count: await expireStaleHolds(bookingBatchSize)}));
    await run("media_uploads_expired", async () => ({count: await expirePendingMediaUploads(mediaBatchSize)}));

    if (Date.now() >= nextPriceWatchAt) {
      nextPriceWatchAt = Date.now() + priceWatchIntervalMs;
      await run("price_watches_checked", () => evaluateActivePriceWatches(priceWatchBatchSize));
    }
    if (Date.now() >= nextEmailSyncAt) {
      nextEmailSyncAt = Date.now() + emailSyncIntervalMs;
      await run("booking_email_events_synced", () => syncBookingLifecycleEmails(750));
      await run("price_watch_emails_synced", () => syncPriceWatchNotificationEmails(750));
    }
    if (Date.now() >= nextSearchReconcileAt) {
      nextSearchReconcileAt = Date.now() + searchReconcileIntervalMs;
      await run("search_index_reconciled", () => reconcileHotelSearchIndex(searchReconcileBatchSize));
    }
    if (Date.now() >= nextSearchIndexAt) {
      nextSearchIndexAt = Date.now() + searchIndexIntervalMs;
      await run("search_index_processed", () => processSearchIndexBatch({batchSize: searchIndexBatchSize}));
    }
    if (Date.now() >= nextBookingAnalyticsAt) {
      nextBookingAnalyticsAt = Date.now() + bookingAnalyticsIntervalMs;
      await run("booking_analytics_projected", () => syncBookingAnalyticsEvents(bookingAnalyticsBatchSize));
    }
    if (analyticsStdoutExport && Date.now() >= nextAnalyticsOutboxAt) {
      nextAnalyticsOutboxAt = Date.now() + analyticsOutboxIntervalMs;
      await run("analytics_outbox_processed", () => processOutboxBatch({analytics: exportAnalyticsEventToStdout}, {batchSize: analyticsOutboxBatchSize}));
    }
    await run("email_outbox_processed", () => processEmailOutbox(emailBatchSize));
  } finally {
    running = false;
  }
}

async function run(event: string, operation: () => Promise<Record<string, unknown>>): Promise<void> {
  try {
    const result = await operation();
    console.info(JSON.stringify({event, ...result, at: new Date().toISOString()}));
  } catch (error) {
    console.error(JSON.stringify({event: `${event}_failed`, message: error instanceof Error ? error.message : "unknown error", at: new Date().toISOString()}));
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
