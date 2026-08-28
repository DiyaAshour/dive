import { setTravelerLocale } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { isGuestLocale } from "@/lib/guest-market";
import { attachLocaleCookie } from "@/lib/locale-cookie";
import { requestAdminUser, requestUser } from "@/lib/request-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {locale?: unknown} | null;
    if (!body || !isGuestLocale(body.locale)) return Response.json({error:{code:"VALIDATION_ERROR",message:"Unsupported guest language"}}, {status:400});

    const user = await requestUser(request) ?? await requestAdminUser(request);
    // The durable traveler profile currently stores the platform's original EN/AR pair.
    // International public-market languages live in the one-year guest cookie until the
    // profile preference model is expanded in a dedicated migration.
    if (user && (body.locale === "en" || body.locale === "ar")) await setTravelerLocale(user.id, {locale: body.locale});

    const response = ok({locale: body.locale});
    attachLocaleCookie(response, body.locale);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
