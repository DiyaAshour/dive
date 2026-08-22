"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Arrival = {expectedArrivalTime:string|null;arrivalStatus:string;status:string};
type GuestRequest = {id:string;category:string;message:string;status:string;createdAt:string};
type BookingMessage = {id:string;senderKind:"GUEST"|"HOTEL";body:string;createdAt:string};
type ReviewEligibility = {eligible:boolean;alreadyReviewed:boolean;departure:string;today:string};
type Props = {bookingId:string};

export function GuestTools({bookingId}:Props) {
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
    }).catch((error)=>setMessage(error instanceof Error?error.message:"Unable to load guest tools"));
  },[bookingId]);

  async function saveArrival(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try {
      const result=await api<Arrival>(`/api/v1/bookings/${bookingId}/arrival`,{method:"PUT",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({expectedArrivalTime:String(form.get("arrival")||"")||null})});
      setArrival(result);setMessage("Expected arrival updated");
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to update arrival");} finally{setBusy(false);}
  }

  async function addRequest(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try {
      const created=await api<GuestRequest>(`/api/v1/bookings/${bookingId}/requests`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({category:String(form.get("category")),message:String(form.get("message"))})});
      setRequests((current)=>[...current,created]);formElement.reset();setMessage("Request sent to the hotel");
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to send request");} finally{setBusy(false);}
  }

  async function sendMessage(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    try {
      const created=await api<BookingMessage>(`/api/v1/bookings/${bookingId}/messages`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({body:String(form.get("body"))})});
      setMessages((current)=>[...current,created]);formElement.reset();
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to send message");} finally{setBusy(false);}
  }

  async function submitReview(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const score=(name:string)=>Number(form.get(name));
    try {
      await api(`/api/v1/bookings/${bookingId}/review`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({overall:score("overall"),cleanliness:score("cleanliness"),staff:score("staff"),location:score("location"),facilities:score("facilities"),comfort:score("comfort"),value:score("value"),title:String(form.get("title")||"")||null,comment:String(form.get("comment"))})});
      setReviewEligibility((current)=>current?{...current,eligible:false,alreadyReviewed:true}:current);setMessage("Thank you. Your verified-stay review is published.");
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to submit review");} finally{setBusy(false);}
  }

  async function linkAccount() {
    setBusy(true);setMessage(null);
    try {await api(`/api/v1/bookings/${bookingId}/link-account`,{method:"POST",headers:accessHeaders(bookingId)});setMessage("Booking linked to your account. It will now appear in My Trips.");}
    catch(error){setMessage(error instanceof Error?error.message:"Unable to link booking");} finally{setBusy(false);}
  }

  async function cancelReservation() {
    setBusy(true);setMessage(null);
    try {
      const preview=await api<{penaltyAmount:number;refundableAmount:number;alreadyCancelled:boolean}>(`/api/v1/bookings/${bookingId}/cancellation`,{headers:accessHeaders(bookingId)});
      if(preview.alreadyCancelled){setMessage("This reservation is already cancelled");return;}
      const approved=window.confirm(`Cancellation penalty: ${preview.penaltyAmount.toFixed(2)}. Refundable amount: ${preview.refundableAmount.toFixed(2)}. Continue?`);
      if(!approved)return;
      await api(`/api/v1/bookings/${bookingId}/cancel`,{method:"POST",headers:{...accessHeaders(bookingId),"idempotency-key":crypto.randomUUID()}});
      setMessage("Reservation cancelled. Reloading booking status…");window.setTimeout(()=>window.location.reload(),500);
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to cancel reservation");} finally{setBusy(false);}
  }

  return <div className="grid2" style={{marginTop:24}}>
    <section className="panel"><span className="eyebrow">Arrival</span><h3>Expected arrival</h3><p className="muted">Time is stored in the hotel local timezone.</p><form className="stackForm" onSubmit={saveArrival}><label>Arrival time<input key={arrival?.expectedArrivalTime??"none"} name="arrival" type="time" defaultValue={arrival?.expectedArrivalTime??""} disabled={arrival?.arrivalStatus==="ARRIVED"}/></label><button className="primaryButton" disabled={busy||arrival?.arrivalStatus==="ARRIVED"}>{arrival?.arrivalStatus==="ARRIVED"?"Guest marked arrived":"Save arrival time"}</button></form></section>
    <section className="panel"><span className="eyebrow">Guest requests</span><h3>Requests for the hotel</h3><div className="stackForm">{requests.length===0?<p className="muted">No requests yet.</p>:requests.map((request)=><div key={request.id} className="alertCard"><div><strong>{request.category} · {request.status}</strong><p>{request.message}</p></div></div>)}</div><form className="stackForm" onSubmit={addRequest} style={{marginTop:16}}><label>Category<select name="category" defaultValue="OTHER"><option value="ARRIVAL">Arrival</option><option value="BEDDING">Bedding</option><option value="ACCESSIBILITY">Accessibility</option><option value="TRANSPORT">Transport</option><option value="OTHER">Other</option></select></label><label>Request<textarea name="message" rows={3} required maxLength={2000}/></label><button className="secondaryButton" disabled={busy}>Send request</button></form></section>
    <section className="panel"><span className="eyebrow">Messages</span><h3>Message the hotel</h3><div className="stackForm" style={{maxHeight:300,overflow:"auto"}}>{messages.length===0?<p className="muted">No messages yet.</p>:messages.map((item)=><div className="alertCard" key={item.id}><div><strong>{item.senderKind==="HOTEL"?"Hotel":"You"}</strong><p>{item.body}</p><small className="muted">{new Date(item.createdAt).toLocaleString()}</small></div></div>)}</div><form className="stackForm" onSubmit={sendMessage} style={{marginTop:12}}><textarea name="body" required maxLength={4000} rows={3} placeholder="Ask the hotel about your confirmed reservation"/><button className="secondaryButton" disabled={busy}>Send message</button></form></section>
    <section className="panel"><span className="eyebrow">Verified stay review</span><h3>Rate your stay</h3>{reviewEligibility?.alreadyReviewed?<p className="status">You already reviewed this stay.</p>:reviewEligibility?.eligible?<form className="stackForm" onSubmit={submitReview}><div className="formGrid">{["overall","cleanliness","staff","location","facilities","comfort","value"].map((field)=><label key={field}>{label(field)}<select name={field} defaultValue="10">{Array.from({length:10},(_,index)=>10-index).map((score)=><option key={score} value={score}>{score}/10</option>)}</select></label>)}</div><label>Title<input name="title" maxLength={120}/></label><label>Review<textarea name="comment" rows={4} minLength={10} maxLength={5000} required/></label><button className="primaryButton" disabled={busy}>Publish verified review</button></form>:<p className="muted">Reviews become available after the stay is completed.</p>}</section>
    <section className="panel"><span className="eyebrow">Account</span><h3>Keep this trip</h3><p className="muted">If this booking was created as a guest, link it to the signed-in account with the booking access token.</p><button className="secondaryButton" onClick={linkAccount} disabled={busy}>Add to My Trips</button></section>
    <section className="panel"><span className="eyebrow">Booking management</span><h3>Cancellation</h3><p className="muted">The platform calculates the stored cancellation policy before cancellation is submitted.</p><button className="secondaryButton" onClick={cancelReservation} disabled={busy}>Preview & cancel reservation</button></section>
    {message&&<div className="setupMessage" style={{gridColumn:"1 / -1"}}>{message}</div>}
  </div>;
}

function label(value:string):string{return value.charAt(0).toUpperCase()+value.slice(1);}
function accessHeaders(bookingId:string):Record<string,string>{const token=sessionStorage.getItem(`booking-token:${bookingId}`);return token?{"x-booking-token":token}:{};}
async function api<T=unknown>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{...init,cache:"no-store"});const body=await response.json();if(!response.ok||body.error)throw new Error(body.error?.message||"Request failed");return body.data as T;}
