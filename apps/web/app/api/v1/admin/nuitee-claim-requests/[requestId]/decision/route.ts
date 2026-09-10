import type {NextRequest} from "next/server";
import {reviewNuiteeHotelClaimRequest} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function POST(request:NextRequest,{params}:{params:Promise<{requestId:string}>}){
  try{
    const {requestId}=await params;
    const admin=await requestAdminUser(request);
    if(!admin)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Administrator authentication required"}},{status:401});
    const body=await request.json().catch(()=>null) as {decision?:unknown;reason?:unknown}|null;
    const decision=body?.decision==="APPROVE"||body?.decision==="REJECT"?body.decision:null;
    if(!decision)return Response.json({data:null,error:{code:"INVALID_DECISION",message:"Decision must be APPROVE or REJECT"}},{status:400});
    const reason=typeof body?.reason==="string"?body.reason:undefined;
    return ok(await reviewNuiteeHotelClaimRequest(admin.id,requestId,{decision,...(reason!==undefined?{reason}: {})}));
  }catch(error){return handleApiError(error);}
}
