import { removeSavedSearch } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function DELETE(request: Request, {params}: {params: Promise<{searchId:string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {searchId} = await params;
    return ok(await removeSavedSearch(user.id, searchId));
  } catch (error) {
    return handleApiError(error);
  }
}
