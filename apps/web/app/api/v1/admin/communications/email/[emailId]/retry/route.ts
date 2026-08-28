import type { NextRequest } from "next/server";
import { retryAdminEmail } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{emailId: string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    return ok(await retryAdminEmail(user.id, (await params).emailId));
  } catch (error) {
    return handleApiError(error);
  }
}
