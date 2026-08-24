"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type {Locale} from "@/lib/i18n";

type GuestRequest={id:string;category:string;message:string;status:string;createdAt:string};
type FrontDeskNote={id:string;body:string;createdAt:string;author:{displayName:string}};
type Reservation={id:string;reference:string;guestName:string;guestEmail:string;arrival:string;departure:string;expectedArrivalTime:string|null;arrivalStatus:string;status:string;paymentMode:string;paymentState:string;currency:string;totalAmount:number;roomType:{id:string;name:string};ratePlan:{id:string;name:string};guestRequests:GuestRequest[];frontDeskNotes:FrontDeskNote[]};

type Props={hotelId:string;initialDate:string;initialScope:"ARRIVALS"|"DEPARTURES"|"IN_HOUSE"|"ALL";initialReservations:Reservation[];locale:Locale};

export default function OperationsBoard({hotelId,initialDate,initialScope,initialReservations,locale}:Props){
  const ar=locale==="ar";
  const [reservations,setReservations]=useState(initialReservations);
  const [message,setMessage]=useState<string|null>(null);
  const [busyId,setBusyId]=useState<string|null>(null);

  async function saveArrival(event:FormEvent<HTMLFormElement>,bookingId:string){
    event.preventDefault();setBusyId(bookingId);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try{
      const updated=await api<{expectedArrivalTime:string|null;arrivalStatus:string}>(`/api/v1/hotels/${hotelId}/reservations/${bookingId}/arrival`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({expectedArrivalTime:String(form.get("arrival")||"")||null,arrivalStatus:String(form.get("status"))})});
      setReservations((items)=>items.map((item)=>item.id===bookingId?{...item,...updated}:item));setMessage(ar?"تم تحديث الوصول.":`Arrival updated for ${bookingId}`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to update arrival");}finally{setBusyId(null);}
  }

  async function changeRequestStatus(bookingId:string,requestId:string,status:string){
    setBusyId(requestId);setMessage(null);
    try{
      const updated=await api<GuestRequest>(`/api/v1/hotels/${hotelId}/reservations/${bookingId}/requests/${requestId}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
      setReservations((items)=>items.map((item)=>item.id===bookingId?{...item,guestRequests:item.guestRequests.map((request)=>request.id===requestId?{...request,status:updated.status}:request)}:item));
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to update request");}finally{setBusyId(null);}
  }

  async function addNote(event:FormEvent<HTMLFormElement>,bookingId:string){
    event.preventDefault();setBusyId(bookingId);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try{
      const note=await api<{id:string;body:string;createdAt:string}>(`/api/v1/hotels/${hotelId}/reservations/${bookingId}/notes`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({body:String(form.get("body"))})});
      setReservations((items)=>items.map((item)=>item.id===bookingId?{...item,frontDeskNotes:[{...note,author:{displayName:ar?"أنت":"You"}},...item.frontDeskNotes].slice(0,3)}:item));formElement.reset();setMessage(ar?"تمت إضافة ملاحظة الاستقبال.":"Front desk note added");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to add note");}finally{setBusyId(null);}
  }

  return <>
    <section className="panel" style={{marginBottom:24}}><form method="get" className="formGrid"><input type="hidden" name="hotelId" value={hotelId}/><label>{ar?"تاريخ التشغيل":"Operational date"}<input name="date" type="date" defaultValue={initialDate}/></label><label>{ar?"العرض":"View"}<select name="scope" defaultValue={initialScope}><option value="ALL">{ar?"عمليات اليوم":"Daily operations"}</option><option value="ARRIVALS">{ar?"الوصول":"Arrivals"}</option><option value="DEPARTURES">{ar?"المغادرة":"Departures"}</option><option value="IN_HOUSE">{ar?"داخل الفندق":"In-house"}</option></select></label><button className="primaryButton" type="submit">{ar?"تحميل الحجوزات":"Load reservations"}</button><a className="secondaryButton" href={`/api/v1/hotels/${hotelId}/reservations/export?date=${initialDate}&scope=${initialScope}`}>{ar?"تصدير CSV":"Export CSV"}</a></form></section>
    <div className="kpiGrid"><div className="kpi"><span>{ar?"الحجوزات":"Reservations"}</span><strong>{reservations.length}</strong></div><div className="kpi"><span>{ar?"الوصول المتوقع":"Expected arrivals"}</span><strong>{reservations.filter((item)=>item.arrivalStatus==="EXPECTED").length}</strong></div><div className="kpi"><span>{ar?"وصلوا":"Arrived"}</span><strong>{reservations.filter((item)=>item.arrivalStatus==="ARRIVED").length}</strong></div><div className="kpi"><span>{ar?"طلبات مفتوحة":"Open requests"}</span><strong>{reservations.reduce((sum,item)=>sum+item.guestRequests.filter((request)=>request.status!=="RESOLVED").length,0)}</strong></div></div>
    {message&&<div className="setupMessage" style={{margin:"20px 0"}}>{message}</div>}
    <div className="stackForm" style={{marginTop:24}}>{reservations.length===0?<div className="panel"><h3>{ar?"لا توجد حجوزات في هذا العرض":"No reservations in this view"}</h3><p className="muted">{ar?"غيّر التاريخ أو فلتر التشغيل.":"Change the date or operational filter."}</p></div>:reservations.map((booking)=><article className="panel" key={booking.id}><div className="sectionHeading"><div><span className="eyebrow">{booking.reference} · {booking.status}</span><h2>{booking.guestName}</h2><p className="muted">{booking.guestEmail} · {booking.roomType.name} · {booking.ratePlan.name}</p></div><div><strong>{booking.arrival} → {booking.departure}</strong><p className="muted">{booking.paymentMode} · {booking.paymentState} · {booking.totalAmount.toFixed(2)} {booking.currency}</p></div></div><div className="grid2"><section><h3>{ar?"الوصول":"Arrival"}</h3><form key={`${booking.id}-${booking.expectedArrivalTime??"none"}-${booking.arrivalStatus}`} className="stackForm" onSubmit={(event)=>saveArrival(event,booking.id)}><label>{ar?"الوقت المتوقع":"Expected time"}<input name="arrival" type="time" defaultValue={booking.expectedArrivalTime??""}/></label><label>{ar?"الحالة":"Status"}<select name="status" defaultValue={booking.arrivalStatus}><option value="NOT_PROVIDED">{ar?"غير محدد":"Not provided"}</option><option value="EXPECTED">{ar?"متوقع":"Expected"}</option><option value="ARRIVED">{ar?"وصل":"Arrived"}</option></select></label><button className="secondaryButton" disabled={busyId===booking.id}>{ar?"حفظ الوصول":"Save arrival"}</button></form></section><section><h3>{ar?"طلبات الضيف":"Guest requests"}</h3>{booking.guestRequests.length===0?<p className="muted">{ar?"لا توجد طلبات ضيف.":"No guest requests."}</p>:booking.guestRequests.map((request)=><div className="alertCard" key={request.id}><div style={{width:"100%"}}><strong>{request.category}</strong><p>{request.message}</p><select value={request.status} disabled={busyId===request.id} onChange={(event)=>void changeRequestStatus(booking.id,request.id,event.target.value)}><option value="OPEN">{ar?"مفتوح":"Open"}</option><option value="ACKNOWLEDGED">{ar?"تم الاستلام":"Acknowledged"}</option><option value="RESOLVED">{ar?"محلول":"Resolved"}</option></select></div></div>)}</section></div><section style={{marginTop:20}}><h3>{ar?"ملاحظات الاستقبال الخاصة":"Private front desk notes"}</h3><p className="muted">{ar?"لا تظهر هذه الملاحظات للضيف أو في واجهة الحجز العامة.":"These notes are never exposed to the guest or public booking API."}</p>{booking.frontDeskNotes.map((note)=><div className="alertCard" key={note.id}><div><strong>{note.author.displayName}</strong><p>{note.body}</p><small className="muted">{new Date(note.createdAt).toLocaleString(locale==="ar"?"ar-JO":"en-GB")}</small></div></div>)}<form className="stackForm" onSubmit={(event)=>addNote(event,booking.id)} style={{marginTop:12}}><textarea name="body" rows={2} maxLength={4000} placeholder={ar?"ملاحظة الاستقبال":"Reception note"} required/><button className="secondaryButton" disabled={busyId===booking.id}>{ar?"إضافة ملاحظة":"Add note"}</button></form></section></article>)}</div>
  </>;
}

async function api<T>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{...init,cache:"no-store"});const body=await response.json();if(!response.ok||body.error)throw new Error(body.error?.message||"Request failed");return body.data as T;}
