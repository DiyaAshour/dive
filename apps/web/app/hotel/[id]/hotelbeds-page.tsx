import Link from "next/link";
import {BadgeCheck, ChevronLeft, MapPin, ShieldCheck, Star} from "lucide-react";
import type {HotelbedsHotelDetails, HotelbedsOffer} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency, GuestLocale} from "@/lib/guest-market";

type Stay = Readonly<{arrival: string; departure: string; adults: number; children: number; childrenAges?: readonly number[]}>;
type Market = Readonly<{locale: GuestLocale; currency: GuestCurrency; intlLocale: string; direction: "ltr" | "rtl"}>;

export function HotelbedsHotelPage({hotel, stay, market}: Readonly<{hotel: HotelbedsHotelDetails; stay: Stay; market: Market}>) {
  const ar = market.locale === "ar";
  const cheapest = hotel.offers[0] ?? null;
  return <main className="hotelExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="shell hotelDetailSection">
      <Link className="backLink" href={`/search?destination=${encodeURIComponent(hotel.city)}&${stayQuery(stay)}`}><ChevronLeft size={16}/>{ar ? `العودة إلى فنادق ${hotel.city}` : `Back to ${hotel.city} stays`}</Link>
      <div className="premiumHotelHead"><div><div className="hotelBadges"><span><BadgeCheck size={14}/>Hotelbeds API</span>{hotel.starRating&&<span><Star size={14} fill="currentColor"/>{hotel.starRating} {ar ? "نجوم" : "stars"}</span>}</div><h1>{hotel.name}</h1><p><MapPin size={16}/>{hotel.area?`${hotel.area}, `:""}{hotel.city}{hotel.address?` · ${hotel.address}`:""}</p></div><div className="hotelQuickFacts"><div><span>{ar ? "رمز الفندق لدى المزود" : "Provider hotel"}</span><strong>{hotel.providerHotelCode}</strong></div><div><span>{ar ? "الأسعار المباشرة" : "Live rates"}</span><strong>{hotel.offers.length}</strong></div></div></div>
      <div className="hotelMediaEmpty"><span>{ar ? "التوافر والأسعار مباشرة من Hotelbeds." : "Live Hotelbeds inventory and provider rates."}</span></div>
      <div className="hotelTrustBar"><span><ShieldCheck size={17}/>{ar ? "توافر مباشر" : "Live availability"}</span><span><BadgeCheck size={17}/>{ar ? "شروط الإلغاء من المزود" : "Provider cancellation terms"}</span><span><BadgeCheck size={17}/>{ar ? "إعادة تحقق قبل الحجز" : "Rate recheck before booking"}</span></div>
      <div className="availabilityCard"><div><span className="eyebrow">{ar ? "إقامتك" : "Your stay"}</span><h2>{ar ? "اختر سعر Hotelbeds مباشرًا" : "Choose a live Hotelbeds rate"}</h2><p>{stay.arrival} → {stay.departure} · {stay.adults} {ar ? "بالغ" : stay.adults === 1 ? "adult" : "adults"}{stay.children ? ` · ${stay.children} ${ar ? "طفل" : stay.children === 1 ? "child" : "children"}` : ""}</p></div><Link className="resultCta" href={`/hotel/${hotel.slug}?${stayQuery(stay)}`}>{ar ? "تحديث التوافر" : "Refresh availability"}</Link></div>
      <div className="rateSectionHead"><div><span className="eyebrow">{ar ? "أسعار Hotelbeds المباشرة" : "Hotelbeds live rates"}</span><h2>{hotel.offers.length} {ar ? "سعر متاح" : `available rate${hotel.offers.length === 1 ? "" : "s"}`}</h2><p>{ar ? "يتم إعادة التحقق من السعر قبل تأكيد الحجز." : "The selected rate is rechecked before the booking is confirmed."}</p></div>{cheapest&&<div><span>{ar ? "ابتداءً من" : "From"}</span><strong>{guestMoney(cheapest.total,hotel.currency,market.currency,market.locale).text}</strong>{hotel.currency !== market.currency&&<small>{guestMoney(cheapest.total,hotel.currency,market.currency,market.locale).sourceText}</small>}<small>{ar ? "إجمالي الإقامة" : "stay total"}</small></div>}</div>
      <div className="rateCards">{hotel.offers.map((offer)=><HotelbedsRateCard key={offer.rateKey} offer={offer} hotel={hotel} stay={stay} market={market}/>)}</div>
    </section>
  </main>;
}

function HotelbedsRateCard({offer, hotel, stay, market}: Readonly<{offer: HotelbedsOffer; hotel: HotelbedsHotelDetails; stay: Stay; market: Market}>) {
  const ar = market.locale === "ar";
  const total = guestMoney(offer.total,offer.currency,market.currency,market.locale);
  const average = guestMoney(offer.averageNightlyTotal,offer.currency,market.currency,market.locale);
  return <article className="rateCard"><div className="rateRoom"><span>{ar ? "الغرفة" : "Room"}</span><h3>{offer.roomName}</h3><p>{offer.roomCode}</p></div><div className="ratePackage"><span>{ar ? "الباقة" : "Board"}</span><h3>{offer.boardName??offer.boardCode??(ar ? "سعر المزود" : "Provider rate")}</h3><p>{offer.paymentModes.map((mode)=>mode==="PAY_AT_HOTEL"?(ar ? "الدفع في الفندق" : "Pay at hotel"):(ar ? "الدفع إلكترونيًا" : "Pay now")).join(" · ")}</p></div><div className="ratePolicy"><span>{ar ? "الإلغاء" : "Cancellation"}</span><h3>{offer.cancellationPolicy.name}</h3>{offer.cancellationPolicy.rules.map((rule,index)=><p className="muted" key={`${rule.from??"none"}-${index}`}>{guestMoney(rule.amount,hotel.currency,market.currency,market.locale).text}{rule.from?` · ${ar ? "من" : "from"} ${new Date(rule.from).toLocaleDateString(market.intlLocale)}`:""}</p>)}</div><div className="ratePrice"><span>{ar ? "الإجمالي النهائي" : "Final provider total"}</span><strong>{total.text}</strong>{total.converted&&<small>{total.sourceText}</small>}<small>{average.text} {ar ? "متوسط الليلة" : "average / night"}</small><small>{ar ? "نوع السعر" : "Rate type"}: {offer.rateType}</small><Link className="bookRateButton" href={checkoutHref(hotel.providerHotelCode,offer.rateKey,stay)}>{ar ? "متابعة الحجز" : "Continue to booking"}</Link></div></article>;
}

function checkoutHref(code: string, rateKey: string, stay: Stay): string {
  const query = new URLSearchParams({hotelCode: code, rateKey, arrival: stay.arrival, departure: stay.departure, adults: String(stay.adults), children: String(stay.children)});
  for (const age of stay.childrenAges ?? []) query.append("childrenAge", String(age));
  return `/hotelbeds-checkout?${query.toString()}`;
}

function stayQuery(stay: Stay): string {
  const query = new URLSearchParams({arrival: stay.arrival, departure: stay.departure, adults: String(stay.adults), children: String(stay.children)});
  for (const age of stay.childrenAges ?? []) query.append("childrenAge", String(age));
  return query.toString();
}
