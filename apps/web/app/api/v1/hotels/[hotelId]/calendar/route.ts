import { upsertCalendarRequestSchema } from "@platform/contracts";
import { getCalendar, getSessionUser, unauthorized, upsertCalendar } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

async function requireUser(request: NextRequest) {
  const user = await getSessionUser(readSessionToken(request));
  if (!user) unauthorized();
  return user;
}

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requireUser(request);
    const {hotelId} = await params;
    const from = request.nextUrl.searchParams.get("from") ?? "";
    const to = request.nextUrl.searchParams.get("to") ?? "";
    return ok(await getCalendar(user.id, hotelId, from, to));
  } catch (error) { return handleApiError(error); }
}

export async function PUT(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requireUser(request);
    const parsed = upsertCalendarRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId} = await params;
    return ok(await upsertCalendar(user.id, hotelId, parsed.data));
  } catch (error) { return handleApiError(error); }
}
