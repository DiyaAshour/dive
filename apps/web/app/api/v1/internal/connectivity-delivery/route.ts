import type {NextRequest} from "next/server";
import {runConnectivityWebhookDelivery} from "@platform/server";

export const dynamic="force-dynamic";
export const maxDuration=120;

export async function GET(request:NextRequest){
  const secret=process.env.CRON_SECRET?.trim();
  if(!secret)return Response.json({ok:false,error:"CRON_SECRET is not configured"},{status:503});
  if(request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({ok:false,error:"Unauthorized"},{status:401});
  if((process.env.CONNECTIVITY_DELIVERY_ENABLED??"true").trim().toLowerCase()==="false")return Response.json({ok:true,skipped:true,reason:"CONNECTIVITY_DELIVERY_ENABLED=false",ranAt:new Date().toISOString()});
  try{
    const result=await runConnectivityWebhookDelivery(150);
    return Response.json({ok:true,result,ranAt:new Date().toISOString()});
  }catch(error){
    return Response.json({ok:false,error:error instanceof Error?error.message:"Connectivity delivery failed",ranAt:new Date().toISOString()},{status:500});
  }
}
