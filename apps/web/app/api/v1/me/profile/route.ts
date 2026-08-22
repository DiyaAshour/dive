import { updateAccountProfileSchema } from "@platform/contracts";
import { getAccountProfile, updateAccountProfile } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await getAccountProfile(user.id));
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = updateAccountProfileSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    return ok(await updateAccountProfile(user.id, parsed.data));
  } catch (error) { return handleApiError(error); }
}
