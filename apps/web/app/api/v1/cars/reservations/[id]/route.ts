import { cancelMyCarReservation } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function PATCH(request: Request, {params}:{params:Promise<{id:string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {id}=await params;
    const body=await request.json().catch(()=>({})) as {action?:unknown;reason?:unknown};
    if(body.action!=="cancel") return Response.json({data:null,error:{code:"CAR_ACTION_INVALID",message:"Unsupported reservation action"}},{status:400});
    const reason=typeof body.reason==="string"?body.reason:undefined;
    return ok(await cancelMyCarReservation(user.id,id,reason));
  } catch (error) {
    return handleApiError(error);
  }
}
