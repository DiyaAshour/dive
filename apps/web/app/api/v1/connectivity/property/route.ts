import {authenticateHandMeKeyConnectivity, getHandMeKeyConnectivityProperty} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  try{
    const context=await authenticateHandMeKeyConnectivity(request.headers.get("authorization"));
    return ok(await getHandMeKeyConnectivityProperty(context));
  }catch(error){return handleApiError(error);}
}
