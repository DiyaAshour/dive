import type {NextRequest} from "next/server";
import {runScheduledNuiteeContentSync} from "@platform/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return Response.json({ok:false,error:"CRON_SECRET is not configured"},{status:503});
  }
  if (authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ok:false,error:"Unauthorized"},{status:401});
  }

  if ((process.env.NUITEE_CONTENT_SYNC_ENABLED ?? "true").trim().toLowerCase() === "false") {
    return Response.json({ok:true,skipped:true,reason:"NUITEE_CONTENT_SYNC_ENABLED=false",ranAt:new Date().toISOString()});
  }

  const result = await runScheduledNuiteeContentSync();
  return Response.json({ok:true,result,ranAt:new Date().toISOString()});
}
