import { loginRequestSchema } from "@platform/contracts";
import { loginUser } from "@platform/server";
import { NextRequest } from "next/server";
import { attachSessionCookie } from "@/lib/session";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const parsed = loginRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const result = await loginUser(parsed.data);
    const response = ok({user: result.user});
    attachSessionCookie(response, result.session.token, result.session.expiresAt);
    return response;
  } catch (error) { return handleApiError(error); }
}
