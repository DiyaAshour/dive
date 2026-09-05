"use client";

import {useMemo, useState} from "react";
import type {HotelbedsHotelDetails, HotelbedsOffer} from "@platform/server";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency, GuestLocale} from "@/lib/guest-market";

type Props = Readonly<{hotel: HotelbedsHotelDetails; offer: HotelbedsOffer; arrival: string; departure: string; adults: number; children: number; childrenAges: readonly number[]; locale: GuestLocale; currency: GuestCurrency; onlinePaymentAvailable: boolean; checkoutQuote: string; rateComments: string | null}>;

export function HotelbedsCheckoutFlow({hotel, offer, arrival, departure, adults, children, childrenAges, locale, currency, onlinePaymentAvailable, checkoutQuote, rateComments}: Props) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ar = locale === "ar";
  const paymentMode: "PAY_AT_HOTEL" | "PAY_NOW" = offer.paymentModes.includes("PAY_AT_HOTEL") ? "PAY_AT_HOTEL" : "PAY_NOW";
  const total = guestMoney(offer.total,offer.currency,currency,locale);
  const canSubmit = useMemo(() => guestName.trim().length >= 2 && guestEmail.includes("@") && !busy && (paymentMode === "PAY_AT_HOTEL" || onlinePaymentAvailable), [guestName, guestEmail, busy, paymentMode, onlinePaymentAvailable]);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/api-bookings", {method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({
        hotelCode: hotel.providerHotelCode, hotelName: hotel.name, city: hotel.city, roomName: offer.roomName, boardName: offer.boardName ?? offer.boardCode ?? undefined, rateType: offer.rateType, rateKey: offer.rateKey, quoteSignature: offer.quoteSignature ?? undefined, quotePaymentModes: offer.paymentModes, checkoutQuote,
        guestName: guestName.trim(), guestEmail: guestEmail.trim(), phone: phone.trim() || undefined, arrival, departure, adults, children, childrenAges, currency: offer.currency, netAmount: offer.net,
        sellingAmount: offer.sellingRate, totalAmount: offer.total, paymentMode, cancellationPolicy: offer.cancellationPolicy,
      })});
      const payload = await response.json().catch(() => null) as {data?: {id: string; status?: string; payment?: {status?: string; redirectUrl?: string | null}}; error?: {message?: string}} | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? `Booking failed (${response.status})`);
      if (payload.data.payment?.redirectUrl) {
        window.location.assign(payload.data.payment.redirectUrl);
        return;
      }
      window.location.assign(`/api-booking/${payload.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر تأكيد حجز Hotelbeds" : "Hotelbeds could not confirm the booking"));
      setBusy(false);
    }
  }

  return <div className="checkout">
    <div className="panel"><span className="eyebrow">{ar ? "بيانات الضيف" : "Guest details"}</span><h2>{ar ? "من سيقيم؟" : "Who is staying?"}</h2><div className="formGrid"><label>{ar ? "الاسم الكامل" : "Full name"}<input value={guestName} onChange={(event) => setGuestName(event.target.value)} autoComplete="name" required/></label><label>{ar ? "البريد الإلكتروني" : "Email"}<input value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} type="email" autoComplete="email" required/></label></div><label style={{display:"block",marginTop:16}}>{ar ? "الهاتف" : "Phone"} <span className="muted">({ar ? "اختياري" : "optional"})</span><input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel"/></label>{rateComments&&<div style={{marginTop:22,padding:"16px",border:"1px solid var(--line)",borderRadius:12}}><strong>{ar ? "ملاحظات وشروط المزود" : "Provider rate comments"}</strong><p className="muted" style={{whiteSpace:"pre-line"}}>{rateComments}</p></div>}<h3 style={{marginTop:28}}>{ar ? "الدفع" : "Payment"}</h3><p>{paymentMode === "PAY_AT_HOTEL" ? (ar ? "الدفع في الفندق — السعر يدعم هذا الخيار." : "Pay at hotel — the provider rate supports this option.") : (ar ? "هذا السعر يتطلب دفعًا إلكترونيًا." : "This rate requires online payment.")}</p>{paymentMode === "PAY_NOW" && !onlinePaymentAvailable && <p className="danger">{ar ? "الدفع الإلكتروني غير مفعّل لحجوزات Hotelbeds حتى الآن. اختر سعر الدفع في الفندق." : "Online payment is not configured for Hotelbeds API bookings yet. Choose a pay-at-hotel rate from search."}</p>}{error && <p className="danger">{error}</p>}<button className="primary" style={{width:"100%",marginTop:22}} disabled={!canSubmit} onClick={submit}>{busy ? (ar ? "جارٍ التأكيد…" : "Confirming with Hotelbeds…") : paymentMode === "PAY_NOW" ? (ar ? "المتابعة إلى الدفع الآمن" : "Continue to secure payment") : (ar ? "تأكيد حجز Hotelbeds" : "Confirm Hotelbeds booking")}</button></div>
    <aside className="panel"><span className="eyebrow">{ar ? "إقامتك لدى المزود" : "Your provider stay"}</span><h2>{hotel.name}</h2><p>{hotel.city} · {offer.roomName}</p><p className="muted">{arrival} — {departure} · {adults} {ar ? "بالغ" : adults === 1 ? "adult" : "adults"}{children ? ` · ${children} ${ar ? "طفل" : children === 1 ? "child" : "children"}` : ""}</p><div className="breakdown"><span>{ar ? "المتاح لدى Hotelbeds" : "Hotelbeds allotment"}</span><strong>{offer.availableToSell} {ar ? "غرفة" : offer.availableToSell === 1 ? "room" : "rooms"}</strong></div><div className="breakdown"><span>{ar ? "صافي Hotelbeds" : "Hotelbeds net"}</span><strong>{guestMoney(offer.net,offer.currency,currency,locale).text}</strong></div>{offer.sellingRate !== null && <div className="breakdown"><span>{ar ? "سعر المزود" : "Provider selling rate"}</span><strong>{guestMoney(offer.sellingRate,offer.currency,currency,locale).text}</strong></div>}<div className="breakdown total"><span>{ar ? "الإجمالي النهائي" : "Final provider total"}</span><strong>{total.text}</strong></div>{total.converted&&<p className="muted">{total.sourceText} · {ar ? "تحويل عرضي" : "display conversion"}</p>}<div style={{marginTop:22,paddingTop:18,borderTop:"1px solid var(--line)"}}><strong>{ar ? "الإلغاء" : "Cancellation"} · {offer.cancellationPolicy.name}</strong>{offer.cancellationPolicy.rules.map((rule,index)=><p className="muted" key={`${rule.from ?? "none"}-${index}`}>{guestMoney(rule.amount,offer.currency,currency,locale).text}{rule.from ? ` · ${ar ? "من" : "from"} ${providerLocalDeadline(rule.from)}` : ""}</p>)}<p className="muted">{ar ? "مواعيد الإلغاء معروضة كما أرسلها المزود مع فرق التوقيت الخاص بالوجهة، بدون تحويلها إلى توقيت جهازك." : "Cancellation deadlines are shown with the provider/destination offset and are not converted to your device timezone."}</p></div><p className="muted">{ar ? "يتم حفظ حجز المزود منفصلًا عن حجوزات فنادق الشركاء." : "This provider booking is stored separately from partner-property bookings."}</p></aside>
  </div>;
}

function providerLocalDeadline(value: string): string {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)?$/);
  if (!match) return normalized;
  const [,date,time,offset] = match;
  return `${date} ${time}${offset ? ` ${offset}` : ""}`;
}
