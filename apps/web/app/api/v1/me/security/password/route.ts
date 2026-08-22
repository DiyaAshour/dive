import { changePasswordRequestSchema } from "@platform/contracts";
import { changeAccountPassword } from "@platform/server";
import { NextRequest } from "next/server";
import { attachSessionCookie } from "@/lib/session";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = changePasswordRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const session = await changeAccountPassword(user.id, parsed.data);
    const response = ok({changed:true});
    attachSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) { return handleApiError(error); }
}
