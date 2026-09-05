import type {NextRequest} from "next/server";
import {syncHotelbedsContentCatalog, syncHotelbedsRateCommentCatalog} from "@platform/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!cronSecret) return Response.json({ok:false,error:"CRON_SECRET is not configured"},{status:503});
  if (authorization !== `Bearer ${cronSecret}`) return Response.json({ok:false,error:"Unauthorized"},{status:401});

  if ((process.env.HOTELBEDS_CONTENT_SYNC_ENABLED ?? "true").trim().toLowerCase() === "false") {
    return Response.json({ok:true,skipped:true,reason:"HOTELBEDS_CONTENT_SYNC_ENABLED=false",ranAt:new Date().toISOString()});
  }

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0,10);
  const hotels = await syncHotelbedsContentCatalog({lastUpdateTime: yesterday});
  const syncRateComments = ["1","true","yes","on"].includes((process.env.HOTELBEDS_RATE_COMMENT_SYNC_ENABLED ?? "false").trim().toLowerCase());
  const rateComments = syncRateComments ? await syncHotelbedsRateCommentCatalog({lastUpdateTime: yesterday}) : null;

  return Response.json({ok:true,hotels,rateComments,ranAt:new Date().toISOString()});
}
