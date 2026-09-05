import Link from "next/link";
import {LockKeyhole, ShieldCheck} from "lucide-react";
import {getHotelbedsHotelDetails, type HotelbedsOffer} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {defaultStayDates} from "@/lib/stay-dates";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {HotelbedsCheckoutFlow} from "./checkout-flow";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HotelbedsCheckoutPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const [query,market] = await Promise.all([searchParams,requestGuestMarket()]);
  const defaults = defaultStayDates();
  const hotelCode = first(query.hotelCode);
  const rateKey = first(query.rateKey);
  const arrival = first(query.arrival) ?? defaults.arrival;
  const departure = first(query.departure) ?? defaults.departure;
  const adults = number(first(query.adults), 2);
  const children = number(first(query.children), 0);
  const valid = Boolean(hotelCode && /^\d+$/.test(hotelCode) && rateKey && rateKey.length >= 20 && adults >= 1 && children === 0);
  let hotel: Awaited<ReturnType<typeof getHotelbedsHotelDetails>> = null;
  let offer: HotelbedsOffer | null = null;
  if (valid) {
    try {
      hotel = await getHotelbedsHotelDetails(hotelCode!, {arrival, departure, adults, children});
      offer = hotel?.offers.find((item) => item.rateKey === rateKey) ?? null;
    } catch (error) {
      console.error("Hotelbeds checkout rate load failed", error);
    }
  }
  const ar = market.locale === "ar";
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader minimal/>
    <section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Hotelbeds API booking</span><h1>{ar ? "راجع سعر المزود المباشر" : "Review the live provider rate"}</h1><p>{ar ? "يتم تأكيد الحجز مع Hotelbeds ويبقى منفصلًا عن حجوزات فنادق الشركاء." : "The booking is confirmed with Hotelbeds and kept separate from HandMeKey partner-property bookings."}</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>{ar ? "مفتاح السعر محفوظ على الخادم" : "Provider rate key secured server-side"}</span><span><ShieldCheck size={18}/>{ar ? "يتم حفظ مرجع Hotelbeds" : "Hotelbeds booking reference stored"}</span></div></div></section>
    <section className="shell checkoutSection">
      {!valid || !hotel || !offer ? <div className="premiumEmpty"><h3>{ar ? "سعر Hotelbeds لم يعد متاحًا" : "This Hotelbeds rate is no longer available"}</h3><p>{children > 0 ? (ar ? "لا يمكن إرسال أعمار الأطفال من شاشة البحث الحالية؛ اختر إقامة بدون أطفال أو أكمل إضافة الأعمار لاحقًا." : "The current search form does not yet collect child ages required by Hotelbeds.") : (ar ? "ارجع إلى البحث واختر سعرًا مباشرًا جديدًا." : "Return to search and select a fresh provider rate.")}</p><Link href="/search" className="resultCta">{ar ? "العودة إلى البحث" : "Return to search"}</Link></div> : <HotelbedsCheckoutFlow hotel={hotel} offer={offer} arrival={arrival} departure={departure} adults={adults} children={children} locale={market.locale} currency={market.currency}/>}
    </section>
  </main>;
}

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
function number(value: string | undefined, fallback: number): number { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback; }
