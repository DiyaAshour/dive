import type { NextRequest } from "next/server";
import { evaluateActivePriceWatches, processEmailOutbox, syncResendInboundEmails } from "@platform/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return Response.json({ok: false, error: "CRON_SECRET is not configured"}, {status: 503});
  }
  if (authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ok: false, error: "Unauthorized"}, {status: 401});
  }

  const priceWatches = await evaluateActivePriceWatches(Number(process.env.PRICE_WATCH_BATCH_SIZE ?? 100));
  const emailOutbox = await processEmailOutbox(Number(process.env.EMAIL_DELIVERY_BATCH_SIZE ?? 100));
  const inboundEmail = await syncResendInboundEmails(Number(process.env.EMAIL_INBOUND_SYNC_BATCH_SIZE ?? 50));

  return Response.json({
    ok: true,
    priceWatches,
    emailOutbox,
    inboundEmail,
    ranAt: new Date().toISOString(),
  });
}
