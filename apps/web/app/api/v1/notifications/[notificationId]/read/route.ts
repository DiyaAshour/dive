import { markNotificationRead } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: Request, {params}: {params: Promise<{notificationId:string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {notificationId} = await params;
    return ok(await markNotificationRead(user.id, notificationId));
  } catch (error) {
    return handleApiError(error);
  }
}
