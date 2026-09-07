import Link from "next/link";
import {BadgeCheck, ChevronLeft, MapPin, ShieldCheck, Star} from "lucide-react";
import type {NuiteeHotelDetails} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency,GuestLocale} from "@/lib/guest-market";

type Stay=Readonly<{arrival:string;departure:string;adults:number;children:number;childrenAges?:readonly number[]}>;
type Market=Readonly<{locale:GuestLocale;currency:GuestCurrency;intlLocale:string;direction:"ltr"|"rtl"}>;

export function NuiteeHotelPage({hotel,stay,market}:Readonly<{hotel:NuiteeHotelDetails;stay:Stay;market:Market}>) {
  const ar=market.locale==="ar";
  const cheapest=hotel.offers[0]??null;
  return <main className="hotelExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="shell hotelDetailSection">
      <Link className="backLink" href={`/search?destination=${encodeURIComponent(hotel.city)}&${stayQuery(stay)}`}><ChevronLeft size={16}/>{ar?"العودة إلى البحث":"Back to search"}</Link>
      <div className="premiumHotelHead"><div><div className="hotelBadges"><span><BadgeCheck size={14}/>Nuitee Connect</span>{hotel.sandbox&&<span>Sandbox</span>}{hotel.starRating&&<span><Star size={14} fill="currentColor"/>{hotel.starRating}★</span>}</div><h1>{hotel.name}</h1><p><MapPin size={16}/>{hotel.area?`${hotel.area}, `:""}{hotel.city}{hotel.address?` · ${hotel.address}`:""}</p></div></div>
      {hotel.photos.length?<div className="premiumGallery">{hotel.photos.slice(0,5).map((photo,index)=><img className={`galleryPhoto${index+1}`} key={photo.url} src={photo.url} alt={photo.alt||hotel.name}/>)}</div>:null}
      <div className="hotelTrustBar"><span><ShieldCheck size={17}/>{ar?"توافر مباشر":"Live availability"}</span><span><BadgeCheck size={17}/>{ar?"تأكيد السعر عبر Prebook":"Price confirmed by prebook"}</span></div>
      {hotel.description&&<div className="hotelAbout"><span className="eyebrow">{ar?"الفندق":"Property"}</span><h2>{hotel.name}</h2><p>{hotel.description}</p></div>}
      <div className="rateSectionHead"><div><span className="eyebrow">Nuitee Connect</span><h2>{hotel.offers.length} {ar?"سعر متاح":"live rates"}</h2><p>{stay.arrival} → {stay.departure}</p></div>{cheapest&&<div><span>{ar?"ابتداءً من":"From"}</span><strong>{guestMoney(cheapest.total,cheapest.currency,market.currency,market.locale).text}</strong><small>{ar?"إجمالي الإقامة":"stay total"}</small></div>}</div>
      <div className="rateCards">{hotel.offers.map((offer)=>{const total=guestMoney(offer.total,offer.currency,market.currency,market.locale);const average=guestMoney(offer.averageNightlyTotal,offer.currency,market.currency,market.locale);return <article className="rateCard" key={offer.offerId}><div className="rateRoom"><span>{ar?"الغرفة":"Room"}</span><h3>{offer.roomName}</h3></div><div className="ratePackage"><span>{ar?"الباقة":"Board"}</span><h3>{offer.boardName??offer.boardCode??"Provider rate"}</h3><p>{ar?"الدفع الإلكتروني":"Pay now"}</p></div><div className="ratePolicy"><span>{ar?"الإلغاء":"Cancellation"}</span><h3>{offer.cancellationPolicy.name}</h3></div><div className="ratePrice"><span>{ar?"الإجمالي":"Total"}</span><strong>{total.text}</strong><small>{average.text} {ar?"متوسط الليلة":"average / night"}</small><Link className="bookRateButton" href={checkoutHref(hotel.providerHotelCode,offer.offerId,stay)}>{ar?"متابعة الحجز":"Continue to booking"}</Link></div></article>;})}</div>
    </section>
  </main>;
}

function checkoutHref(hotelId:string,offerId:string,stay:Stay){const q=new URLSearchParams({hotelId,offerId,arrival:stay.arrival,departure:stay.departure,adults:String(stay.adults),children:String(stay.children)});for(const age of stay.childrenAges??[])q.append("childrenAge",String(age));return `/nuitee-checkout?${q.toString()}`;}
function stayQuery(stay:Stay){const q=new URLSearchParams({arrival:stay.arrival,departure:stay.departure,adults:String(stay.adults),children:String(stay.children)});for(const age of stay.childrenAges??[])q.append("childrenAge",String(age));return q.toString();}
