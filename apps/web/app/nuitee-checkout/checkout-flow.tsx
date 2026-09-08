"use client";

import {useMemo,useState} from "react";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency,GuestLocale} from "@/lib/guest-market";

type Props=Readonly<{prebookId:string;transactionId:string;secretKey:string;hotelName:string;roomName:string|null;boardName:string|null;arrival:string;departure:string;price:number;sourceCurrency:string;locale:GuestLocale;currency:GuestCurrency;sandbox:boolean}>;
type LiteApiPaymentConfig={publicKey:"live"|"sandbox";appearance:{theme:string};options:{business:{name:string}};targetElement:string;secretKey:string;returnUrl:string};
type StoredCheckout={prebookId:string;transactionId:string;firstName:string;lastName:string;email:string;phone?:string;hotelName:string;roomName:string|null;arrival:string;departure:string;sandbox:boolean};

declare global{
  interface Window{
    LiteAPIPayment?:new(config:LiteApiPaymentConfig)=>{handlePayment:()=>void|Promise<void>};
  }
}

const SDK_SRC="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";
const STORAGE_PREFIX="handmekey:nuitee-payment:";

export function NuiteeCheckoutFlow(props:Props){
  const {prebookId,transactionId,secretKey,hotelName,roomName,boardName,arrival,departure,price,sourceCurrency,locale,currency,sandbox}=props;
  const [firstName,setFirstName]=useState("");
  const [lastName,setLastName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [busy,setBusy]=useState(false);
  const [paymentOpen,setPaymentOpen]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const ar=locale==="ar";
  const total=guestMoney(price,sourceCurrency,currency,locale);
  const canSubmit=useMemo(()=>firstName.trim().length>1&&lastName.trim().length>1&&email.includes("@")&&!busy&&!paymentOpen,[firstName,lastName,email,busy,paymentOpen]);

  async function startPayment(){
    if(!canSubmit)return;
    setBusy(true);setError(null);
    try{
      const checkout:StoredCheckout={prebookId,transactionId,firstName:firstName.trim(),lastName:lastName.trim(),email:email.trim(),...(phone.trim()?{phone:phone.trim()}:{}),hotelName,roomName,arrival,departure,sandbox};
      sessionStorage.setItem(`${STORAGE_PREFIX}${transactionId}`,JSON.stringify(checkout));
      await loadPaymentSdk();
      if(!window.LiteAPIPayment)throw new Error("Nuitee payment SDK did not initialize");
      setPaymentOpen(true);
      await nextPaint();
      const target=document.querySelector("#nuitee-payment-target");
      if(!target)throw new Error("Payment container is unavailable");
      target.innerHTML="";
      const returnUrl=`${window.location.origin}/nuitee-payment-return?tid=${encodeURIComponent(transactionId)}`;
      const payment=new window.LiteAPIPayment({
        publicKey:sandbox?"sandbox":"live",
        appearance:{theme:"flat"},
        options:{business:{name:"HandMeKey"}},
        targetElement:"#nuitee-payment-target",
        secretKey,
        returnUrl,
      });
      await Promise.resolve(payment.handlePayment());
    }catch(cause){
      setPaymentOpen(false);
      setError(cause instanceof Error?cause.message:(ar?"تعذر تحميل الدفع الآمن":"Could not load secure payment"));
      sessionStorage.removeItem(`${STORAGE_PREFIX}${transactionId}`);
    }finally{setBusy(false);}
  }

  return <div className="checkout"><div className="panel"><span className="eyebrow">{sandbox?"Nuitee Sandbox":"Nuitee Connect · Live"}</span><h2>{ar?"بيانات الضيف والدفع":"Guest details & secure payment"}</h2><div className="formGrid"><label>{ar?"الاسم الأول":"First name"}<input value={firstName} onChange={(e)=>setFirstName(e.target.value)} autoComplete="given-name" disabled={paymentOpen}/></label><label>{ar?"اسم العائلة":"Last name"}<input value={lastName} onChange={(e)=>setLastName(e.target.value)} autoComplete="family-name" disabled={paymentOpen}/></label><label>{ar?"البريد الإلكتروني":"Email"}<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" disabled={paymentOpen}/></label><label>{ar?"الهاتف":"Phone"}<input value={phone} onChange={(e)=>setPhone(e.target.value)} autoComplete="tel" disabled={paymentOpen}/></label></div>{error&&<p className="danger">{error}</p>}{!paymentOpen&&<button className="primary" style={{width:"100%",marginTop:22}} disabled={!canSubmit} onClick={startPayment}>{busy?(ar?"جارٍ فتح الدفع…":"Opening secure payment…"):(ar?"المتابعة إلى الدفع الآمن":"Continue to secure payment")}</button>}{paymentOpen&&<div style={{marginTop:22}}><p className="muted">{ar?"أكمل الدفع أدناه. بعد نجاح الدفع سيتم تحويلك تلقائياً لتأكيد الحجز مع الفندق.":"Complete payment below. After payment succeeds you will be redirected automatically to finalize the hotel reservation."}</p>{sandbox&&<p className="muted">Sandbox: use 4242 4242 4242 4242, any future expiry and any 3-digit CVC.</p>}<div id="nuitee-payment-target"/></div>}</div><aside className="panel"><span className="eyebrow">{ar?"ملخص الإقامة":"Stay summary"}</span><h2>{hotelName}</h2><p>{roomName??(ar?"غرفة الفندق":"Hotel room")}{boardName?` · ${boardName}`:""}</p><p className="muted">{arrival} — {departure}</p><div className="breakdown total"><span>{ar?"المبلغ المستحق":"Amount due"}</span><strong>{total.text}</strong></div>{total.converted&&<p className="muted">{total.sourceText}</p>}<p className="muted">{ar?"تم تثبيت السعر عبر Nuitee Prebook. بيانات البطاقة تتم معالجتها داخل بوابة Nuitee الآمنة ولا تمر عبر خادم HandMeKey.":"The rate is locked by Nuitee Prebook. Card details are handled inside Nuitee's secure payment portal and do not pass through HandMeKey's server."}</p></aside></div>;
}

function loadPaymentSdk():Promise<void>{
  if(window.LiteAPIPayment)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>(`script[src^="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js"]`);
    if(existing){
      existing.addEventListener("load",()=>resolve(),{once:true});
      existing.addEventListener("error",()=>reject(new Error("Could not load Nuitee payment SDK")),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.src=SDK_SRC;script.async=true;
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error("Could not load Nuitee payment SDK"));
    document.head.appendChild(script);
  });
}
function nextPaint():Promise<void>{return new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}
