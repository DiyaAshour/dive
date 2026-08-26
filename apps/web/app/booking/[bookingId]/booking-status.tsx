"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Booking = {
  id:string;reference:string;status:string;paymentState:string;paymentMode:string;currency:string;
  hotel:{id:string;name:string};roomType:{id:string;name:string};ratePlan:{id:string;name:string};
  arrival:string;departure:string;amounts:{base:number;service:number;tax:number;total:number};
  holdExpiresAt:string|null;confirmedAt:string|null;cancelledAt:string|null;
  cancellation:{policy:{name:string};penaltyAmount:number;refundableAmount:number|null};
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
    fetch(`/api/v1/bookings/${bookingId}`, {headers:token?{"x-booking-token":token}:{}})
      .then(async(response)=>{const body=await response.json();if(!response.ok||body.error)throw new Error(body.error?.message||(ar?"تعذر تحميل الحجز":"Unable to load booking"));return body.data as Booking;})
      .then(setBooking).catch((cause)=>setError(cause instanceof Error?cause.message:(ar?"تعذر تحميل الحجز":"Unable to load booking"))).finally(()=>setLoading(false));
  },[bookingId,ar]);

  if(loading) return <div className="panel"><strong>{ar?"جارٍ تحميل حجزك…":"Loading your booking…"}</strong></div>;
  if(error) return <div className="panel"><h3>{ar?"يلزم الوصول إلى الحجز":"Booking access required"}</h3><p className="danger">{error}</p><p className="muted">{ar?"افتح الصفحة من المتصفح الذي أنشأ الحجز أو سجّل الدخول إلى الحساب الذي يملكه.":"Open this page from the browser used to create the booking, or sign in to the account that owns it."}</p></div>;
  if(!booking) return null;

  const walletApplied = booking.wallet?.appliedAmount ?? 0;
  const remaining = booking.wallet?.remainingAmount ?? booking.amounts.total;
  const paymentLabel = walletApplied > 0
    ? remaining <= 0
      ? (ar?"HandMeKey Wallet — مدفوع بالكامل":"HandMeKey Wallet — paid in full")
      : booking.paymentMode === "PAY_AT_HOTEL"
        ? (ar?"المحفظة + دفع الباقي في الفندق":"Wallet + remaining at hotel")
        : (ar?"المحفظة + بطاقة للباقي":"Wallet + card for the remainder")
    : booking.paymentMode==="PAY_AT_HOTEL"
      ? (ar?"الدفع في الفندق":"Pay at hotel")
      : (ar?"الدفع الآن":"Pay now");

  return <div className="checkout">
    <div className="panel">
      <span className="eyebrow">{ar?"الحجز":"Booking"} {booking.reference}</span>
      <h1>{statusLabel(booking.status,locale)}</h1>
      <p><strong>{booking.hotel.name}</strong></p>
      <p>{booking.roomType.name} · {booking.ratePlan.name}</p>
      <p className="muted">{booking.arrival} — {booking.departure}</p>
      {booking.status==="HOLD" && <p className="danger">{ar?`الغرفة مثبتة مؤقتًا${booking.holdExpiresAt?` حتى ${new Date(booking.holdExpiresAt).toLocaleTimeString("ar-JO")}`:""} ولم يتم تأكيد الحجز بعد.`:`Your room is temporarily held${booking.holdExpiresAt?` until ${new Date(booking.holdExpiresAt).toLocaleTimeString()}`:""}. It is not confirmed yet.`}</p>}
      {booking.paymentState==="PENDING" && <p className="muted">{ar?"الدفع الإلكتروني بانتظار إتمامه لدى مزود الدفع.":"Online payment is awaiting provider completion."}</p>}
      {booking.paymentState==="CAPTURED" && booking.status==="HOLD" && <p className="muted">{ar?"تم تحصيل الدفع ويجري انتظار تأكيد الحجز.":"Payment is captured and booking confirmation is pending."}</p>}
      {(booking.status==="CONFIRMED" || booking.status==="MODIFIED") && <p className="status">{ar?"مؤكد":"Confirmed"}</p>}
      <div style={{marginTop:24}}><strong>{ar?"سياسة الإلغاء":"Cancellation policy"}</strong><p className="muted">{booking.cancellation.policy.name}</p></div>
    </div>
    <aside className="panel">
      <span className="eyebrow">{ar?"ملخص السعر":"Price summary"}</span>
      <div className="breakdown"><span>{ar?"سعر الغرفة":"Room base"}</span><strong>{money(booking.amounts.base,booking.currency)}</strong></div>
      <div className="breakdown"><span>{ar?"رسوم الخدمة":"Employee service"}</span><strong>{money(booking.amounts.service,booking.currency)}</strong></div>
      <div className="breakdown"><span>{ar?"الضريبة / الرسوم":"Tax / charges"}</span><strong>{money(booking.amounts.tax,booking.currency)}</strong></div>
      <div className="breakdown total"><span>{ar?"الإجمالي":"Total"}</span><strong>{money(booking.amounts.total,booking.currency)}</strong></div>
      {walletApplied > 0 && <>
        <div className="breakdown bookingWalletLine"><span>HandMeKey Wallet</span><strong>-{money(walletApplied,booking.currency)}</strong></div>
        <div className="breakdown bookingWalletRemaining"><span>{ar?"المتبقي":"Remaining"}</span><strong>{money(remaining,booking.currency)}</strong></div>
      </>}
      <p className="muted">{ar?"طريقة الدفع":"Payment mode"}: {paymentLabel}</p>
    </aside>
  </div>;
}

function money(value:number,currency:string){return `${value.toFixed(2)} ${currency}`;}
function statusLabel(status:string,locale:Locale){if(locale!=="ar")return status;return ({HOLD:"قيد التثبيت",CONFIRMED:"مؤكد",MODIFIED:"معدّل",CANCELLED:"ملغى",NO_SHOW:"عدم حضور",EXPIRED:"منتهي"} as Record<string,string>)[status]??status;}
