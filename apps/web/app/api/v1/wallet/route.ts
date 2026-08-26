import { getWalletOverview } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await getWalletOverview(user.id));
  } catch (error) {
    return handleApiError(error);
  }
}
