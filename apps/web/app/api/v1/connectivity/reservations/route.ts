import {authenticateHandMeKeyConnectivity, listHandMeKeyReservationEvents} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  try{
    const context=await authenticateHandMeKeyConnectivity(request.headers.get("authorization"));
    const url=new URL(request.url);
    const limit=Number(url.searchParams.get("limit")??50);
    return ok(await listHandMeKeyReservationEvents(context,Number.isFinite(limit)?limit:50));
  }catch(error){return handleApiError(error);}
}
