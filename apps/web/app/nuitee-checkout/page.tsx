import Link from "next/link";
import {LockKeyhole,RefreshCw,ShieldCheck} from "lucide-react";
import {getNuiteeHotelDetails,NuiteeApiError,prebookNuitee,type NuiteeHotelDetails,type NuiteePrebook} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {NuiteeCheckoutFlow} from "./checkout-flow";

type SearchParams=Record<string,string|string[]|undefined>;
type PrebookIssue="payment"|"rate"|"invalid"|"temporary"|null;
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
  let prebook:NuiteePrebook|null=null;
  let hotel:NuiteeHotelDetails|null=null;
  let prebookIssue:PrebookIssue=null;
  const valid=Boolean(hotelId&&offerId&&/^\d{4}-\d{2}-\d{2}$/.test(arrival)&&/^\d{4}-\d{2}-\d{2}$/.test(departure));
  if(valid){
    const hotelInput={destination:"Nuitee",arrival,departure,adults,children,...(childrenAges.length?{childrenAges}:{}),...(market.countryCode?{guestNationality:market.countryCode}:{}),currency:"JOD",maxRatesPerHotel:20} as const;
    const [prebookResult,hotelResult]=await Promise.allSettled([prebookNuitee(offerId),getNuiteeHotelDetails(hotelId,hotelInput)]);
    if(hotelResult.status==="fulfilled")hotel=hotelResult.value;
    else console.error("Nuitee checkout hotel refresh failed",hotelResult.reason);
    if(prebookResult.status==="fulfilled"){
      const candidate=prebookResult.value;
      if((!candidate.hotelId||candidate.hotelId===hotelId)&&candidate.transactionId&&candidate.secretKey)prebook=candidate;
      else prebookIssue="temporary";
    }else{
      prebookIssue=classifyPrebookIssue(prebookResult.reason);
      console.error("Nuitee checkout prebook failed",prebookResult.reason);
    }
  }else prebookIssue="invalid";
  const ar=market.locale==="ar";
  const hotelLink=hotelId?hotelHref({hotelId,arrival,departure,adults,children,childrenAges}):"/search";
  const retryLink=valid?checkoutHref({hotelId,offerId,arrival,departure,adults,children,childrenAges}):hotelLink;
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader minimal/><section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Nuitee Connect</span><h1>{ar?"راجع السعر وادفع بأمان":"Review the rate and pay securely"}</h1><p>{ar?"يتم تثبيت السعر عبر Prebook، ثم معالجة الدفع من خلال Nuitee Payment SDK قبل تأكيد الفندق.":"The rate is locked with Prebook, then Nuitee Payment SDK processes payment before the hotel booking is finalized."}</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>{ar?"مفتاح API يبقى على الخادم":"API key stays server-side"}</span><span><ShieldCheck size={18}/>{ar?"الدفع قبل الحجز النهائي":"Payment before final booking"}</span></div></div></section><section className="shell checkoutSection">{!prebook||!hotel||!prebook.transactionId||!prebook.secretKey?<CheckoutRecovery ar={ar} issue={prebookIssue} retryLink={retryLink} hotelLink={hotelLink}/>:<NuiteeCheckoutFlow prebookId={prebook.prebookId} transactionId={prebook.transactionId} secretKey={prebook.secretKey} hotelName={hotel.name} roomName={prebook.roomName} boardName={prebook.boardName} arrival={arrival} departure={departure} price={prebook.price} sourceCurrency={prebook.currency} locale={market.locale} currency={market.currency} sandbox={prebook.sandbox}/>}</section></main>;
}

function CheckoutRecovery({ar,issue,retryLink,hotelLink}:{ar:boolean;issue:PrebookIssue;retryLink:string;hotelLink:string}){
  const payment=issue==="payment";
  const rate=issue==="rate"||issue==="invalid";
  const title=payment?(ar?"تعذر بدء الدفع من Nuitee":"Nuitee could not start the payment session"):rate?(ar?"تم تحديث السعر أو العرض":"The rate or offer has changed"):(ar?"تعذر تثبيت السعر مؤقتًا":"The rate could not be locked right now");
  const copy=payment?(ar?"السعر وصل إلى مرحلة Prebook، لكن Nuitee لم يتمكن من إنشاء جلسة الدفع. لم يتم خصم أي مبلغ ولم يتم إنشاء حجز. يمكنك إعادة المحاولة أو الرجوع إلى أحدث الغرف.":"The rate reached Prebook, but Nuitee could not create the payment session. No charge or booking was created. Retry or return to the refreshed rooms."):rate?(ar?"لن نختار سعرًا مختلفًا تلقائيًا. اعرض أحدث الغرف واختر العرض المناسب من جديد.":"HandMeKey will not silently switch your rate. View the refreshed rooms and choose the offer you want."):(ar?"لم يتم إنشاء حجز. أعد المحاولة أو اعرض أحدث الغرف لنفس الفندق.":"No booking was created. Retry or view the latest rooms for this hotel.");
  return <div className="premiumEmpty"><h3>{title}</h3><p>{copy}</p>{!rate&&<Link className="resultCta" href={retryLink}><RefreshCw size={15}/>{ar?"إعادة المحاولة":"Retry"}</Link>}<Link className="resultCta" href={hotelLink}>{ar?"عرض أحدث الغرف":"View refreshed rooms"}</Link></div>;
}

function classifyPrebookIssue(error:unknown):PrebookIssue{
  if(!(error instanceof NuiteeApiError))return "temporary";
  const detail=`${error.description??""} ${error.providerMessage??""}`.toLowerCase();
  if(error.code===5000&&detail.includes("payment"))return "payment";
  if(error.code===2001||error.status===409)return "rate";
  if(error.code===4002)return "invalid";
  return error.status>=500?"temporary":"rate";
}
function checkoutHref(input:{hotelId:string;offerId:string;arrival:string;departure:string;adults:number;children:number;childrenAges:number[]}):string{const query=new URLSearchParams({hotelId:input.hotelId,offerId:input.offerId,arrival:input.arrival,departure:input.departure,adults:String(input.adults),children:String(input.children)});for(const age of input.childrenAges)query.append("childrenAge",String(age));return `/nuitee-checkout?${query.toString()}`;}
function hotelHref(input:{hotelId:string;arrival:string;departure:string;adults:number;children:number;childrenAges:number[]}):string{const query=new URLSearchParams({arrival:input.arrival,departure:input.departure,adults:String(input.adults),children:String(input.children)});for(const age of input.childrenAges)query.append("childrenAge",String(age));return `/hotel/nuitee-${encodeURIComponent(input.hotelId)}?${query.toString()}#room-offers`;}
function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const list=value?(Array.isArray(value)?value:[value]):[];return list.map((item)=>item.trim()).filter(Boolean);}
function positiveInt(value:string|undefined,fallback:number){const parsed=Number.parseInt(value??"",10);return Number.isFinite(parsed)&&parsed>=0?parsed:fallback;}
