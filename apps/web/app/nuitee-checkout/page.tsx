import Link from "next/link";
import {LockKeyhole,ShieldCheck} from "lucide-react";
import {getNuiteeHotelDetails,NUITEE_PAYMENT_CURRENCY,type NuiteeHotelDetails} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {currentUser} from "@/lib/server-session";
import {NuiteeCheckoutFlow} from "./checkout-flow";

type SearchParams=Record<string,string|string[]|undefined>;
export const metadata={robots:{index:false,follow:false}};

export default async function NuiteeCheckoutPage({searchParams}:{searchParams:Promise<SearchParams>}){
  const [query,market,user]=await Promise.all([searchParams,requestGuestMarket(),currentUser()]);
  const hotelId=first(query.hotelId)?.trim()??"";
  const offerId=first(query.offerId)?.trim()??"";
  const rateId=first(query.rateId)?.trim()??"";
  const mappedRoomId=first(query.mappedRoomId)?.trim()??"";
  const roomName=first(query.roomName)?.trim()??"";
  const boardCode=first(query.boardCode)?.trim()??"";
  const boardName=first(query.boardName)?.trim()??"";
  const policyName=first(query.policyName)?.trim()??"";
  const selectedCurrency=(first(query.currency)?.trim()??NUITEE_PAYMENT_CURRENCY).toUpperCase();
  const selectedTotal=money(first(query.total));
  const freeCancellation=first(query.freeCancellation)==="1";
  const arrival=first(query.arrival)?.trim()??"";
  const departure=first(query.departure)?.trim()??"";
  const adults=positiveInt(first(query.adults),2);
  const children=positiveInt(first(query.children),0);
  const childrenAges=values(query.childrenAge).map((value)=>Number.parseInt(value,10)).filter((value)=>Number.isFinite(value));
  const valid=Boolean(hotelId&&offerId&&roomName&&selectedTotal!==null&&selectedCurrency&&/^\d{4}-\d{2}-\d{2}$/.test(arrival)&&/^\d{4}-\d{2}-\d{2}$/.test(departure)&&Date.parse(`${departure}T00:00:00Z`)>Date.parse(`${arrival}T00:00:00Z`)&&adults>0&&(children===0||childrenAges.length===children));
  let hotel:NuiteeHotelDetails|null=null;
  if(valid){
    try{
      hotel=await getNuiteeHotelDetails(hotelId,{destination:"Nuitee",arrival,departure,adults,children,...(childrenAges.length?{childrenAges}:{}),...(market.countryCode?{guestNationality:market.countryCode}:{}),currency:selectedCurrency});
    }catch(error){console.error("Nuitee checkout hotel refresh failed",error);}
  }
  const ar=market.locale==="ar";
  const hotelLink=hotelId?hotelHref({hotelId,arrival,departure,adults,children,childrenAges}):"/search";
  const account=accountGuest(user);
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader minimal/><section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Nuitee Connect</span><h1>{ar?"راجع إقامتك وادفع بأمان":"Review your stay and pay securely"}</h1><p>{ar?"عند المتابعة، يعيد HandMeKey البحث عن نفس الغرفة والسعر مباشرة من Nuitee ويستخدم offerId حديثًا قبل إنشاء Prebook.":"When you continue, HandMeKey rechecks the exact room and price with Nuitee and uses a fresh offerId before creating the prebook."}</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>{ar?"مفتاح API يبقى على الخادم":"API key stays server-side"}</span><span><ShieldCheck size={18}/>{ar?"السعر يعاد تأكيده قبل الدفع":"Rate revalidated before payment"}</span></div></div></section><section className="shell checkoutSection">{valid&&hotel?<NuiteeCheckoutFlow hotelId={hotelId} offerId={offerId} rateId={rateId} mappedRoomId={mappedRoomId} roomName={roomName} boardCode={boardCode} boardName={boardName} policyName={policyName} selectedTotal={selectedTotal!} selectedCurrency={selectedCurrency} freeCancellation={freeCancellation} hotelName={hotel.name} city={hotel.city} arrival={arrival} departure={departure} adults={adults} children={children} childrenAges={childrenAges} guestNationality={market.countryCode||"JO"} locale={market.locale} currency={market.currency} refreshHref={hotelLink} initialFirstName={account.firstName} initialLastName={account.lastName} initialEmail={account.email} accountPrefilled={Boolean(user)}/>:<CheckoutRecovery ar={ar} hotelLink={hotelLink} invalid={!valid}/>}</section></main>;
}

function accountGuest(user:{displayName:string;email:string}|null){
  if(!user)return {firstName:"",lastName:"",email:""};
  const parts=user.displayName.trim().split(/\s+/).filter(Boolean);
  const firstName=parts.shift()??"";
  const lastName=parts.join(" ");
  return {firstName,lastName,email:user.email.trim()};
}
function CheckoutRecovery({ar,hotelLink,invalid}:{ar:boolean;hotelLink:string;invalid:boolean}){
  const title=invalid?(ar?"اختيار الحجز غير مكتمل":"The booking selection is incomplete"):(ar?"تعذر تحديث بيانات الفندق":"Hotel details could not be refreshed");
  const copy=invalid?(ar?"ارجع إلى الفندق واختر غرفة وسعرًا من جديد.":"Return to the hotel and choose a room and rate again."):(ar?"لم يتم إنشاء Prebook ولم يتم بدء أي دفعة. اعرض أحدث الغرف وحاول من جديد.":"No prebook or payment was started. View the latest rooms and try again.");
  return <div className="premiumEmpty"><h3>{title}</h3><p>{copy}</p><Link className="resultCta" href={hotelLink}>{ar?"عرض أحدث الغرف":"View refreshed rooms"}</Link></div>;
}
function hotelHref(input:{hotelId:string;arrival:string;departure:string;adults:number;children:number;childrenAges:number[]}):string{const query=new URLSearchParams({arrival:input.arrival,departure:input.departure,adults:String(input.adults),children:String(input.children)});for(const age of input.childrenAges)query.append("childrenAge",String(age));return `/hotel/nuitee-${encodeURIComponent(input.hotelId)}?${query.toString()}#room-offers`;}
function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const list=value?(Array.isArray(value)?value:[value]):[];return list.map((item)=>item.trim()).filter(Boolean);}
function positiveInt(value:string|undefined,fallback:number){const parsed=Number.parseInt(value??"",10);return Number.isFinite(parsed)&&parsed>=0?parsed:fallback;}
function money(value:string|undefined):number|null{if(!value)return null;const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=0?parsed:null;}
