import "server-only";
import {cookies, headers} from "next/headers";
import {
  CURRENCY_COOKIE,
  GUEST_LOCALE_COOKIE,
  MARKET_COUNTRY_COOKIE,
  baseLocale,
  guestIntlLocale,
  isGuestCurrency,
  isGuestLocale,
  localeFromLanguageTag,
  marketForCountry,
  normalizeCountry,
  type GuestMarket,
} from "./guest-market";

export async function requestGuestMarket(): Promise<GuestMarket> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const countryCode = normalizeCountry(
    headerStore.get("x-vercel-ip-country") ??
    headerStore.get("cf-ipcountry") ??
    headerStore.get("x-country-code") ??
    cookieStore.get(MARKET_COUNTRY_COOKIE)?.value,
  );
  const countryMarket = marketForCountry(countryCode);
  const cookieLocale = cookieStore.get(GUEST_LOCALE_COOKIE)?.value;
  const browserLocale = localeFromLanguageTag(headerStore.get("accept-language"));
  const locale = isGuestLocale(cookieLocale) ? cookieLocale : browserLocale ?? countryMarket.locale ?? "en";
  const localeSource: GuestMarket["localeSource"] = isGuestLocale(cookieLocale) ? "cookie" : browserLocale ? "browser" : countryCode ? "country" : "default";
  const cookieCurrency = cookieStore.get(CURRENCY_COOKIE)?.value;
  const currency = isGuestCurrency(cookieCurrency) ? cookieCurrency : countryCode ? countryMarket.currency : "JOD";
  const currencySource: GuestMarket["currencySource"] = isGuestCurrency(cookieCurrency) ? "cookie" : countryCode ? "country" : "default";
  return {
    locale,
    baseLocale: baseLocale(locale),
    currency,
    countryCode,
    intlLocale: guestIntlLocale(locale),
    direction: locale === "ar" ? "rtl" : "ltr",
    localeSource,
    currencySource,
  };
}
