import {authenticateHandMeKeyConnectivity} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  try{
    const context=await authenticateHandMeKeyConnectivity(request.headers.get("authorization"));
    return ok({ok:true,hotelId:context.hotelId,environment:context.environment,serverTime:new Date().toISOString(),version:"2026-09-10"});
  }catch(error){return handleApiError(error);}
}
