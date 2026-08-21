"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentMode = "PAY_NOW" | "PAY_AT_HOTEL";
type Quote = {
  hotel:{id:string;name:string;currency:string};
  roomType:{id:string;name:string};
  ratePlan:{id:string;name:string;code:string};
  arrival:string;
  departure:string;
  nights:number;
  amounts:{base:number;service:number;tax:number;total:number};
  allowedPaymentModes:PaymentMode[];
  cancellationPolicy:{name:string;rules:Array<{minimumDaysBeforeArrival:number;penaltyType:string;penaltyValue?:number|null}>;noShowPenaltyType:string;noShowPenaltyValue?:number|null};
  availableToSell:number;
};

type Props = {hotelId:string;roomTypeId:string;ratePlanId:string;arrival:string;departure:string};

export function CheckoutFlow(props: Props) {
  const [quote,setQuote] = useState<Quote|null>(null);
  const [onlinePaymentAvailable,setOnlinePaymentAvailable] = useState(false);
  const [loading,setLoading] = useState(true);
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [guestName,setGuestName] = useState("");
  const [guestEmail,setGuestEmail] = useState("");
  const [paymentMode,setPaymentMode] = useState<PaymentMode|null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      requestJson<Quote>("/api/v1/booking-quotes", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(props)}),
      requestJson<{onlinePaymentAvailable:boolean}>("/api/v1/payment-capabilities"),
    ]).then(([nextQuote,capabilities]) => {
      if (!active) return;
      setQuote(nextQuote);
      setOnlinePaymentAvailable(capabilities.onlinePaymentAvailable);
      const modes = nextQuote.allowedPaymentModes;
      if (modes.includes("PAY_AT_HOTEL")) setPaymentMode("PAY_AT_HOTEL");
      else if (modes.includes("PAY_NOW") && capabilities.onlinePaymentAvailable) setPaymentMode("PAY_NOW");
    }).catch((cause) => active && setError(messageFrom(cause))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [props.hotelId,props.roomTypeId,props.ratePlanId,props.arrival,props.departure]);

  const canSubmit = useMemo(() => Boolean(quote && paymentMode && guestName.trim().length >= 2 && guestEmail.includes("@") && !submitting), [quote,paymentMode,guestName,guestEmail,submitting]);

  async function submit() {
    if (!quote || !paymentMode || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const holdKey = `hold-${crypto.randomUUID()}`;
      const hold = await requestJson<{booking:{id:string;status:string;holdExpiresAt:string|null};bookingAccessToken:string}>("/api/v1/bookings/holds", {
        method:"POST",
        headers:{"content-type":"application/json","idempotency-key":holdKey},
        body:JSON.stringify({...props,guestName:guestName.trim(),guestEmail:guestEmail.trim(),paymentMode}),
      });
      sessionStorage.setItem(`booking-token:${hold.booking.id}`, hold.bookingAccessToken);

      if (paymentMode === "PAY_AT_HOTEL") {
        await requestJson(`/api/v1/bookings/${hold.booking.id}/confirm`, {method:"POST",headers:{"idempotency-key":`confirm-${crypto.randomUUID()}`,"x-booking-token":hold.bookingAccessToken}});
        window.location.assign(`/booking/${hold.booking.id}`);
        return;
      }

      const payment = await requestJson<{status:string;redirectUrl:string|null}>(`/api/v1/bookings/${hold.booking.id}/payments`, {
        method:"POST",
        headers:{"content-type":"application/json","idempotency-key":`payment-${crypto.randomUUID()}`,"x-booking-token":hold.bookingAccessToken},
        body:JSON.stringify({returnUrl:`${window.location.origin}/booking/${hold.booking.id}?payment=return`}),
      });
      if (payment.redirectUrl) {
        window.location.assign(payment.redirectUrl);
        return;
      }
      if (payment.status === "CAPTURED") {
        await requestJson(`/api/v1/bookings/${hold.booking.id}/confirm`, {method:"POST",headers:{"idempotency-key":`confirm-${crypto.randomUUID()}`,"x-booking-token":hold.bookingAccessToken}});
        window.location.assign(`/booking/${hold.booking.id}`);
        return;
      }
      setError("Payment was started but requires a provider action before the booking can be confirmed.");
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="panel"><strong>Checking live rate and availability…</strong></div>;
  if (error && !quote) return <div className="panel"><h3>We could not load this stay</h3><p className="danger">{error}</p></div>;
  if (!quote) return null;

  const payNowAllowed = quote.allowedPaymentModes.includes("PAY_NOW");
  const payAtHotelAllowed = quote.allowedPaymentModes.includes("PAY_AT_HOTEL");
  const noUsablePayment = !payAtHotelAllowed && (!payNowAllowed || !onlinePaymentAvailable);

  return <div className="checkout">
    <div className="panel">
      <span className="eyebrow">Live inventory checkout</span>
      <h2>Guest information</h2>
      <div className="formGrid">
        <input value={guestName} onChange={(event)=>setGuestName(event.target.value)} placeholder="Full name" autoComplete="name"/>
        <input value={guestEmail} onChange={(event)=>setGuestEmail(event.target.value)} placeholder="Email" type="email" autoComplete="email"/>
      </div>
      <h3 style={{marginTop:28}}>Payment option</h3>
      {payAtHotelAllowed && <label style={{display:"block",marginBottom:12}}><input type="radio" name="payment" checked={paymentMode==="PAY_AT_HOTEL"} onChange={()=>setPaymentMode("PAY_AT_HOTEL")}/> Pay at hotel</label>}
      {payNowAllowed && <label style={{display:"block",marginBottom:12,opacity:onlinePaymentAvailable?1:.55}}><input type="radio" name="payment" disabled={!onlinePaymentAvailable} checked={paymentMode==="PAY_NOW"} onChange={()=>setPaymentMode("PAY_NOW")}/> Pay now {onlinePaymentAvailable?"":"— online gateway not configured"}</label>}
      {noUsablePayment && <p className="danger">This rate currently requires online payment, but no payment provider is configured for this deployment.</p>}
      {error && <p className="danger">{error}</p>}
      <button className="primary" style={{width:"100%",marginTop:22}} disabled={!canSubmit || noUsablePayment} onClick={submit}>{submitting?"Securing your room…":"Reserve and continue"}</button>
      <p className="muted">Your room is reserved with a temporary server-side hold. The final rate is revalidated before inventory is reduced.</p>
    </div>
    <aside className="panel">
      <span className="eyebrow">Your stay</span>
      <h2>{quote.hotel.name}</h2>
      <p>{quote.roomType.name} · {quote.ratePlan.name}</p>
      <p className="muted">{quote.arrival} — {quote.departure} · {quote.nights} night{quote.nights===1?"":"s"}</p>
      <div className="breakdown"><span>Room base</span><strong>{money(quote.amounts.base,quote.hotel.currency)}</strong></div>
      <div className="breakdown"><span>Employee service</span><strong>{money(quote.amounts.service,quote.hotel.currency)}</strong></div>
      <div className="breakdown"><span>Tax / mandatory charges</span><strong>{money(quote.amounts.tax,quote.hotel.currency)}</strong></div>
      <div className="breakdown total"><span>Final total</span><strong>{money(quote.amounts.total,quote.hotel.currency)}</strong></div>
      <div style={{marginTop:22,paddingTop:18,borderTop:"1px solid var(--line)"}}>
        <strong>Cancellation · {quote.cancellationPolicy.name}</strong>
        {quote.cancellationPolicy.rules.map((rule)=><p className="muted" key={rule.minimumDaysBeforeArrival}>{policyLine(rule)}</p>)}
        <p className="muted">No-show: {penaltyLabel(quote.cancellationPolicy.noShowPenaltyType,quote.cancellationPolicy.noShowPenaltyValue)}</p>
      </div>
      <p className="muted">Live sellable inventory: {quote.availableToSell}</p>
    </aside>
  </div>;
}

async function requestJson<T=unknown>(url:string, init?:RequestInit):Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(()=>null) as {data?:T;error?:{message?:string;code?:string}}|null;
  if (!response.ok || !payload || payload.error) throw new Error(payload?.error?.message || `Request failed (${response.status})`);
  return payload.data as T;
}

function messageFrom(value:unknown):string { return value instanceof Error ? value.message : "An unexpected error occurred"; }
function money(value:number,currency:string):string { return `${value.toFixed(2)} ${currency}`; }
function policyLine(rule:{minimumDaysBeforeArrival:number;penaltyType:string;penaltyValue?:number|null}):string { return `${rule.minimumDaysBeforeArrival}+ day${rule.minimumDaysBeforeArrival===1?"":"s"} before arrival: ${penaltyLabel(rule.penaltyType,rule.penaltyValue)}`; }
function penaltyLabel(type:string,value?:number|null):string {
  if(type==="NONE") return "free cancellation";
  if(type==="FIRST_NIGHT") return "first-night penalty";
  if(type==="FULL_STAY") return "full-stay penalty";
  if(type==="PERCENTAGE") return `${Math.round((value??0)*100)}% penalty`;
  if(type==="FIXED_AMOUNT") return `${Number(value??0).toFixed(2)} fixed penalty`;
  return type;
}
