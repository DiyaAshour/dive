"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import type {GuestLocale} from "@/lib/guest-market";

type CheckoutState="payment_pending"|"processing"|"confirmed"|"needs_review";
type Finalization={state:CheckoutState;reference:string;hotelName:string;roomName:string|null;arrival:string;departure:string;amount:number;currency:string;bookingId:string|null;hotelConfirmationCode:string|null;providerStatus:string|null;message:string|null};

export function FinalizeNuiteeBooking({token,locale}:{token:string;locale:GuestLocale}){
  const started=useRef(false);
  const [state,setState]=useState<"loading"|"success"|"review"|"error">("loading");
  const [message,setMessage]=useState<string|null>(null);
  const [result,setResult]=useState<Finalization|null>(null);
  const ar=locale==="ar";

  useEffect(()=>{
    if(started.current)return;
    started.current=true;
    let cancelled=false;
    void finalize(0);

    async function finalize(poll:number){
      try{
        const response=await fetch("/api/v1/nuitee/finalize",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({token})});
        const payload=await response.json().catch(()=>null) as {data?:Finalization;error?:{message?:string}}|null;
        if(cancelled)return;
        if(!response.ok&&response.status!==202)throw new Error(payload?.error?.message??`Booking verification failed (${response.status})`);
        if(!payload?.data)throw new Error(ar?"لم يصل رد صالح من نظام الحجز":"The booking service returned an invalid response");
        setResult(payload.data);
        if(payload.data.state==="confirmed"){
          setState("success");
          return;
        }
        if(payload.data.state==="needs_review"){
          setMessage(payload.data.message);
          setState("review");
          return;
        }
        if(payload.data.state==="processing"&&poll<6){
          window.setTimeout(()=>void finalize(poll+1),1800);
          return;
        }
        setMessage(ar?"لا يزال تأكيد الفندق قيد التحقق. لا تبدأ عملية دفع جديدة.":"Hotel confirmation is still being verified. Do not start a new payment.");
        setState("review");
      }catch(cause){
        if(cancelled)return;
        setState("error");
        setMessage(cause instanceof Error?cause.message:(ar?"تعذر التحقق من الحجز حالياً.":"The booking could not be verified right now."));
      }
    }
    return()=>{cancelled=true;};
  },[token,ar]);

  if(state==="loading")return <div className="panel"><span className="eyebrow">Nuitee Connect</span><h2>{ar?"جارٍ تأكيد الحجز…":"Confirming your reservation…"}</h2><p className="muted">{ar?"تم استرجاع جلسة الدفع من خادم HandMeKey. لا تغلق الصفحة حتى يظهر التأكيد.":"HandMeKey recovered your payment session from the server. Keep this page open until confirmation appears."}</p></div>;
  if(state==="review"||state==="error")return <div className="panel"><span className="eyebrow">Nuitee Connect</span><h2>{ar?"الحجز يحتاج تحقق":"Booking needs verification"}</h2>{result?.reference&&<div className="breakdown"><span>{ar?"مرجع HandMeKey":"HandMeKey reference"}</span><strong>{result.reference}</strong></div>}<p className="danger">{message}</p><p className="muted">{ar?"إذا تم خصم المبلغ فلا تدفع مرة ثانية. HandMeKey يحتفظ بجلسة الحجز ويمكن مطابقتها مع Nuitee باستخدام نفس المرجع.":"If payment was charged, do not pay again. HandMeKey has retained the checkout session and can reconcile it with Nuitee using the same reference."}</p><Link className="resultCta" href="/search">{ar?"العودة إلى البحث":"Return to search"}</Link></div>;
  return <div className="panel"><span className="eyebrow">Nuitee Connect</span><h2>{ar?"تم تأكيد الحجز":"Booking confirmed"}</h2>{result&&<><p><strong>{result.hotelName}</strong>{result.roomName?` · ${result.roomName}`:""}</p><p className="muted">{result.arrival} — {result.departure}</p><div className="breakdown"><span>{ar?"مرجع HandMeKey":"HandMeKey reference"}</span><strong>{result.reference}</strong></div><div className="breakdown"><span>{ar?"رقم حجز Nuitee":"Nuitee booking ID"}</span><strong>{result.bookingId??"—"}</strong></div><div className="breakdown"><span>{ar?"رقم تأكيد الفندق":"Hotel confirmation"}</span><strong>{result.hotelConfirmationCode??"—"}</strong></div><div className="breakdown"><span>{ar?"الحالة":"Status"}</span><strong>{result.providerStatus??"Confirmed"}</strong></div><div className="breakdown"><span>{ar?"الإجمالي":"Total"}</span><strong>{result.amount.toFixed(2)} {result.currency}</strong></div></>}<Link className="resultCta" href="/">{ar?"العودة إلى HandMeKey":"Back to HandMeKey"}</Link></div>;
}
