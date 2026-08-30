import {getSessionUser, saveOracleOhipConnection, unauthorized} from "@platform/server";
import {NextRequest} from "next/server";
import {handleApiError, ok} from "@/lib/api";
import {readSessionToken} from "@/lib/session";

export async function PUT(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await getSessionUser(readSessionToken(request));
    if (!user) unauthorized();
    const {hotelId} = await params;
    const body = await request.json() as Record<string, unknown>;
    const environment = body.environment === "UAT" ? "UAT" : "PRODUCTION";
    const connection = await saveOracleOhipConnection(user.id, hotelId, {
      environment,
      gatewayUrl: String(body.gatewayUrl ?? ""),
      enterpriseId: String(body.enterpriseId ?? ""),
      hotelCode: String(body.hotelCode ?? ""),
      clientId: String(body.clientId ?? ""),
      clientSecret: String(body.clientSecret ?? ""),
      appKey: String(body.appKey ?? ""),
      scope: String(body.scope ?? ""),
    });
    return ok({connection});
  } catch (error) { return handleApiError(error); }
}
