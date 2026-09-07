"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import type {GuestLocale} from "@/lib/guest-market";

type StoredCheckout={prebookId:string;transactionId:string;firstName:string;lastName:string;email:string;phone?:string;hotelName:string;roomName:string|null;arrival:string;departure:string;sandbox:boolean};
type Confirmation={bookingId:string|null;hotelConfirmationCode:string|null;status:string|null};
const STORAGE_PREFIX="handmekey:nuitee-payment:";

export function FinalizeNuiteeBooking({transactionId,locale}:{transactionId:string;locale:GuestLocale}){
  const started=useRef(false);
  const [state,setState]=useState<"loading"|"success"|"error">("loading");
  const [message,setMessage]=useState<string|null>(null);
  const [confirmation,setConfirmation]=useState<Confirmation|null>(null);
  const [stay,setStay]=useState<StoredCheckout|null>(null);
  const ar=locale==="ar";

  useEffect(()=>{
    if(started.current)return;
    started.current=true;
    const storageKey=`${STORAGE_PREFIX}${transactionId}`;
    let checkout:StoredCheckout|null=null;
    try{
      const raw=sessionStorage.getItem(storageKey);
      checkout=raw?JSON.parse(raw) as StoredCheckout:null;
    }catch{checkout=null;}
    if(!checkout||checkout.transactionId!==transactionId||!checkout.prebookId){
      setState("error");
      setMessage(ar?"تعذر العثور على جلسة الحجز في هذا المتصفح. لا تحاول الدفع مرة أخرى قبل التحقق من حجوزاتك في Nuitee.":"The booking session could not be recovered in this browser. Do not pay again until you verify the transaction in Nuitee.");
      return;
    }
    setStay(checkout);
    void finalize(checkout,storageKey);

    async function finalize(input:StoredCheckout,key:string){
      try{
        const response=await fetch("/api/v1/nuitee/book",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prebookId:input.prebookId,transactionId:input.transactionId,firstName:input.firstName,lastName:input.lastName,email:input.email,phone:input.phone})});
        const payload=await response.json().catch(()=>null) as {data?:Confirmation;error?:{message?:string}}|null;
        if(!response.ok||!payload?.data)throw new Error(payload?.error?.message??`Booking failed (${response.status})`);
        setConfirmation(payload.data);
        setState("success");
        sessionStorage.removeItem(key);
      }catch(cause){
        setState("error");
        setMessage(cause instanceof Error?cause.message:(ar?"تم الدفع لكن تعذر تأكيد الفندق حالياً.":"Payment returned, but the hotel booking could not be finalized right now."));
      }
    }
  },[transactionId,ar]);

  if(state==="loading")return <div className="panel"><span className="eyebrow">Nuitee Connect</span><h2>{ar?"جارٍ تأكيد الحجز…":"Confirming your reservation…"}</h2><p className="muted">{ar?"لا تغلق هذه الصفحة حتى يظهر رقم الحجز.":"Please keep this page open until a booking reference appears."}</p></div>;
  if(state==="error")return <div className="panel"><span className="eyebrow">Nuitee Connect</span><h2>{ar?"نحتاج للتحقق من الحجز":"Booking needs verification"}</h2><p className="danger">{message}</p><p className="muted">{ar?"إذا تم خصم المبلغ، تحقق من لوحة Nuitee أو تواصل مع الدعم قبل إعادة المحاولة حتى لا يتم الدفع مرتين.":"If payment was charged, check the Nuitee dashboard or contact support before trying again so you do not pay twice."}</p><Link className="resultCta" href="/search">{ar?"العودة إلى البحث":"Return to search"}</Link></div>;
  return <div className="panel"><span className="eyebrow">Nuitee Connect</span><h2>{ar?"تم تأكيد الحجز":"Booking confirmed"}</h2>{stay&&<><p><strong>{stay.hotelName}</strong>{stay.roomName?` · ${stay.roomName}`:""}</p><p className="muted">{stay.arrival} — {stay.departure}</p></>}<div className="breakdown"><span>{ar?"رقم حجز Nuitee":"Nuitee booking ID"}</span><strong>{confirmation?.bookingId??"—"}</strong></div><div className="breakdown"><span>{ar?"رقم تأكيد الفندق":"Hotel confirmation"}</span><strong>{confirmation?.hotelConfirmationCode??"—"}</strong></div><div className="breakdown"><span>{ar?"الحالة":"Status"}</span><strong>{confirmation?.status??"Confirmed"}</strong></div>{stay?.sandbox&&<p className="muted">{ar?"هذا حجز Sandbox تجريبي.":"This is a Sandbox test booking."}</p>}<Link className="resultCta" href="/">{ar?"العودة إلى HandMeKey":"Back to HandMeKey"}</Link></div>;
}
