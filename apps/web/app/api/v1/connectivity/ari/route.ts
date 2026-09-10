import {authenticateHandMeKeyConnectivity, pushHandMeKeyAri, type HandMeKeyAriPush} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";

export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const context=await authenticateHandMeKeyConnectivity(request.headers.get("authorization"));
    const body=await request.json().catch(()=>null) as HandMeKeyAriPush|null;
    return ok(await pushHandMeKeyAri(context,body??({updates:[]} as HandMeKeyAriPush),request.headers.get("x-idempotency-key")));
  }catch(error){return handleApiError(error);}
}
