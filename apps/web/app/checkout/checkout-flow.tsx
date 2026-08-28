"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Landmark, WalletCards } from "lucide-react";
import { guestMoney } from "@/lib/guest-currency";
import { guestDictionary, guestMarketCopy } from "@/lib/guest-i18n";
import type { GuestCurrency, GuestLocale } from "@/lib/guest-market";

type PaymentMode = "PAY_NOW" | "PAY_AT_HOTEL";
type Quote = {
  hotel:{id:string;name:string;currency:string};
  roomType:{id:string;name:string};
  ratePlan:{id:string;name:string;code:string};
  arrival:string;
  departure:string;
  occupancy:{adults:number;children:number};
  nights:number;
  amounts:{base:number;service:number;tax:number;total:number};
  promotion:{id:string;name:string;discountPercent:number}|null;
  allowedPaymentModes:PaymentMode[];
  cancellationPolicy:{name:string;rules:Array<{minimumDaysBeforeArrival:number;penaltyType:string;penaltyValue?:number|null}>;noShowPenaltyType:string;noShowPenaltyValue?:number|null};
  availableToSell:number;
};

type Wallet = {
  currency:string;
  balance:number;
  pointsPerJod:number;
  minimumRedemptionPoints:number;
  redemptionStepPoints:number;
  convertiblePoints:number;
  convertibleAmount:number;
};

type WalletApplyResult = {
  appliedNow:number;
  appliedAmount:number;
  remainingAmount:number;
  walletBalance:number;
  currency:string;
};

type Props = {locale:GuestLocale;targetCurrency:GuestCurrency;hotelId:string;roomTypeId:string;ratePlanId:string;arrival:string;departure:string;adults:number;children:number;initialGuestName:string;initialGuestEmail:string};

export function CheckoutFlow(props: Props) {
  const copy=guestDictionary(props.locale).checkout;
  const fxCopy=guestMarketCopy(props.locale);
  const ar=props.locale==="ar";
  const zh=props.locale==="zh";
  const [quote,setQuote] = useState<Quote|null>(null);
  const [wallet,setWallet] = useState<Wallet|null>(null);
  const [onlinePaymentAvailable,setOnlinePaymentAvailable] = useState(false);
  const [loading,setLoading] = useState(true);
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [guestName,setGuestName] = useState(props.initialGuestName);
  const [guestEmail,setGuestEmail] = useState(props.initialGuestEmail);
  const [paymentMode,setPaymentMode] = useState<PaymentMode|null>(null);
  const [useWallet,setUseWallet] = useState(false);
  const selection = {hotelId:props.hotelId,roomTypeId:props.roomTypeId,ratePlanId:props.ratePlanId,arrival:props.arrival,departure:props.departure,adults:props.adults,children:props.children};

  useEffect(() => {
    let active = true;
    Promise.all([
      requestJson<Quote>("/api/v1/booking-quotes", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(selection)}),
      requestJson<{onlinePaymentAvailable:boolean}>("/api/v1/payment-capabilities"),
      requestWallet(),
    ]).then(([nextQuote,capabilities,nextWallet]) => {
      if (!active) return;
      setQuote(nextQuote);
      setWallet(nextWallet);
      setOnlinePaymentAvailable(capabilities.onlinePaymentAvailable);
      const modes = nextQuote.allowedPaymentModes;
      if (modes.includes("PAY_AT_HOTEL")) setPaymentMode("PAY_AT_HOTEL");
      else if (modes.includes("PAY_NOW") && capabilities.onlinePaymentAvailable) setPaymentMode("PAY_NOW");
    }).catch((cause) => active && setError(messageFrom(cause,props.locale))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [props.hotelId,props.roomTypeId,props.ratePlanId,props.arrival,props.departure,props.adults,props.children,props.locale]);

  const payNowAllowed = Boolean(quote?.allowedPaymentModes.includes("PAY_NOW"));
  const payAtHotelAllowed = Boolean(quote?.allowedPaymentModes.includes("PAY_AT_HOTEL"));
  const walletUsable = Boolean(wallet && quote && wallet.currency === quote.hotel.currency && wallet.balance > 0);
  const walletPreview = quote && walletUsable && useWallet ? roundMoney(Math.min(wallet?.balance ?? 0, quote.amounts.total)) : 0;
  const remainingPreview = quote ? Math.max(0, roundMoney(quote.amounts.total - walletPreview)) : 0;
  const fullyCoveredByWallet = Boolean(quote && walletPreview > 0 && remainingPreview <= 0);
  const effectivePaymentMode: PaymentMode|null = fullyCoveredByWallet
    ? (payNowAllowed ? "PAY_NOW" : payAtHotelAllowed ? "PAY_AT_HOTEL" : null)
    : paymentMode;
  const noUsablePayment = !fullyCoveredByWallet && !payAtHotelAllowed && (!payNowAllowed || !onlinePaymentAvailable);
  const canSubmit = useMemo(() => Boolean(quote && effectivePaymentMode && guestName.trim().length >= 2 && guestEmail.includes("@") && !submitting && !noUsablePayment), [quote,effectivePaymentMode,guestName,guestEmail,submitting,noUsablePayment]);

  async function submit() {
    if (!quote || !effectivePaymentMode || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const holdKey = `hold-${crypto.randomUUID()}`;
      const hold = await requestJson<{booking:{id:string;status:string;holdExpiresAt:string|null};bookingAccessToken:string}>("/api/v1/bookings/holds", {
        method:"POST",
        headers:{"content-type":"application/json","idempotency-key":holdKey},
        body:JSON.stringify({...selection,guestName:guestName.trim(),guestEmail:guestEmail.trim(),paymentMode:effectivePaymentMode}),
      });
      sessionStorage.setItem(`booking-token:${hold.booking.id}`, hold.bookingAccessToken);

      let remainingAmount = quote.amounts.total;
      if (walletPreview > 0) {
        const walletResult = await requestJson<WalletApplyResult>(`/api/v1/bookings/${hold.booking.id}/wallet`, {
          method:"POST",
          headers:{"content-type":"application/json","idempotency-key":`wallet-${crypto.randomUUID()}`},
          body:JSON.stringify({amount:walletPreview}),
        });
        remainingAmount = walletResult.remainingAmount;
      }

      if (remainingAmount <= 0 || effectivePaymentMode === "PAY_AT_HOTEL") {
        await confirmHold(hold.booking.id,hold.bookingAccessToken);
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
        await confirmHold(hold.booking.id,hold.bookingAccessToken);
        window.location.assign(`/booking/${hold.booking.id}`);
        return;
      }
      setError(copy.paymentAction);
    } catch (cause) {
      setError(messageFrom(cause,props.locale));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="panel"><strong>{copy.checking}</strong></div>;
  if (error && !quote) return <div className="panel"><h3>{copy.loadFail}</h3><p className="danger">{error}</p></div>;
  if (!quote) return null;

  const display=(value:number)=>guestMoney(value,quote.hotel.currency,props.targetCurrency,props.locale);
  const totalDisplay=display(quote.amounts.total);
  const walletDisplay=display(walletPreview);
  const remainingDisplay=display(remainingPreview);

  return <div className="checkout walletCheckout">
    <div className="panel">
      <span className="eyebrow">{ar?"حجز من المخزون المباشر":zh?"实时房量预订":"Live inventory checkout"}</span>
      <h2>{copy.guestInfo}</h2>
      {(props.initialGuestName||props.initialGuestEmail)&&<p className="muted">{ar?"تمت تعبئة البيانات من حساب HandMeKey ويمكنك تعديل بيانات الضيف لهذا الحجز.":zh?"已从您的 HandMeKey 账户预填，您仍可修改本次预订的住客信息。":"Prefilled from your HandMeKey account. You can change the guest details for this booking."}</p>}
      <div className="formGrid">
        <input value={guestName} onChange={(event)=>setGuestName(event.target.value)} placeholder={copy.fullName} autoComplete="name"/>
        <input value={guestEmail} onChange={(event)=>setGuestEmail(event.target.value)} placeholder={copy.email} type="email" autoComplete="email"/>
      </div>

      <div className="walletPaymentHead"><div><span className="eyebrow">{ar?"طريقة الدفع":zh?"付款方式":"Payment method"}</span><h3>{ar?"اختر كيف تريد تسديد الحجز":zh?"选择付款方式":"Choose how to pay"}</h3></div></div>

      {walletUsable && wallet && <label className={`checkoutWalletOption ${useWallet?"active":""}`}>
        <input type="checkbox" checked={useWallet} onChange={(event)=>setUseWallet(event.target.checked)}/>
        <span className="checkoutWalletIcon"><WalletCards size={22}/></span>
        <span className="checkoutWalletCopy"><strong>HandMeKey Wallet</strong><small>{ar?"الرصيد المتاح":zh?"可用余额":"Available balance"} · {displayMoney(wallet.balance,wallet.currency,props.targetCurrency,props.locale,fxCopy.approx)}</small></span>
        <span className="checkoutWalletUse">{useWallet?(ar?"سيتم استخدامه":zh?"已应用":"Applied"):(ar?"استخدم الرصيد":zh?"使用余额":"Use balance")}</span>
      </label>}

      {!walletUsable && props.initialGuestEmail && <div className="checkoutWalletEmpty"><WalletCards size={18}/><div><strong>HandMeKey Wallet</strong><span>{ar?"لا يوجد رصيد متاح حاليًا. يمكنك تحويل نقاط Rewards إلى رصيد من صفحة المحفظة.":zh?"目前没有可用钱包余额。您可以在钱包页面将 Rewards 积分兑换为余额。":"No wallet balance is available yet. Convert Rewards points to credit from your Wallet page."}</span></div><a href="/account/wallet">{ar?"فتح المحفظة":zh?"打开钱包":"Open Wallet"}</a></div>}

      {useWallet && walletPreview > 0 && <div className="walletSplitPreview">
        <div><span>{ar?"من المحفظة":zh?"钱包支付":"From Wallet"}</span><strong>{walletDisplay.converted?`${fxCopy.approx} ${walletDisplay.text}`:walletDisplay.text}</strong></div>
        <div><span>{ar?"المتبقي بعد المحفظة":zh?"钱包抵扣后应付":"Remaining after Wallet"}</span><strong>{remainingDisplay.converted?`${fxCopy.approx} ${remainingDisplay.text}`:remainingDisplay.text}</strong></div>
        {fullyCoveredByWallet && <p>{ar?"رصيد المحفظة يغطي كامل الحجز. لن تحتاج إلى وسيلة دفع إضافية.":zh?"钱包余额已覆盖全部预订金额，无需其他付款方式。":"Your Wallet covers the full booking. No second payment method is needed."}</p>}
      </div>}

      {!fullyCoveredByWallet && <div className="checkoutSecondaryPayments">
        {payNowAllowed && <label className={`checkoutPaymentChoice ${paymentMode==="PAY_NOW"?"active":""} ${onlinePaymentAvailable?"":"disabled"}`}>
          <input type="radio" name="payment" disabled={!onlinePaymentAvailable} checked={paymentMode==="PAY_NOW"} onChange={()=>setPaymentMode("PAY_NOW")}/>
          <span><CreditCard size={19}/></span>
          <div><strong>{useWallet&&walletPreview>0?(ar?"ادفع الباقي بالبطاقة":zh?"用银行卡支付剩余金额":"Pay the remainder by card"):copy.payNow}</strong><small>{onlinePaymentAvailable?(useWallet&&walletPreview>0?(remainingDisplay.converted?`${fxCopy.approx} ${remainingDisplay.text}`:remainingDisplay.text):(ar?"دفع إلكتروني آمن الآن":zh?"立即安全在线支付":"Secure online payment now")):`${copy.gatewayMissing}`}</small></div>
        </label>}
        {payAtHotelAllowed && <label className={`checkoutPaymentChoice ${paymentMode==="PAY_AT_HOTEL"?"active":""}`}>
          <input type="radio" name="payment" checked={paymentMode==="PAY_AT_HOTEL"} onChange={()=>setPaymentMode("PAY_AT_HOTEL")}/>
          <span><Landmark size={19}/></span>
          <div><strong>{useWallet&&walletPreview>0?(ar?"ادفع الباقي عند الوصول":zh?"到店支付剩余金额":"Pay the remainder at the hotel"):copy.payHotel}</strong><small>{useWallet&&walletPreview>0?(remainingDisplay.converted?`${fxCopy.approx} ${remainingDisplay.text}`:remainingDisplay.text):(ar?"يتم تسديد المبلغ في الفندق وفق شروط السعر":zh?"按照此价格方案在住宿方付款":"Pay at the property under this rate plan")}</small></div>
        </label>}
      </div>}

      {noUsablePayment && <p className="danger">{copy.noPayment}</p>}
      {error && <p className="danger">{error}</p>}
      <button className="primary walletReserveButton" disabled={!canSubmit} onClick={submit}>{submitting?copy.securing:(fullyCoveredByWallet?(ar?"استخدم المحفظة وأكد الحجز":zh?"使用钱包并确认预订":"Pay with Wallet & confirm"):copy.reserve)}</button>
      <p className="muted">{copy.holdNote}</p>
    </div>
    <aside className="panel">
      <span className="eyebrow">{copy.yourStay}</span>
      <h2>{quote.hotel.name}</h2>
      <p>{quote.roomType.name} · {quote.ratePlan.name}</p>
      <p className="muted">{quote.arrival} — {quote.departure} · {quote.nights} {ar?(quote.nights===1?"ليلة":"ليالٍ"):zh?"晚":`night${quote.nights===1?"":"s"}`} · {quote.occupancy.adults} {ar?"بالغ":zh?"成人":`adult${quote.occupancy.adults===1?"":"s"}`}{quote.occupancy.children?` · ${quote.occupancy.children} ${ar?"أطفال":zh?"儿童":"children"}`:""}</p>
      {quote.promotion && <div className="alertCard" style={{marginBottom:14}}><div><strong>{quote.promotion.name}</strong><p>{quote.promotion.discountPercent}% {copy.offIncluded}</p></div></div>}
      <div className="breakdown"><span>{copy.roomBase}</span><strong>{displayMoney(quote.amounts.base,quote.hotel.currency,props.targetCurrency,props.locale,fxCopy.approx)}</strong></div>
      <div className="breakdown"><span>{copy.service}</span><strong>{displayMoney(quote.amounts.service,quote.hotel.currency,props.targetCurrency,props.locale,fxCopy.approx)}</strong></div>
      <div className="breakdown"><span>{copy.tax}</span><strong>{displayMoney(quote.amounts.tax,quote.hotel.currency,props.targetCurrency,props.locale,fxCopy.approx)}</strong></div>
      <div className="breakdown total"><span>{copy.final}</span><strong>{totalDisplay.converted?`${fxCopy.approx} ${totalDisplay.text}`:totalDisplay.text}</strong></div>
      {totalDisplay.converted&&<div className="checkoutFxNotice"><strong>{totalDisplay.sourceText}</strong><span>{fxCopy.charged}. {ar?"سعر التحويل المعروض تقريبي ولا يغيّر مبلغ الحجز الأصلي.":zh?"显示的换算金额仅供参考，不会改变原始预订金额。":"The converted display amount is indicative and does not change the original booking amount."}</span></div>}
      {walletPreview > 0 && <>
        <div className="breakdown checkoutWalletDeduction"><span>HandMeKey Wallet</span><strong>-{walletDisplay.converted?`${fxCopy.approx} ${walletDisplay.text}`:walletDisplay.text}</strong></div>
        <div className="breakdown checkoutAmountDue"><span>{ar?"المبلغ المتبقي":zh?"剩余应付":"Amount due"}</span><strong>{remainingDisplay.converted?`${fxCopy.approx} ${remainingDisplay.text}`:remainingDisplay.text}</strong></div>
      </>}
      <div style={{marginTop:22,paddingTop:18,borderTop:"1px solid var(--line)"}}>
        <strong>{copy.cancellation} · {quote.cancellationPolicy.name}</strong>
        {quote.cancellationPolicy.rules.map((rule)=><p className="muted" key={rule.minimumDaysBeforeArrival}>{policyLine(rule,props.locale)}</p>)}
        <p className="muted">{copy.noShow}: {penaltyLabel(quote.cancellationPolicy.noShowPenaltyType,quote.cancellationPolicy.noShowPenaltyValue,props.locale)}</p>
      </div>
      <p className="muted">{copy.inventory}: {quote.availableToSell}</p>
    </aside>
  </div>;
}

async function confirmHold(bookingId:string,token:string) {
  return requestJson(`/api/v1/bookings/${bookingId}/confirm`, {method:"POST",headers:{"idempotency-key":`confirm-${crypto.randomUUID()}`,"x-booking-token":token}});
}

async function requestWallet():Promise<Wallet|null> {
  const response = await fetch("/api/v1/wallet", {cache:"no-store"});
  if (response.status === 401) return null;
  const payload = await response.json().catch(()=>null) as {data?:Wallet;error?:{message?:string}}|null;
  if (!response.ok || !payload || payload.error) return null;
  return payload.data ?? null;
}

async function requestJson<T=unknown>(url:string, init?:RequestInit):Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(()=>null) as {data?:T;error?:{message?:string;code?:string}}|null;
  if (!response.ok || !payload || payload.error) throw new Error(payload?.error?.message || `Request failed (${response.status})`);
  return payload.data as T;
}

function messageFrom(value:unknown,locale:GuestLocale):string { return value instanceof Error ? value.message : locale==="ar"?"حدث خطأ غير متوقع":locale==="zh"?"发生了意外错误":"An unexpected error occurred"; }
function roundMoney(value:number):number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function displayMoney(value:number,sourceCurrency:string,targetCurrency:GuestCurrency,locale:GuestLocale,approx:string):string {const display=guestMoney(value,sourceCurrency,targetCurrency,locale);return display.converted?`${approx} ${display.text}`:display.text;}
function policyLine(rule:{minimumDaysBeforeArrival:number;penaltyType:string;penaltyValue?:number|null},locale:GuestLocale):string { return locale==="ar"?`${rule.minimumDaysBeforeArrival}+ يوم قبل الوصول: ${penaltyLabel(rule.penaltyType,rule.penaltyValue,locale)}`:locale==="zh"?`入住前 ${rule.minimumDaysBeforeArrival}+ 天：${penaltyLabel(rule.penaltyType,rule.penaltyValue,locale)}`:`${rule.minimumDaysBeforeArrival}+ day${rule.minimumDaysBeforeArrival===1?"":"s"} before arrival: ${penaltyLabel(rule.penaltyType,rule.penaltyValue,locale)}`; }
function penaltyLabel(type:string,value:number|null|undefined,locale:GuestLocale):string {
  const ar=locale==="ar",zh=locale==="zh";
  if(type==="NONE") return ar?"إلغاء مجاني":zh?"免费取消":"free cancellation";
  if(type==="FIRST_NIGHT") return ar?"رسوم الليلة الأولى":zh?"收取首晚费用":"first-night penalty";
  if(type==="FULL_STAY") return ar?"رسوم كامل الإقامة":zh?"收取全程费用":"full-stay penalty";
  if(type==="PERCENTAGE") return ar?`رسوم ${Math.round((value??0)*100)}%`:zh?`收取 ${Math.round((value??0)*100)}%`:`${Math.round((value??0)*100)}% penalty`;
  if(type==="FIXED_AMOUNT") return ar?`رسوم ثابتة ${Number(value??0).toFixed(2)}`:zh?`固定费用 ${Number(value??0).toFixed(2)}`:`${Number(value??0).toFixed(2)} fixed penalty`;
  return type;
}
