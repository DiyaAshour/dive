import { registerRequestSchema } from "@platform/contracts";
import { registerUser } from "@platform/server";
import { NextRequest } from "next/server";
import { attachSessionCookie } from "@/lib/session";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const parsed = registerRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const result = await registerUser(parsed.data);
    const response = ok({user: result.user}, {status: 201});
    attachSessionCookie(response, result.session.token, result.session.expiresAt);
    return response;
  } catch (error) { return handleApiError(error); }
}
