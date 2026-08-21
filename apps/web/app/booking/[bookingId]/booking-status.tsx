"use client";

import { useEffect, useState } from "react";

type Booking = {
  id:string;reference:string;status:string;paymentState:string;paymentMode:string;currency:string;
  hotel:{id:string;name:string};roomType:{id:string;name:string};ratePlan:{id:string;name:string};
  arrival:string;departure:string;amounts:{base:number;service:number;tax:number;total:number};
  holdExpiresAt:string|null;confirmedAt:string|null;cancelledAt:string|null;
  cancellation:{policy:{name:string};penaltyAmount:number;refundableAmount:number|null};
};

export function BookingStatus({bookingId}:{bookingId:string}) {
  const [booking,setBooking] = useState<Booking|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    const token = sessionStorage.getItem(`booking-token:${bookingId}`);
    fetch(`/api/v1/bookings/${bookingId}`, {headers:token?{"x-booking-token":token}:{}})
      .then(async(response)=>{const body=await response.json();if(!response.ok||body.error)throw new Error(body.error?.message||"Unable to load booking");return body.data as Booking;})
      .then(setBooking).catch((cause)=>setError(cause instanceof Error?cause.message:"Unable to load booking")).finally(()=>setLoading(false));
  },[bookingId]);

  if(loading) return <div className="panel"><strong>Loading your booking…</strong></div>;
  if(error) return <div className="panel"><h3>Booking access required</h3><p className="danger">{error}</p><p className="muted">Open this page from the browser used to create the booking, or sign in to the account that owns it.</p></div>;
  if(!booking) return null;

  return <div className="checkout">
    <div className="panel">
      <span className="eyebrow">Booking {booking.reference}</span>
      <h1>{booking.status}</h1>
      <p><strong>{booking.hotel.name}</strong></p>
      <p>{booking.roomType.name} · {booking.ratePlan.name}</p>
      <p className="muted">{booking.arrival} — {booking.departure}</p>
      {booking.status==="HOLD" && <p className="danger">Your room is temporarily held{booking.holdExpiresAt?` until ${new Date(booking.holdExpiresAt).toLocaleTimeString()}`:""}. It is not confirmed yet.</p>}
      {booking.paymentState==="PENDING" && <p className="muted">Online payment is awaiting provider completion.</p>}
      {booking.paymentState==="CAPTURED" && booking.status==="HOLD" && <p className="muted">Payment is captured and booking confirmation is pending.</p>}
      {(booking.status==="CONFIRMED" || booking.status==="MODIFIED") && <p className="status">Confirmed</p>}
      <div style={{marginTop:24}}><strong>Cancellation policy</strong><p className="muted">{booking.cancellation.policy.name}</p></div>
    </div>
    <aside className="panel">
      <span className="eyebrow">Price summary</span>
      <div className="breakdown"><span>Room base</span><strong>{money(booking.amounts.base,booking.currency)}</strong></div>
      <div className="breakdown"><span>Employee service</span><strong>{money(booking.amounts.service,booking.currency)}</strong></div>
      <div className="breakdown"><span>Tax / charges</span><strong>{money(booking.amounts.tax,booking.currency)}</strong></div>
      <div className="breakdown total"><span>Total</span><strong>{money(booking.amounts.total,booking.currency)}</strong></div>
      <p className="muted">Payment mode: {booking.paymentMode==="PAY_AT_HOTEL"?"Pay at hotel":"Pay now"}</p>
    </aside>
  </div>;
}

function money(value:number,currency:string){return `${value.toFixed(2)} ${currency}`;}
