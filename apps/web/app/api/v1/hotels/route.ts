import { createHotelRequestSchema } from "@platform/contracts";
import { createHotel, getSessionUser, listUserHotels, unauthorized } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

async function userFrom(request: NextRequest) {
  const user = await getSessionUser(readSessionToken(request));
  if (!user) unauthorized();
  return user;
}

export async function GET(request: NextRequest) {
  try { const user = await userFrom(request); return ok({hotels: await listUserHotels(user.id)}); }
  catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await userFrom(request);
    const parsed = createHotelRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    return ok({hotel: await createHotel(user.id, parsed.data)}, {status: 201});
  } catch (error) { return handleApiError(error); }
}
