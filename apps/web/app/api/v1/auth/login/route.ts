import { loginRequestSchema } from "@platform/contracts";
import { getTravelerLocale, loginUser, setTravelerLocale } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { isLocale, localeCookieName } from "@/lib/i18n";
import { attachLocaleCookie } from "@/lib/locale-cookie";
import { attachSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const parsed = loginRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const result = await loginUser(parsed.data);
    const savedLocale = await getTravelerLocale(result.user.id);
    const browserLocale = request.cookies.get(localeCookieName)?.value;
    const locale = savedLocale ?? (isLocale(browserLocale) ? browserLocale : "en");
    if (!savedLocale) await setTravelerLocale(result.user.id, {locale});
    const response = ok({user: result.user});
    attachSessionCookie(response, result.session.token, result.session.expiresAt);
    attachLocaleCookie(response, locale);
    return response;
  } catch (error) { return handleApiError(error); }
}
