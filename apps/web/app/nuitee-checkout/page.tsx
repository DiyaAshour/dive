import Link from "next/link";
import {LockKeyhole,ShieldCheck} from "lucide-react";
import {getNuiteeHotelDetails,prebookNuitee} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {NuiteeCheckoutFlow} from "./checkout-flow";

type SearchParams=Record<string,string|string[]|undefined>;
export const metadata={robots:{index:false,follow:false}};

export default async function NuiteeCheckoutPage({searchParams}:{searchParams:Promise<SearchParams>}){
  const [query,market]=await Promise.all([searchParams,requestGuestMarket()]);
  const hotelId=first(query.hotelId)?.trim()??"";
  const offerId=first(query.offerId)?.trim()??"";
  const arrival=first(query.arrival)?.trim()??"";
  const departure=first(query.departure)?.trim()??"";
  const adults=positiveInt(first(query.adults),2);
  const children=positiveInt(first(query.children),0);
  const childrenAges=values(query.childrenAge).map((value)=>Number.parseInt(value,10)).filter((value)=>Number.isFinite(value));
  let prebook=null;
  let hotel=null;
  if(hotelId&&offerId&&/^\d{4}-\d{2}-\d{2}$/.test(arrival)&&/^\d{4}-\d{2}-\d{2}$/.test(departure)){
    try{
      [prebook,hotel]=await Promise.all([
        prebookNuitee(offerId),
        getNuiteeHotelDetails(hotelId,{destination:"Nuitee",arrival,departure,adults,children,...(childrenAges.length?{childrenAges}:{}),...(market.countryCode?{guestNationality:market.countryCode}:{}),currency:"JOD",maxRatesPerHotel:20}),
      ]);
      if(prebook.hotelId&&prebook.hotelId!==hotelId)prebook=null;
      if(prebook&&(!prebook.transactionId||!prebook.secretKey))prebook=null;
    }catch(error){console.error("Nuitee checkout preparation failed",error);prebook=null;hotel=null;}
  }
  const ar=market.locale==="ar";
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader minimal/><section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Nuitee Connect</span><h1>{ar?"راجع السعر وادفع بأمان":"Review the rate and pay securely"}</h1><p>{ar?"يتم تثبيت السعر عبر Prebook، ثم معالجة الدفع من خلال Nuitee Payment SDK قبل تأكيد الفندق.":"The rate is locked with Prebook, then Nuitee Payment SDK processes payment before the hotel booking is finalized."}</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>{ar?"مفتاح API يبقى على الخادم":"API key stays server-side"}</span><span><ShieldCheck size={18}/>{ar?"الدفع قبل الحجز النهائي":"Payment before final booking"}</span></div></div></section><section className="shell checkoutSection">{!prebook||!hotel||!prebook.transactionId||!prebook.secretKey?<div className="premiumEmpty"><h3>{ar?"السعر لم يعد متاحاً":"This Nuitee offer is no longer available"}</h3><p>{ar?"ارجع إلى البحث واختر سعراً جديداً.":"Return to search and choose a fresh supplier rate."}</p><Link className="resultCta" href="/search">{ar?"العودة إلى البحث":"Return to search"}</Link></div>:<NuiteeCheckoutFlow prebookId={prebook.prebookId} transactionId={prebook.transactionId} secretKey={prebook.secretKey} hotelName={hotel.name} roomName={prebook.roomName} boardName={prebook.boardName} arrival={arrival} departure={departure} price={prebook.price} sourceCurrency={prebook.currency} locale={market.locale} currency={market.currency} sandbox={prebook.sandbox}/>}</section></main>;
}

function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const list=value?(Array.isArray(value)?value:[value]):[];return list.map((item)=>item.trim()).filter(Boolean);}
function positiveInt(value:string|undefined,fallback:number){const parsed=Number.parseInt(value??"",10);return Number.isFinite(parsed)&&parsed>=0?parsed:fallback;}
