import { getSessionUser } from "@platform/server";
import { NextRequest } from "next/server";
import { readSessionToken } from "@/lib/session";
import { handleApiError, ok } from "@/lib/api";

export async function GET(request: NextRequest) {
  try { return ok({user: await getSessionUser(readSessionToken(request))}); }
  catch (error) { return handleApiError(error); }
}
