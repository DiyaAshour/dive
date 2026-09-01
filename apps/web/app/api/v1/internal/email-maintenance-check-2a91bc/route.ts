import { evaluateActivePriceWatches, processEmailOutbox, syncResendInboundEmails, emailCapabilities } from "@platform/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const capability = emailCapabilities();
  const priceWatches = await evaluateActivePriceWatches(Number(process.env.PRICE_WATCH_BATCH_SIZE ?? 100));
  const emailOutbox = await processEmailOutbox(Number(process.env.EMAIL_DELIVERY_BATCH_SIZE ?? 100));
  const inboundEmail = await syncResendInboundEmails(Number(process.env.EMAIL_INBOUND_SYNC_BATCH_SIZE ?? 50));
  return Response.json({
    ok: true,
    resend: capability,
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    priceWatches,
    emailOutbox,
    inboundEmail,
    ranAt: new Date().toISOString(),
  });
}
