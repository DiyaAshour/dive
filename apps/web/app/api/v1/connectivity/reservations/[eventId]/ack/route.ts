import {authenticateHandMeKeyConnectivity, acknowledgeHandMeKeyReservationEvent} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";

export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
  try{
    const context=await authenticateHandMeKeyConnectivity(request.headers.get("authorization"));
    const {eventId}=await params;
    return ok(await acknowledgeHandMeKeyReservationEvent(context,eventId));
  }catch(error){return handleApiError(error);}
}
