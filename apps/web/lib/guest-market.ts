import {cookies, headers} from "next/headers";

export const GUEST_LOCALES = ["en","ar","zh","fr","de","es","it","tr","ru","ja","ko","hi","pt","id","th"] as const;
export type GuestLocale = (typeof GUEST_LOCALES)[number];

export const GUEST_CURRENCIES = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BZD","CAD","CDF","CHF","CLP","CNY","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HTG","HUF","IDR","ILS","INR","IQD","IRR","ISK","JMD","JOD","JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SOS","SRD","SSP","STN","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XOF","XPF","YER","ZAR","ZMW"
] as const;
export type GuestCurrency = (typeof GUEST_CURRENCIES)[number];

export const GUEST_LOCALE_OPTIONS: ReadonlyArray<{code: GuestLocale; label: string}> = [
  {code:"en",label:"English"},{code:"ar",label:"العربية"},{code:"zh",label:"中文"},{code:"fr",label:"Français"},{code:"de",label:"Deutsch"},{code:"es",label:"Español"},{code:"it",label:"Italiano"},{code:"tr",label:"Türkçe"},{code:"ru",label:"Русский"},{code:"ja",label:"日本語"},{code:"ko",label:"한국어"},{code:"hi",label:"हिन्दी"},{code:"pt",label:"Português"},{code:"id",label:"Bahasa Indonesia"},{code:"th",label:"ไทย"},
];

export const CURRENCY_COOKIE = "hmk_currency";
export const MARKET_COUNTRY_COOKIE = "hmk_market_country";
export const GUEST_LOCALE_COOKIE = "hmk_locale";
const COOKIE_MAX_AGE_SECONDS = 31_536_000;

const COUNTRY_CURRENCY: Readonly<Record<string, GuestCurrency>> = {
  AE:"AED",AF:"AFN",AL:"ALL",AM:"AMD",AO:"AOA",AR:"ARS",AT:"EUR",AU:"AUD",AZ:"AZN",BA:"BAM",BB:"BBD",BD:"BDT",BE:"EUR",BF:"XOF",BG:"BGN",BH:"BHD",BI:"BIF",BJ:"XOF",BN:"BND",BO:"BOB",BR:"BRL",BS:"BSD",BT:"BTN",BW:"BWP",BY:"BYN",BZ:"BZD",
  CA:"CAD",CD:"CDF",CF:"XAF",CG:"XAF",CH:"CHF",CI:"XOF",CL:"CLP",CM:"XAF",CN:"CNY",CO:"COP",CR:"CRC",CU:"CUP",CV:"CVE",CY:"EUR",CZ:"CZK",
  DE:"EUR",DJ:"DJF",DK:"DKK",DO:"DOP",DZ:"DZD",EC:"USD",EE:"EUR",EG:"EGP",ER:"ERN",ES:"EUR",ET:"ETB",FI:"EUR",FJ:"FJD",FR:"EUR",
  GA:"XAF",GB:"GBP",GE:"GEL",GH:"GHS",GM:"GMD",GN:"GNF",GR:"EUR",GT:"GTQ",GY:"GYD",HK:"HKD",HN:"HNL",HR:"EUR",HT:"HTG",HU:"HUF",
  ID:"IDR",IE:"EUR",IL:"ILS",IN:"INR",IQ:"IQD",IR:"IRR",IS:"ISK",IT:"EUR",JM:"JMD",JO:"JOD",JP:"JPY",KE:"KES",KG:"KGS",KH:"KHR",KM:"KMF",KR:"KRW",KW:"KWD",KZ:"KZT",
  LA:"LAK",LB:"LBP",LK:"LKR",LR:"LRD",LT:"EUR",LU:"EUR",LV:"EUR",LY:"LYD",MA:"MAD",MD:"MDL",MG:"MGA",MK:"MKD",MM:"MMK",MN:"MNT",MO:"MOP",MR:"MRU",MU:"MUR",MV:"MVR",MW:"MWK",MX:"MXN",MY:"MYR",MZ:"MZN",
  NA:"NAD",NE:"XOF",NG:"NGN",NI:"NIO",NL:"EUR",NO:"NOK",NP:"NPR",NZ:"NZD",OM:"OMR",PA:"PAB",PE:"PEN",PG:"PGK",PH:"PHP",PK:"PKR",PL:"PLN",PY:"PYG",QA:"QAR",RO:"RON",RS:"RSD",RU:"RUB",RW:"RWF",
  SA:"SAR",SB:"SBD",SC:"SCR",SD:"SDG",SE:"SEK",SG:"SGD",SI:"EUR",SK:"EUR",SL:"SLE",SO:"SOS",SR:"SRD",SS:"SSP",ST:"STN",SY:"SYP",SZ:"SZL",
  TH:"THB",TJ:"TJS",TM:"TMT",TN:"TND",TO:"TOP",TR:"TRY",TT:"TTD",TW:"TWD",TZ:"TZS",UA:"UAH",UG:"UGX",US:"USD",UY:"UYU",UZ:"UZS",VE:"VES",VN:"VND",VU:"VUV",WS:"WST",YE:"YER",ZA:"ZAR",ZM:"ZMW",
};

const COUNTRY_LOCALE: Readonly<Record<string, GuestLocale>> = {
  AE:"ar",BH:"ar",DZ:"ar",EG:"ar",IQ:"ar",JO:"ar",KW:"ar",LB:"ar",LY:"ar",MA:"ar",OM:"ar",QA:"ar",SA:"ar",TN:"ar",YE:"ar",
  CN:"zh",HK:"zh",TW:"zh",FR:"fr",BE:"fr",CH:"de",DE:"de",AT:"de",ES:"es",MX:"es",AR:"es",CL:"es",CO:"es",PE:"es",IT:"it",TR:"tr",RU:"ru",JP:"ja",KR:"ko",IN:"hi",BR:"pt",PT:"pt",ID:"id",TH:"th",
};

export type GuestMarket = Readonly<{
  locale: GuestLocale;
  baseLocale: "en" | "ar";
  currency: GuestCurrency;
  countryCode: string | null;
  intlLocale: string;
  direction: "ltr" | "rtl";
  localeSource: "cookie" | "browser" | "country" | "default";
  currencySource: "cookie" | "country" | "default";
}>;

export function isGuestLocale(value: unknown): value is GuestLocale {
  return typeof value === "string" && (GUEST_LOCALES as readonly string[]).includes(value.toLowerCase());
}

export function isGuestCurrency(value: unknown): value is GuestCurrency {
  return typeof value === "string" && (GUEST_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function baseLocale(locale: GuestLocale): "en" | "ar" {
  return locale === "ar" ? "ar" : "en";
}

export function guestIntlLocale(locale: GuestLocale): string {
  return ({ar:"ar-JO",zh:"zh-CN",fr:"fr-FR",de:"de-DE",es:"es-ES",it:"it-IT",tr:"tr-TR",ru:"ru-RU",ja:"ja-JP",ko:"ko-KR",hi:"hi-IN",pt:"pt-BR",id:"id-ID",th:"th-TH",en:"en-GB"} as const)[locale];
}

export function localeFromLanguageTag(tag: string | null | undefined): GuestLocale | null {
  if (!tag) return null;
  for (const part of tag.split(",")) {
    const raw = part.split(";")[0]?.trim().toLowerCase();
    if (!raw) continue;
    const language = raw.split("-")[0];
    if (isGuestLocale(language)) return language;
  }
  return null;
}

export function marketForCountry(countryCode: string | null | undefined): {locale: GuestLocale; currency: GuestCurrency} {
  const country = normalizeCountry(countryCode);
  return {locale: country ? COUNTRY_LOCALE[country] ?? "en" : "en", currency: country ? COUNTRY_CURRENCY[country] ?? "USD" : "JOD"};
}

export async function requestGuestMarket(): Promise<GuestMarket> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const countryCode = normalizeCountry(
    headerStore.get("x-vercel-ip-country") ?? headerStore.get("cf-ipcountry") ?? headerStore.get("x-country-code") ?? cookieStore.get(MARKET_COUNTRY_COOKIE)?.value,
  );
  const countryMarket = marketForCountry(countryCode);
  const cookieLocale = cookieStore.get(GUEST_LOCALE_COOKIE)?.value;
  const browserLocale = localeFromLanguageTag(headerStore.get("accept-language"));
  const locale = isGuestLocale(cookieLocale) ? cookieLocale : browserLocale ?? countryMarket.locale ?? "en";
  const localeSource: GuestMarket["localeSource"] = isGuestLocale(cookieLocale) ? "cookie" : browserLocale ? "browser" : countryCode ? "country" : "default";
  const cookieCurrency = cookieStore.get(CURRENCY_COOKIE)?.value;
  const currency = isGuestCurrency(cookieCurrency) ? cookieCurrency : countryCode ? countryMarket.currency : "JOD";
  const currencySource: GuestMarket["currencySource"] = isGuestCurrency(cookieCurrency) ? "cookie" : countryCode ? "country" : "default";
  return {locale,baseLocale:baseLocale(locale),currency,countryCode,intlLocale:guestIntlLocale(locale),direction:locale === "ar" ? "rtl" : "ltr",localeSource,currencySource};
}

export function guestCookieOptions() {
  return {httpOnly:false,secure:process.env.NODE_ENV === "production",sameSite:"lax" as const,path:"/",maxAge:COOKIE_MAX_AGE_SECONDS};
}

function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) && normalized !== "XX" ? normalized : null;
}
