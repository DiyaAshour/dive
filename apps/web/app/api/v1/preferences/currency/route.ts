import {handleApiError, ok} from "@/lib/api";
import {CURRENCY_COOKIE, guestCookieOptions, isGuestCurrency} from "@/lib/guest-market";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {currency?: unknown} | null;
    if (!body || !isGuestCurrency(body.currency)) return Response.json({error:{code:"VALIDATION_ERROR",message:"Unsupported display currency"}}, {status:400});
    const response = ok({currency:body.currency});
    response.cookies.set(CURRENCY_COOKIE,body.currency,guestCookieOptions());
    return response;
  } catch(error) { return handleApiError(error); }
}
