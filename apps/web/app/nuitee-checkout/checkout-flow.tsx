"use client";

import {useMemo,useState} from "react";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency,GuestLocale} from "@/lib/guest-market";

type Props=Readonly<{checkoutProof:string;secretKey:string;hotelName:string;roomName:string|null;boardName:string|null;arrival:string;departure:string;price:number;sourceCurrency:string;locale:GuestLocale;currency:GuestCurrency;sandbox:boolean}>;
type LiteApiPaymentConfig={publicKey:"live"|"sandbox";appearance:{theme:string};options:{business:{name:string}};targetElement:string;secretKey:string;returnUrl:string};
type CheckoutSessionResponse={state:"payment_pending"|"processing"|"confirmed"|"needs_review";token:string;returnUrl?:string};

declare global{
  interface Window{
    LiteAPIPayment?:new(config:LiteApiPaymentConfig)=>{handlePayment:()=>void|Promise<void>};
  }
}

const SDK_SRC="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";

export function NuiteeCheckoutFlow(props:Props){
  const {checkoutProof,secretKey,hotelName,roomName,boardName,arrival,departure,price,sourceCurrency,locale,currency,sandbox}=props;
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
      const sessionResponse=await fetch("/api/v1/nuitee/checkout-session",{
        method:"POST",
        headers:{"content-type":"application/json","accept":"application/json"},
        body:JSON.stringify({proof:checkoutProof,firstName:firstName.trim(),lastName:lastName.trim(),email:email.trim(),phone:phone.trim()||undefined}),
      });
      const sessionPayload=await sessionResponse.json().catch(()=>null) as {data?:CheckoutSessionResponse;error?:{message?:string}}|null;
      if(!sessionResponse.ok||!sessionPayload?.data)throw new Error(sessionPayload?.error?.message??`Could not save checkout (${sessionResponse.status})`);
      const session=sessionPayload.data;
      if(!session.returnUrl)throw new Error(ar?"تعذر إنشاء رابط استرجاع آمن للدفع":"Could not create a secure payment recovery URL");
      if(session.state==="confirmed"){
        window.location.assign(session.returnUrl);
        return;
      }
      if(session.state==="needs_review")throw new Error(ar?"هذه العملية تحتاج تحقق قبل أي محاولة دفع جديدة":"This checkout needs verification before any new payment attempt");

      await loadPaymentSdk();
      if(!window.LiteAPIPayment)throw new Error("Nuitee payment SDK did not initialize");
      setPaymentOpen(true);
      await nextPaint();
      const target=document.querySelector("#nuitee-payment-target");
      if(!target)throw new Error("Payment container is unavailable");
      target.innerHTML="";
      const payment=new window.LiteAPIPayment({
        publicKey:sandbox?"sandbox":"live",
        appearance:{theme:"flat"},
        options:{business:{name:"HandMeKey"}},
        targetElement:"#nuitee-payment-target",
        secretKey,
        returnUrl:session.returnUrl,
      });
      await Promise.resolve(payment.handlePayment());
    }catch(cause){
      setPaymentOpen(false);
      setError(cause instanceof Error?cause.message:(ar?"تعذر تحميل الدفع الآمن":"Could not load secure payment"));
    }finally{setBusy(false);}
  }

  return <div className="checkout"><div className="panel"><span className="eyebrow">{sandbox?"Nuitee Sandbox":"Nuitee Connect · Live"}</span><h2>{ar?"بيانات الضيف والدفع":"Guest details & secure payment"}</h2><div className="formGrid"><label>{ar?"الاسم الأول":"First name"}<input value={firstName} onChange={(e)=>setFirstName(e.target.value)} autoComplete="given-name" disabled={paymentOpen}/></label><label>{ar?"اسم العائلة":"Last name"}<input value={lastName} onChange={(e)=>setLastName(e.target.value)} autoComplete="family-name" disabled={paymentOpen}/></label><label>{ar?"البريد الإلكتروني":"Email"}<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" disabled={paymentOpen}/></label><label>{ar?"الهاتف":"Phone"}<input value={phone} onChange={(e)=>setPhone(e.target.value)} autoComplete="tel" disabled={paymentOpen}/></label></div>{error&&<p className="danger">{error}</p>}{!paymentOpen&&<button className="primary" style={{width:"100%",marginTop:22}} disabled={!canSubmit} onClick={startPayment}>{busy?(ar?"جارٍ حفظ الجلسة وفتح الدفع…":"Saving checkout & opening payment…"):(ar?"المتابعة إلى الدفع الآمن":"Continue to secure payment")}</button>}{paymentOpen&&<div style={{marginTop:22}}><p className="muted">{ar?"تم حفظ جلسة الحجز على خادم HandMeKey. أكمل الدفع أدناه؛ بعد النجاح سنؤكد الحجز تلقائياً حتى لو تم تحديث صفحة العودة.":"Your checkout is now stored securely by HandMeKey. Complete payment below; after success the booking can be recovered and finalized even if the return page is refreshed."}</p>{sandbox&&<p className="muted">Sandbox: use 4242 4242 4242 4242, any future expiry and any 3-digit CVC.</p>}<div id="nuitee-payment-target"/></div>}</div><aside className="panel"><span className="eyebrow">{ar?"ملخص الإقامة":"Stay summary"}</span><h2>{hotelName}</h2><p>{roomName??(ar?"غرفة الفندق":"Hotel room")}{boardName?` · ${boardName}`:""}</p><p className="muted">{arrival} — {departure}</p><div className="breakdown total"><span>{ar?"المبلغ المستحق":"Amount due"}</span><strong>{total.text}</strong></div>{total.converted&&<p className="muted">{total.sourceText}</p>}<p className="muted">{ar?"تم تثبيت السعر عبر Nuitee Prebook. بيانات البطاقة تتم معالجتها داخل بوابة Nuitee الآمنة ولا تمر عبر خادم HandMeKey.":"The rate is locked by Nuitee Prebook. Card details are handled inside Nuitee's secure payment portal and do not pass through HandMeKey's server."}</p></aside></div>;
}

function loadPaymentSdk():Promise<void>{
  if(window.LiteAPIPayment)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>(`script[src^="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js"]`);
    if(existing){
      if(window.LiteAPIPayment){resolve();return;}
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
