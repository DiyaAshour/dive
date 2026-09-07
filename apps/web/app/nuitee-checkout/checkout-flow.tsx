"use client";

import {useMemo,useState} from "react";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency,GuestLocale} from "@/lib/guest-market";

type Props=Readonly<{prebookId:string;hotelName:string;roomName:string|null;boardName:string|null;arrival:string;departure:string;price:number;sourceCurrency:string;locale:GuestLocale;currency:GuestCurrency;sandbox:boolean}>;

export function NuiteeCheckoutFlow(props:Props){
  const {prebookId,hotelName,roomName,boardName,arrival,departure,price,sourceCurrency,locale,currency,sandbox}=props;
  const [firstName,setFirstName]=useState("");
  const [lastName,setLastName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [confirmation,setConfirmation]=useState<{bookingId:string|null;hotelConfirmationCode:string|null;status:string|null}|null>(null);
  const ar=locale==="ar";
  const total=guestMoney(price,sourceCurrency,currency,locale);
  const canSubmit=useMemo(()=>firstName.trim().length>1&&lastName.trim().length>1&&email.includes("@")&&!busy,[firstName,lastName,email,busy]);

  async function submit(){
    if(!canSubmit)return;
    setBusy(true);setError(null);
    try{
      const response=await fetch("/api/v1/nuitee/book",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prebookId,firstName:firstName.trim(),lastName:lastName.trim(),email:email.trim(),phone:phone.trim()||undefined})});
      const payload=await response.json().catch(()=>null) as {data?:{bookingId:string|null;hotelConfirmationCode:string|null;status:string|null};error?:{message?:string}}|null;
      if(!response.ok||!payload?.data)throw new Error(payload?.error?.message??`Booking failed (${response.status})`);
      setConfirmation(payload.data);
    }catch(cause){setError(cause instanceof Error?cause.message:(ar?"تعذر تأكيد الحجز":"Could not confirm booking"));}
    finally{setBusy(false);}
  }

  if(confirmation)return <div className="panel"><span className="eyebrow">Nuitee Connect</span><h2>{ar?"تم تأكيد الحجز التجريبي":"Booking confirmed"}</h2><p>{hotelName}</p><div className="breakdown"><span>{ar?"رقم الحجز":"Booking ID"}</span><strong>{confirmation.bookingId??"—"}</strong></div><div className="breakdown"><span>{ar?"تأكيد الفندق":"Hotel confirmation"}</span><strong>{confirmation.hotelConfirmationCode??"—"}</strong></div><div className="breakdown"><span>{ar?"الحالة":"Status"}</span><strong>{confirmation.status??"Confirmed"}</strong></div>{sandbox&&<p className="muted">{ar?"هذا حجز داخل Sandbox وليس حجزاً حقيقياً.":"This is a Sandbox booking, not a live reservation."}</p>}</div>;

  return <div className="checkout"><div className="panel"><span className="eyebrow">{sandbox?"Nuitee Sandbox":"Nuitee Connect"}</span><h2>{ar?"بيانات الضيف":"Guest details"}</h2><div className="formGrid"><label>{ar?"الاسم الأول":"First name"}<input value={firstName} onChange={(e)=>setFirstName(e.target.value)} autoComplete="given-name"/></label><label>{ar?"اسم العائلة":"Last name"}<input value={lastName} onChange={(e)=>setLastName(e.target.value)} autoComplete="family-name"/></label><label>{ar?"البريد الإلكتروني":"Email"}<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email"/></label><label>{ar?"الهاتف":"Phone"}<input value={phone} onChange={(e)=>setPhone(e.target.value)} autoComplete="tel"/></label></div>{error&&<p className="danger">{error}</p>}<button className="primary" style={{width:"100%",marginTop:22}} disabled={!canSubmit} onClick={submit}>{busy?(ar?"جارٍ التأكيد…":"Confirming…"):(ar?"تأكيد الحجز":"Confirm booking")}</button></div><aside className="panel"><span className="eyebrow">{ar?"ملخص الإقامة":"Stay summary"}</span><h2>{hotelName}</h2><p>{roomName??(ar?"غرفة الفندق":"Hotel room")}{boardName?` · ${boardName}`:""}</p><p className="muted">{arrival} — {departure}</p><div className="breakdown total"><span>{ar?"السعر المؤكد":"Confirmed price"}</span><strong>{total.text}</strong></div>{total.converted&&<p className="muted">{total.sourceText}</p>}<p className="muted">{ar?"تم عمل Prebook قبل عرض هذه الصفحة للتأكد من السعر والتوافر.":"The offer was prebooked before this page was shown to confirm price and availability."}</p></aside></div>;
}
