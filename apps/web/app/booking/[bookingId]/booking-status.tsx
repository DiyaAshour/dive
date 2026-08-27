"use client";

import { useEffect, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

type StayPhase = "HOLD" | "UPCOMING" | "ARRIVAL_DAY" | "IN_STAY" | "COMPLETED" | "CLOSED";
type CancellationRule = {minimumDaysBeforeArrival:number;penaltyType:string;penaltyValue?:number|null};
type CancellationPolicy = {name:string;rules:CancellationRule[];noShowPenaltyType:string;noShowPenaltyValue?:number|null};
type CurrentCancellation = {policy:CancellationPolicy;penaltyAmount:number;refundableAmount:number;alreadyCancelled:boolean;daysBeforeArrival?:number;penaltyType?:string}|null;

type Booking = {
  id:string;
  reference:string;
  status:string;
  paymentState:string;
  paymentMode:string;
  currency:string;
  hotel:{id:string;name:string;city:string;countryCode:string;address:string;checkInTime:string|null;checkOutTime:string|null;timezone:string};
  roomType:{id:string;name:string};
  ratePlan:{id:string;name:string};
  occupancy:{adults:number;children:number};
  arrival:string;
  departure:string;
  nights:Array<{date:string;base:number;service:number;tax:number;total:number}>;
  amounts:{base:number;service:number;tax:number;total:number};
  holdExpiresAt:string|null;
  confirmedAt:string|null;
  cancelledAt:string|null;
  account:{linked:boolean};
  arrivalInfo:{expectedArrivalTime:string|null;status:string};
  today:string;
  stayPhase:StayPhase;
  cancellation:{policy:CancellationPolicy;penaltyAmount:number;refundableAmount:number|null;current:CurrentCancellation};
  wallet?:{appliedAmount:number;remainingAmount:number};
};

type Props={bookingId:string;locale:Locale};

export function BookingStatus({bookingId,locale}:Props) {
  const [booking,setBooking] = useState<Booking|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const ar=locale==="ar";

  useEffect(()=>{
    const token = sessionStorage.getItem(`booking-token:${bookingId}`);
    fetch(`/api/v1/bookings/${bookingId}`, {headers:token?{"x-booking-token":token}:{},cache:"no-store"})
      .then(async(response)=>{const body=await response.json();if(!response.ok||body.error)throw new Error(body.error?.message||(ar?"تعذر تحميل الحجز":"Unable to load booking"));return body.data as Booking;})
      .then(setBooking)
      .catch((cause)=>setError(cause instanceof Error?cause.message:(ar?"تعذر تحميل الحجز":"Unable to load booking")))
      .finally(()=>setLoading(false));
  },[bookingId,ar]);

  if(loading) return <div className="bookingCenterLoading"><span className="bookingLoadingPulse"/><div><strong>{ar?"جارٍ تجهيز تفاصيل حجزك…":"Preparing your booking…"}</strong><p>{ar?"نراجع حالة الإقامة والدفع والإلغاء الحالية.":"Checking the current stay, payment and cancellation status."}</p></div></div>;
  if(error) return <div className="bookingCenterError"><h3>{ar?"يلزم الوصول إلى الحجز":"Booking access required"}</h3><p>{error}</p><span>{ar?"افتح الصفحة من المتصفح الذي أنشأ الحجز أو سجّل الدخول إلى الحساب المرتبط به.":"Open this page from the browser used to create the booking, or sign in to the account that owns it."}</span></div>;
  if(!booking) return null;

  const walletApplied = booking.wallet?.appliedAmount ?? 0;
  const remaining = booking.wallet?.remainingAmount ?? booking.amounts.total;
  const nights = booking.nights.length || nightsBetween(booking.arrival,booking.departure);
  const phase = phaseCopy(booking.stayPhase,locale);
  const currentCancellation = booking.cancellation.current;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.hotel.name}, ${booking.hotel.address}, ${booking.hotel.city}`)}`;
  const isCompleted = booking.stayPhase === "COMPLETED";
  const showArrivalAnchor = booking.stayPhase === "UPCOMING" || booking.stayPhase === "ARRIVAL_DAY" || booking.stayPhase === "HOLD";

  return <div className="bookingCenterSummary">
    <section className="bookingHeroCard">
      <div className="bookingHeroTopline">
        <span className={`bookingStateBadge ${booking.status.toLowerCase()}`}><CheckCircle2 size={14}/>{statusLabel(booking.status,locale)}</span>
        <span className="bookingReference">{ar?"رقم الحجز":"Booking"} · {booking.reference}</span>
      </div>

      <div className="bookingHeroHeadline">
        <span className="bookingPhaseEyebrow">{phase.eyebrow}</span>
        <h2>{phase.title}</h2>
        <p>{phase.body}</p>
      </div>

      <div className="bookingPropertyBlock">
        <div>
          <span className="bookingPropertyLabel">{ar?"إقامتك":"Your stay"}</span>
          <h1>{booking.hotel.name}</h1>
          <p><BedDouble size={16}/>{booking.roomType.name} · {booking.ratePlan.name}</p>
          <p><MapPin size={16}/>{booking.hotel.address}, {booking.hotel.city}</p>
        </div>
        {booking.arrivalInfo.expectedArrivalTime && <span className="bookingArrivalSaved"><Clock3 size={15}/>{ar?"وصول متوقع":"Expected arrival"}: {formatClock(booking.arrivalInfo.expectedArrivalTime,locale)}</span>}
      </div>

      <div className="bookingStayFacts">
        <article><span><CalendarDays size={18}/></span><div><small>{ar?"الإقامة":"Stay dates"}</small><strong>{formatStayDate(booking.arrival,locale)} → {formatStayDate(booking.departure,locale)}</strong><em>{nights} {ar?(nights===1?"ليلة":"ليالٍ"):`night${nights===1?"":"s"}`}</em></div></article>
        <article><span><UsersRound size={18}/></span><div><small>{ar?"الضيوف":"Guests"}</small><strong>{guestLabel(booking.occupancy,locale)}</strong><em>{ar?"حسب الحجز المؤكد":"Confirmed occupancy"}</em></div></article>
        <article><span><Clock3 size={18}/></span><div><small>{ar?"تسجيل الوصول":"Check-in"}</small><strong>{booking.hotel.checkInTime?formatClock(booking.hotel.checkInTime,locale):(ar?"حسب الفندق":"Property time")}</strong><em>{formatStayDate(booking.arrival,locale)}</em></div></article>
        <article><span><Clock3 size={18}/></span><div><small>{ar?"تسجيل المغادرة":"Check-out"}</small><strong>{booking.hotel.checkOutTime?formatClock(booking.hotel.checkOutTime,locale):(ar?"حسب الفندق":"Property time")}</strong><em>{formatStayDate(booking.departure,locale)}</em></div></article>
      </div>

      <div className="bookingQuickActions">
        <a href={`/hotel/${booking.hotel.id}`}><ExternalLink size={15}/>{isCompleted?(ar?"احجز مرة أخرى":"Book again"):(ar?"عرض الفندق":"View property")}</a>
        <a href={mapHref} target="_blank" rel="noreferrer"><MapPin size={15}/>{ar?"الاتجاهات":"Directions"}</a>
        <a href="#messages"><MessageSquareText size={15}/>{ar?"راسل الفندق":"Message hotel"}</a>
        {showArrivalAnchor && <a href="#arrival"><Clock3 size={15}/>{ar?"وقت الوصول":"Arrival time"}</a>}
      </div>

      <CancellationState booking={booking} current={currentCancellation} locale={locale}/>
    </section>

    <aside className="bookingPaymentCard">
      <div className="bookingPaymentHead"><span><CreditCard size={18}/></span><div><small>{ar?"الدفع والحساب":"Payment & total"}</small><strong>{paymentHeadline(booking,walletApplied,remaining,locale)}</strong></div></div>

      <div className="bookingPaymentPrimary">
        <span>{primaryPaymentLabel(booking,walletApplied,remaining,locale)}</span>
        <strong>{money(primaryPaymentAmount(booking,walletApplied,remaining),booking.currency)}</strong>
        <small>{paymentSubline(booking,walletApplied,remaining,locale)}</small>
      </div>

      <div className="bookingPriceBreakdown">
        <div><span>{ar?"سعر الغرفة":"Room base"}</span><strong>{money(booking.amounts.base,booking.currency)}</strong></div>
        <div><span>{ar?"رسوم الخدمة":"Employee service"}</span><strong>{money(booking.amounts.service,booking.currency)}</strong></div>
        <div><span>{ar?"الضريبة / الرسوم":"Tax / charges"}</span><strong>{money(booking.amounts.tax,booking.currency)}</strong></div>
        <div className="total"><span>{ar?"إجمالي الحجز":"Booking total"}</span><strong>{money(booking.amounts.total,booking.currency)}</strong></div>
        {walletApplied > 0 && <div className="wallet"><span><WalletCards size={14}/> HandMeKey Wallet</span><strong>-{money(walletApplied,booking.currency)}</strong></div>}
        {walletApplied > 0 && <div className="due"><span>{booking.paymentMode==="PAY_AT_HOTEL"?(ar?"المتبقي في الفندق":"Due at hotel"):(ar?"المتبقي":"Remaining")}</span><strong>{money(remaining,booking.currency)}</strong></div>}
      </div>

      <div className="bookingPaymentTrust"><ShieldCheck size={16}/><span>{paymentTrustLine(booking,walletApplied,remaining,locale)}</span></div>
    </aside>
  </div>;
}

function CancellationState({booking,current,locale}:{booking:Booking;current:CurrentCancellation;locale:Locale}) {
  const ar=locale==="ar";
  if(booking.status==="CANCELLED") return <div className="bookingCancellationState closed"><span>{ar?"الحجز ملغى":"Booking cancelled"}</span><strong>{ar?"تم تطبيق نتيجة الإلغاء على هذا الحجز.":"The cancellation outcome has already been applied to this booking."}</strong></div>;
  if(!current || booking.stayPhase==="COMPLETED" || booking.stayPhase==="CLOSED") return <div className="bookingCancellationState neutral"><span>{ar?"سياسة الإلغاء":"Cancellation policy"}</span><strong>{booking.cancellation.policy.name}</strong></div>;
  const free=current.penaltyAmount<=0;
  return <div className={`bookingCancellationState ${free?"free":"penalty"}`}>
    <span>{ar?"حالة الإلغاء الآن":"Cancellation right now"}</span>
    <strong>{free
      ? (ar?"الإلغاء متاح الآن بدون رسوم.":"Cancellation is currently free.")
      : (ar?`الإلغاء الآن يترتب عليه ${money(current.penaltyAmount,booking.currency)}.`:`Cancelling now carries a ${money(current.penaltyAmount,booking.currency)} penalty.`)}</strong>
    <small>{free
      ? booking.cancellation.policy.name
      : booking.paymentMode==="PAY_AT_HOTEL"
        ? (ar?"هذه هي رسوم الإلغاء الحالية حسب شروط خطة السعر؛ لا تعتمد على نص نافذة الإلغاء القديمة.":"This is the current penalty under the rate plan, not the original free-cancellation headline.")
        : (ar?`المبلغ القابل للاسترداد حاليًا: ${money(current.refundableAmount,booking.currency)}.`:`Currently refundable: ${money(current.refundableAmount,booking.currency)}.`)}</small>
  </div>;
}

function phaseCopy(phase:StayPhase,locale:Locale){
  const ar=locale==="ar";
  const copy:Record<StayPhase,{eyebrow:string;title:string;body:string}> = ar ? {
    HOLD:{eyebrow:"الحجز قيد التثبيت",title:"غرفتك محفوظة مؤقتًا",body:"أكمل خطوة الدفع أو التأكيد قبل انتهاء مدة التثبيت."},
    UPCOMING:{eyebrow:"إقامة قادمة",title:"كل شيء جاهز لإقامتك القادمة",body:"راجع وقت الوصول، أرسل طلباتك وتواصل مع الفندق من نفس الصفحة."},
    ARRIVAL_DAY:{eyebrow:"اليوم هو يوم الوصول",title:"موعد تسجيل الوصول اليوم",body:"الأولوية الآن لوقت الوصول والطلبات والتواصل مع الفندق."},
    IN_STAY:{eyebrow:"إقامة جارية",title:"أنت الآن ضمن فترة الإقامة",body:"استخدم الرسائل والطلبات لأي شيء تحتاجه خلال الإقامة."},
    COMPLETED:{eyebrow:"إقامة مكتملة",title:"نتمنى أن تكون إقامتك رائعة",body:"يمكنك الآن تقييم الإقامة الموثقة أو حجز الفندق مرة أخرى."},
    CLOSED:{eyebrow:"حجز مغلق",title:"هذا الحجز لم يعد نشطًا",body:"تبقى التفاصيل والسجل متاحين للرجوع إليهما."},
  } : {
    HOLD:{eyebrow:"Reservation hold",title:"Your room is temporarily held",body:"Finish payment or confirmation before the hold expires."},
    UPCOMING:{eyebrow:"Upcoming stay",title:"Everything is ready for your upcoming stay",body:"Set your arrival time, send requests and contact the property from one place."},
    ARRIVAL_DAY:{eyebrow:"Check-in day",title:"Your check-in is today",body:"Arrival time, requests and property messaging are the priorities now."},
    IN_STAY:{eyebrow:"Stay in progress",title:"You're currently within your stay",body:"Use messages and requests for anything you need while you're at the property."},
    COMPLETED:{eyebrow:"Stay completed",title:"We hope you had a great stay",body:"You can now leave a verified review or book the property again."},
    CLOSED:{eyebrow:"Closed booking",title:"This booking is no longer active",body:"Its details and history remain available for reference."},
  };
  return copy[phase];
}

function paymentHeadline(booking:Booking,walletApplied:number,remaining:number,locale:Locale):string{
  const ar=locale==="ar";
  if(remaining<=0&&walletApplied>0)return ar?"مدفوع بالكامل بالمحفظة":"Paid in full with Wallet";
  if(booking.paymentMode==="PAY_AT_HOTEL")return ar?"الدفع في الفندق":"Pay at hotel";
  if(booking.paymentState==="CAPTURED")return ar?"تم الدفع إلكترونيًا":"Paid online";
  return ar?"الدفع الإلكتروني":"Online payment";
}
function primaryPaymentLabel(booking:Booking,walletApplied:number,remaining:number,locale:Locale):string{
  const ar=locale==="ar";
  if(remaining<=0&&walletApplied>0)return ar?"إجمالي مغطى بالمحفظة":"Covered by Wallet";
  if(booking.paymentMode==="PAY_AT_HOTEL")return ar?"المبلغ المستحق في الفندق":"Amount due at hotel";
  if(booking.paymentState==="CAPTURED")return ar?"المبلغ المدفوع":"Amount paid";
  return ar?"المبلغ المستحق الآن":"Amount due now";
}
function primaryPaymentAmount(booking:Booking,walletApplied:number,remaining:number):number{
  if(remaining<=0&&walletApplied>0)return booking.amounts.total;
  if(booking.paymentMode==="PAY_AT_HOTEL")return remaining;
  if(booking.paymentState==="CAPTURED")return booking.amounts.total;
  return remaining;
}
function paymentSubline(booking:Booking,walletApplied:number,remaining:number,locale:Locale):string{
  const ar=locale==="ar";
  if(remaining<=0&&walletApplied>0)return ar?"لا توجد وسيلة دفع إضافية مطلوبة.":"No second payment method is required.";
  if(booking.paymentMode==="PAY_AT_HOTEL"&&walletApplied>0)return ar?`تم استخدام ${money(walletApplied,booking.currency)} من المحفظة، والباقي عند الوصول.`:`${money(walletApplied,booking.currency)} was applied from Wallet; the rest is due at the property.`;
  if(booking.paymentMode==="PAY_AT_HOTEL")return ar?"لم يتم تحصيل مبلغ إلكترونيًا من HandMeKey.":"Nothing has been charged online by HandMeKey.";
  if(booking.paymentState==="CAPTURED")return ar?"تم تسجيل الدفع الإلكتروني على الحجز.":"Online payment is recorded on the booking.";
  return ar?"أكمل الدفع الإلكتروني لتأكيد حالة الدفع.":"Complete online payment to settle the booking.";
}
function paymentTrustLine(booking:Booking,walletApplied:number,remaining:number,locale:Locale):string{
  const ar=locale==="ar";
  if(booking.paymentMode==="PAY_AT_HOTEL"&&remaining>0)return ar?"المبلغ الظاهر هو الرصيد المتبقي المستحق للفندق وفق شروط خطة السعر.":"The amount shown is the remaining balance due to the property under this rate plan.";
  if(walletApplied>0)return ar?"تم احتساب رصيد HandMeKey Wallet ضمن ملخص الدفع.":"HandMeKey Wallet credit is included in this payment summary.";
  return ar?"تفاصيل الدفع مرتبطة مباشرة بهذا الحجز.":"Payment details are tied directly to this booking.";
}
function guestLabel(occupancy:{adults:number;children:number},locale:Locale):string{
  if(locale==="ar")return `${occupancy.adults} ${occupancy.adults===1?"بالغ":"بالغين"}${occupancy.children?` · ${occupancy.children} ${occupancy.children===1?"طفل":"أطفال"}`:""}`;
  return `${occupancy.adults} adult${occupancy.adults===1?"":"s"}${occupancy.children?` · ${occupancy.children} child${occupancy.children===1?"":"ren"}`:""}`;
}
function formatStayDate(value:string,locale:Locale):string{return new Date(`${value}T12:00:00Z`).toLocaleDateString(locale==="ar"?"ar-JO":"en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});}
function formatClock(value:string,locale:Locale):string{const [hours,minutes]=value.split(":").map(Number);if(!Number.isFinite(hours)||!Number.isFinite(minutes))return value;const date=new Date(2000,0,1,hours,minutes);return date.toLocaleTimeString(locale==="ar"?"ar-JO":"en-US",{hour:"numeric",minute:"2-digit"});}
function nightsBetween(arrival:string,departure:string):number{return Math.max(0,Math.round((Date.parse(`${departure}T00:00:00Z`)-Date.parse(`${arrival}T00:00:00Z`))/86400000));}
function money(value:number,currency:string){return `${value.toFixed(2)} ${currency}`;}
function statusLabel(status:string,locale:Locale){if(locale!=="ar")return ({HOLD:"On hold",CONFIRMED:"Confirmed",MODIFIED:"Confirmed · updated",CANCELLED:"Cancelled",NO_SHOW:"No show",EXPIRED:"Expired"} as Record<string,string>)[status]??status;return ({HOLD:"قيد التثبيت",CONFIRMED:"مؤكد",MODIFIED:"مؤكد · معدّل",CANCELLED:"ملغى",NO_SHOW:"عدم حضور",EXPIRED:"منتهي"} as Record<string,string>)[status]??status;}
