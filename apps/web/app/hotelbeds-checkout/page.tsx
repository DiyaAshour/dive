import Link from "next/link";
import {LockKeyhole, ShieldCheck} from "lucide-react";
import {checkHotelbedsRate, createHotelbedsCheckoutToken, extractHotelbedsRateComments, getCachedHotelbedsRateComments, getHotelbedsContentHotel, paymentCapabilities, readHotelbedsCheckoutToken, type HotelbedsCheckoutHotel, type HotelbedsHotelDetails, type HotelbedsOffer} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {HotelbedsCheckoutFlow} from "./checkout-flow";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HotelbedsCheckoutPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const [query,market] = await Promise.all([searchParams,requestGuestMarket()]);
  const snapshot = readHotelbedsCheckoutToken(first(query.quote));
  const onlinePaymentAvailable = paymentCapabilities().onlinePaymentAvailable;
  let hotel: HotelbedsHotelDetails | null = snapshot ? hotelFromSnapshot(snapshot.hotel, snapshot.offer) : null;
  let offer: HotelbedsOffer | null = snapshot?.offer ?? null;
  let rateComments: string | null = snapshot?.rateComments ?? null;
  let checkoutQuote: string | null = null;

  if (snapshot && hotel && offer) {
    try {
      const catalogHotel = await getHotelbedsContentHotel(snapshot.hotel.providerHotelCode).catch(() => null);
      hotel = mergeCatalogHotel(hotel, catalogHotel);
      const initialRateType = offer.rateType.trim().toUpperCase();
      if (initialRateType === "RECHECK") {
        const checked = await checkHotelbedsRate(offer.rateKey, stayNights(snapshot.stay.arrival, snapshot.stay.departure), snapshot.hotel.providerHotelCode);
        if (!checked || checked.offer.rateType.trim().toUpperCase() !== "BOOKABLE") {
          hotel = null;
          offer = null;
        } else {
          rateComments = extractHotelbedsRateComments(checked.raw) ?? rateComments;
          offer = checked.offer;
          hotel = mergeCatalogHotel(hotelFromSnapshot({...snapshot.hotel, ...checked.hotel}, checked.offer), catalogHotel);
          if (!hotel.address) throw new Error("Hotelbeds hotel address is not cached yet");
          checkoutQuote = createHotelbedsCheckoutToken({hotel: snapshotHotel(hotel), offer, stay: snapshot.stay, checked: true, sourceRateType: "RECHECK", rateComments});
        }
      } else if (initialRateType === "BOOKABLE") {
        if (!rateComments && offer.rateCommentsId) rateComments = await getCachedHotelbedsRateComments(offer.rateCommentsId, snapshot.stay.arrival);
        if (!hotel.address) throw new Error("Hotelbeds hotel address is not cached yet");
        checkoutQuote = createHotelbedsCheckoutToken({hotel: snapshotHotel(hotel), offer, stay: snapshot.stay, checked: false, sourceRateType: "BOOKABLE", rateComments});
      } else {
        hotel = null;
        offer = null;
      }
    } catch (error) {
      console.error("Hotelbeds checkout preparation failed", error);
      hotel = null;
      offer = null;
      checkoutQuote = null;
    }
  }

  const ar = market.locale === "ar";
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader minimal/>
    <section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Hotelbeds API booking</span><h1>{ar ? "راجع سعر المزود المباشر" : "Review the live provider rate"}</h1><p>{ar ? "نتبع مسار Hotelbeds: Availability ثم CheckRate فقط إذا كان السعر RECHECK ثم Booking." : "HandMeKey follows the Hotelbeds flow: Availability, CheckRate only for RECHECK, then Booking."}</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>{ar ? "السعر محفوظ بتوقيع خادم" : "Provider quote signed server-side"}</span><span><ShieldCheck size={18}/>{ar ? "لا نكرر Availability هنا" : "Availability is not repeated here"}</span></div></div></section>
    <section className="shell checkoutSection">
      {!snapshot || !hotel || !offer || !checkoutQuote ? <div className="premiumEmpty"><h3>{ar ? "سعر Hotelbeds لم يعد متاحًا" : "This Hotelbeds rate is no longer available"}</h3><p>{ar ? "ارجع إلى البحث واختر سعرًا مباشرًا جديدًا. قد تكون بيانات الفندق الثابتة قيد المزامنة أو يكون حد الاختبار مستهلكًا." : "Return to search and select a fresh provider rate. The hotel content catalogue may still be syncing or the evaluation quota may be exhausted."}</p><Link href="/search" className="resultCta">{ar ? "العودة إلى البحث" : "Return to search"}</Link></div> : <HotelbedsCheckoutFlow hotel={hotel} offer={offer} arrival={snapshot.stay.arrival} departure={snapshot.stay.departure} adults={snapshot.stay.adults} children={snapshot.stay.children} childrenAges={snapshot.stay.childrenAges} locale={market.locale} currency={market.currency} onlinePaymentAvailable={onlinePaymentAvailable} checkoutQuote={checkoutQuote} rateComments={rateComments}/>} 
    </section>
  </main>;
}

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
function stayNights(arrival: string, departure: string): number { return Math.max(1, Math.round((Date.parse(`${departure}T00:00:00.000Z`) - Date.parse(`${arrival}T00:00:00.000Z`)) / 86_400_000)); }
function snapshotHotel(hotel: HotelbedsHotelDetails): HotelbedsCheckoutHotel { return {providerHotelCode: hotel.providerHotelCode, name: hotel.name, city: hotel.city, countryCode: hotel.countryCode, area: hotel.area, address: hotel.address, starRating: hotel.starRating}; }
function hotelFromSnapshot(summary: HotelbedsCheckoutHotel, offer: HotelbedsOffer): HotelbedsHotelDetails {
  return {id:`hotelbeds:${summary.providerHotelCode}`,slug:`hotelbeds-${summary.providerHotelCode}`,source:"HOTELBEDS_API",providerHotelCode:summary.providerHotelCode,name:summary.name,city:summary.city,countryCode:summary.countryCode,area:summary.area,address:summary.address,description:null,starRating:summary.starRating,currency:offer.currency,coverPhoto:null,photos:[],amenities:[],reviewSummary:{count:0,overall:null},offers:[offer]};
}
function mergeCatalogHotel(hotel: HotelbedsHotelDetails, catalog: Awaited<ReturnType<typeof getHotelbedsContentHotel>>): HotelbedsHotelDetails {
  if (!catalog) return hotel;
  return {
    ...hotel,
    name: catalog.name || hotel.name,
    city: catalog.destinationName ?? hotel.city,
    countryCode: catalog.countryCode ?? hotel.countryCode,
    area: catalog.zoneName ?? hotel.area,
    address: catalog.address ?? hotel.address,
    description: catalog.description ?? hotel.description,
    starRating: categoryStars(catalog.categoryCode) ?? hotel.starRating,
  };
}
function categoryStars(value: string | null): number | null { const parsed = Number.parseInt(value ?? "",10); return Number.isFinite(parsed)&&parsed>=1&&parsed<=5?parsed:null; }
