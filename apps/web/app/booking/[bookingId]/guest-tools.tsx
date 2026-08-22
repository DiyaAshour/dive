"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@/lib/i18n";

type Arrival = {expectedArrivalTime:string|null;arrivalStatus:string;status:string};
type GuestRequest = {id:string;category:string;message:string;status:string;createdAt:string};
type BookingMessage = {id:string;senderKind:"GUEST"|"HOTEL";body:string;createdAt:string};
type ReviewEligibility = {eligible:boolean;alreadyReviewed:boolean;departure:string;today:string};
type Props = {bookingId:string;locale:Locale};

export function GuestTools({bookingId,locale}:Props) {
  const ar=locale==="ar";
  const [arrival,setArrival] = useState<Arrival|null>(null);
  const [requests,setRequests] = useState<GuestRequest[]>([]);
  const [messages,setMessages] = useState<BookingMessage[]>([]);
  const [reviewEligibility,setReviewEligibility] = useState<ReviewEligibility|null>(null);
  const [message,setMessage] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);

  useEffect(()=>{
    const headers = accessHeaders(bookingId);
    Promise.all([
      api<Arrival>(`/api/v1/bookings/${bookingId}/arrival`,{headers}),
      api<GuestRequest[]>(`/api/v1/bookings/${bookingId}/requests`,{headers}),
      api<BookingMessage[]>(`/api/v1/bookings/${bookingId}/messages`,{headers}),
      api<ReviewEligibility>(`/api/v1/bookings/${bookingId}/review`,{headers}),
    ]).then(([nextArrival,nextRequests,nextMessages,nextReview])=>{
      setArrival(nextArrival);setRequests(nextRequests);setMessages(nextMessages);setReviewEligibility(nextReview);
    }).catch((error)=>setMessage(error instanceof Error?error.message:(ar?"تعذر تحميل أدوات الضيف":"Unable to load guest tools")));
  },[bookingId,ar]);

  async function saveArrival(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try {
      const result=await api<Arrival>(`/api/v1/bookings/${bookingId}/arrival`,{method:"PUT",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({expectedArrivalTime:String(form.get("arrival")||"")||null})});
      setArrival(result);setMessage(ar?"تم تحديث وقت الوصول المتوقع":"Expected arrival updated");
    } catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر تحديث وقت الوصول":"Unable to update arrival"));} finally{setBusy(false);}
  }

  async function addRequest(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try {
      const created=await api<GuestRequest>(`/api/v1/bookings/${bookingId}/requests`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({category:String(form.get("category")),message:String(form.get("message"))})});
      setRequests((current)=>[...current,created]);formElement.reset();setMessage(ar?"تم إرسال الطلب إلى الفندق":"Request sent to the hotel");
    } catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر إرسال الطلب":"Unable to send request"));} finally{setBusy(false);}
  }

  async function sendMessage(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try {
      const created=await api<BookingMessage>(`/api/v1/bookings/${bookingId}/messages`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({body:String(form.get("body"))})});
      setMessages((current)=>[...current,created]);formElement.reset();
    } catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر إرسال الرسالة":"Unable to send message"));} finally{setBusy(false);}
  }

  async function submitReview(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const score=(name:string)=>Number(form.get(name));
    try {
      await api(`/api/v1/bookings/${bookingId}/review`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({overall:score("overall"),cleanliness:score("cleanliness"),staff:score("staff"),location:score("location"),facilities:score("facilities"),comfort:score("comfort"),value:score("value"),title:String(form.get("title")||"")||null,comment:String(form.get("comment"))})});
      setReviewEligibility((current)=>current?{...current,eligible:false,alreadyReviewed:true}:current);setMessage(ar?"شكرًا لك. تم نشر تقييم إقامتك الموثق.":"Thank you. Your verified-stay review is published.");
    } catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر إرسال التقييم":"Unable to submit review"));} finally{setBusy(false);}
  }

  async function linkAccount() {
    setBusy(true);setMessage(null);
    try {await api(`/api/v1/bookings/${bookingId}/link-account`,{method:"POST",headers:accessHeaders(bookingId)});setMessage(ar?"تم ربط الحجز بحسابك وسيظهر الآن ضمن حجوزاتي.":"Booking linked to your account. It will now appear in My Trips.");}
    catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر ربط الحجز":"Unable to link booking"));} finally{setBusy(false);}
  }

  async function cancelReservation() {
    setBusy(true);setMessage(null);
    try {
      const preview=await api<{penaltyAmount:number;refundableAmount:number;alreadyCancelled:boolean}>(`/api/v1/bookings/${bookingId}/cancellation`,{headers:accessHeaders(bookingId)});
      if(preview.alreadyCancelled){setMessage(ar?"هذا الحجز ملغى بالفعل":"This reservation is already cancelled");return;}
      const approved=window.confirm(ar?`رسوم الإلغاء: ${preview.penaltyAmount.toFixed(2)}. المبلغ القابل للاسترداد: ${preview.refundableAmount.toFixed(2)}. هل تريد المتابعة؟`:`Cancellation penalty: ${preview.penaltyAmount.toFixed(2)}. Refundable amount: ${preview.refundableAmount.toFixed(2)}. Continue?`);
      if(!approved)return;
      await api(`/api/v1/bookings/${bookingId}/cancel`,{method:"POST",headers:{...accessHeaders(bookingId),"idempotency-key":crypto.randomUUID()}});
      setMessage(ar?"تم إلغاء الحجز. جارٍ تحديث الحالة…":"Reservation cancelled. Reloading booking status…");window.setTimeout(()=>window.location.reload(),500);
    } catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر إلغاء الحجز":"Unable to cancel reservation"));} finally{setBusy(false);}
  }

  return <div className="grid2" style={{marginTop:24}}>
    <section className="panel"><span className="eyebrow">{ar?"الوصول":"Arrival"}</span><h3>{ar?"وقت الوصول المتوقع":"Expected arrival"}</h3><p className="muted">{ar?"يُحفظ الوقت حسب المنطقة الزمنية المحلية للفندق.":"Time is stored in the hotel local timezone."}</p><form className="stackForm" onSubmit={saveArrival}><label>{ar?"وقت الوصول":"Arrival time"}<input key={arrival?.expectedArrivalTime??"none"} name="arrival" type="time" defaultValue={arrival?.expectedArrivalTime??""} disabled={arrival?.arrivalStatus==="ARRIVED"}/></label><button className="primaryButton" disabled={busy||arrival?.arrivalStatus==="ARRIVED"}>{arrival?.arrivalStatus==="ARRIVED"?(ar?"تم تسجيل وصول الضيف":"Guest marked arrived"):(ar?"حفظ وقت الوصول":"Save arrival time")}</button></form></section>
    <section className="panel"><span className="eyebrow">{ar?"طلبات الضيف":"Guest requests"}</span><h3>{ar?"طلبات للفندق":"Requests for the hotel"}</h3><div className="stackForm">{requests.length===0?<p className="muted">{ar?"لا توجد طلبات بعد.":"No requests yet."}</p>:requests.map((request)=><div key={request.id} className="alertCard"><div><strong>{categoryLabel(request.category,locale)} · {requestStatusLabel(request.status,locale)}</strong><p>{request.message}</p></div></div>)}</div><form className="stackForm" onSubmit={addRequest} style={{marginTop:16}}><label>{ar?"الفئة":"Category"}<select name="category" defaultValue="OTHER"><option value="ARRIVAL">{categoryLabel("ARRIVAL",locale)}</option><option value="BEDDING">{categoryLabel("BEDDING",locale)}</option><option value="ACCESSIBILITY">{categoryLabel("ACCESSIBILITY",locale)}</option><option value="TRANSPORT">{categoryLabel("TRANSPORT",locale)}</option><option value="OTHER">{categoryLabel("OTHER",locale)}</option></select></label><label>{ar?"الطلب":"Request"}<textarea name="message" rows={3} required maxLength={2000}/></label><button className="secondaryButton" disabled={busy}>{ar?"إرسال الطلب":"Send request"}</button></form></section>
    <section className="panel"><span className="eyebrow">{ar?"الرسائل":"Messages"}</span><h3>{ar?"راسل الفندق":"Message the hotel"}</h3><div className="stackForm" style={{maxHeight:300,overflow:"auto"}}>{messages.length===0?<p className="muted">{ar?"لا توجد رسائل بعد.":"No messages yet."}</p>:messages.map((item)=><div className="alertCard" key={item.id}><div><strong>{item.senderKind==="HOTEL"?(ar?"الفندق":"Hotel"):(ar?"أنت":"You")}</strong><p>{item.body}</p><small className="muted">{new Date(item.createdAt).toLocaleString(ar?"ar-JO":"en")}</small></div></div>)}</div><form className="stackForm" onSubmit={sendMessage} style={{marginTop:12}}><textarea name="body" required maxLength={4000} rows={3} placeholder={ar?"اسأل الفندق عن حجزك المؤكد":"Ask the hotel about your confirmed reservation"}/><button className="secondaryButton" disabled={busy}>{ar?"إرسال الرسالة":"Send message"}</button></form></section>
    <section className="panel"><span className="eyebrow">{ar?"تقييم إقامة موثق":"Verified stay review"}</span><h3>{ar?"قيّم إقامتك":"Rate your stay"}</h3>{reviewEligibility?.alreadyReviewed?<p className="status">{ar?"لقد قيّمت هذه الإقامة بالفعل.":"You already reviewed this stay."}</p>:reviewEligibility?.eligible?<form className="stackForm" onSubmit={submitReview}><div className="formGrid">{["overall","cleanliness","staff","location","facilities","comfort","value"].map((field)=><label key={field}>{reviewLabel(field,locale)}<select name={field} defaultValue="10">{Array.from({length:10},(_,index)=>10-index).map((score)=><option key={score} value={score}>{score}/10</option>)}</select></label>)}</div><label>{ar?"العنوان":"Title"}<input name="title" maxLength={120}/></label><label>{ar?"التقييم":"Review"}<textarea name="comment" rows={4} minLength={10} maxLength={5000} required/></label><button className="primaryButton" disabled={busy}>{ar?"نشر التقييم الموثق":"Publish verified review"}</button></form>:<p className="muted">{ar?"يصبح التقييم متاحًا بعد اكتمال الإقامة.":"Reviews become available after the stay is completed."}</p>}</section>
    <section className="panel"><span className="eyebrow">{ar?"الحساب":"Account"}</span><h3>{ar?"احتفظ بهذا الحجز":"Keep this trip"}</h3><p className="muted">{ar?"إذا أُنشئ الحجز كضيف، اربطه بالحساب المسجل باستخدام رمز الوصول الخاص بالحجز.":"If this booking was created as a guest, link it to the signed-in account with the booking access token."}</p><button className="secondaryButton" onClick={linkAccount} disabled={busy}>{ar?"إضافة إلى حجوزاتي":"Add to My Trips"}</button></section>
    <section className="panel"><span className="eyebrow">{ar?"إدارة الحجز":"Booking management"}</span><h3>{ar?"الإلغاء":"Cancellation"}</h3><p className="muted">{ar?"تحسب المنصة سياسة الإلغاء المحفوظة قبل إرسال طلب الإلغاء.":"The platform calculates the stored cancellation policy before cancellation is submitted."}</p><button className="secondaryButton" onClick={cancelReservation} disabled={busy}>{ar?"معاينة وإلغاء الحجز":"Preview & cancel reservation"}</button></section>
    {message&&<div className="setupMessage" style={{gridColumn:"1 / -1"}}>{message}</div>}
  </div>;
}

function reviewLabel(value:string,locale:Locale):string{if(locale!=="ar")return value.charAt(0).toUpperCase()+value.slice(1);return ({overall:"التقييم العام",cleanliness:"النظافة",staff:"الموظفون",location:"الموقع",facilities:"المرافق",comfort:"الراحة",value:"القيمة"} as Record<string,string>)[value]??value;}
function categoryLabel(value:string,locale:Locale):string{if(locale!=="ar")return ({ARRIVAL:"Arrival",BEDDING:"Bedding",ACCESSIBILITY:"Accessibility",TRANSPORT:"Transport",OTHER:"Other"} as Record<string,string>)[value]??value;return ({ARRIVAL:"الوصول",BEDDING:"الفراش",ACCESSIBILITY:"سهولة الوصول",TRANSPORT:"النقل",OTHER:"أخرى"} as Record<string,string>)[value]??value;}
function requestStatusLabel(value:string,locale:Locale):string{if(locale!=="ar")return value;return ({OPEN:"مفتوح",ACKNOWLEDGED:"تم الاطلاع",RESOLVED:"تم الحل"} as Record<string,string>)[value]??value;}
function accessHeaders(bookingId:string):Record<string,string>{const token=sessionStorage.getItem(`booking-token:${bookingId}`);return token?{"x-booking-token":token}:{};}
async function api<T=unknown>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{...init,cache:"no-store"});const body=await response.json();if(!response.ok||body.error)throw new Error(body.error?.message||"Request failed");return body.data as T;}
