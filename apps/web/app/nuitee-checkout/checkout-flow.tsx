"use client";

import {useMemo,useRef,useState} from "react";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency,GuestLocale} from "@/lib/guest-market";

type Props=Readonly<{hotelId:string;offerId:string;hotelName:string;city:string;arrival:string;departure:string;adults:number;children:number;childrenAges:number[];guestNationality:string;locale:GuestLocale;currency:GuestCurrency;refreshHref:string;initialFirstName:string;initialLastName:string;initialEmail:string;accountPrefilled:boolean}>;
type LiteApiPaymentConfig={publicKey:"live"|"sandbox";appearance:{theme:string};options:{business:{name:string}};targetElement:string;secretKey:string;returnUrl:string};
type StartPaymentResponse={state:"payment_pending"|"processing"|"confirmed"|"needs_review";token:string;returnUrl?:string;secretKey:string;sandbox:boolean;hotelName:string;roomName:string|null;boardName:string|null;amount:number;currency:string};

declare global{interface Window{LiteAPIPayment?:new(config:LiteApiPaymentConfig)=>{handlePayment:()=>void|Promise<void>};}}
const SDK_SRC="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";

export function NuiteeCheckoutFlow(props:Props){
  const {hotelId,offerId,hotelName,city,arrival,departure,adults,children,childrenAges,guestNationality,locale,currency,refreshHref,initialFirstName,initialLastName,initialEmail,accountPrefilled}=props;
  const [firstName,setFirstName]=useState(initialFirstName);
  const [lastName,setLastName]=useState(initialLastName);
  const [email,setEmail]=useState(initialEmail);
  const [phone,setPhone]=useState("");
  const [busy,setBusy]=useState(false);
  const [paymentOpen,setPaymentOpen]=useState(false);
  const [locked,setLocked]=useState<StartPaymentResponse|null>(null);
  const [error,setError]=useState<string|null>(null);
  const inFlight=useRef(false);
  const sessionRef=useRef<StartPaymentResponse|null>(null);
  const ar=locale==="ar";
  const canSubmit=useMemo(()=>firstName.trim().length>1&&lastName.trim().length>1&&email.includes("@")&&!busy&&!paymentOpen,[firstName,lastName,email,busy,paymentOpen]);
  const lockedTotal=locked?guestMoney(locked.amount,locked.currency,currency,locale):null;

  async function startPayment(){
    if(!canSubmit||inFlight.current)return;
    inFlight.current=true;setBusy(true);setError(null);
    try{
      let session=sessionRef.current;
      if(!session){
        const response=await fetch("/api/v1/nuitee/start-payment",{
          method:"POST",
          headers:{"content-type":"application/json","accept":"application/json"},
          body:JSON.stringify({hotelId,offerId,hotelName,city,arrival,departure,adults,children,childrenAges,guestNationality,firstName:firstName.trim(),lastName:lastName.trim(),email:email.trim(),phone:phone.trim()||undefined}),
        });
        const payload=await response.json().catch(()=>null) as {data?:StartPaymentResponse;error?:{code?:string;message?:string}}|null;
        if(!response.ok||!payload?.data){
          const message=payload?.error?.message??`Could not start secure payment (${response.status})`;
          throw new Error(message);
        }
        session=payload.data;
        if(!session.returnUrl)throw new Error(ar?"تعذر إنشاء رابط استرجاع آمن للدفع":"Could not create a secure payment recovery URL");
        sessionRef.current=session;
        setLocked(session);
      }
      if(session.state==="confirmed"){
        window.location.assign(session.returnUrl!);
        return;
      }
      if(session.state==="needs_review")throw new Error(ar?"هذه العملية تحتاج تحقق قبل أي محاولة دفع جديدة":"This checkout needs verification before any new payment attempt");
      await openPaymentPortal(session);
    }catch(cause){
      setPaymentOpen(false);
      setError(cause instanceof Error?cause.message:(ar?"تعذر تحميل الدفع الآمن":"Could not load secure payment"));
    }finally{inFlight.current=false;setBusy(false);}
  }

  async function openPaymentPortal(session:StartPaymentResponse){
    await loadPaymentSdk();
    if(!window.LiteAPIPayment)throw new Error("Nuitee payment SDK did not initialize");
    setPaymentOpen(true);
    await nextPaint();
    const target=document.querySelector("#nuitee-payment-target");
    if(!target)throw new Error("Payment container is unavailable");
    target.innerHTML="";
    const payment=new window.LiteAPIPayment({
      publicKey:session.sandbox?"sandbox":"live",
      appearance:{theme:"flat"},
      options:{business:{name:"HandMeKey"}},
      targetElement:"#nuitee-payment-target",
      secretKey:session.secretKey,
      returnUrl:session.returnUrl!,
    });
    await Promise.resolve(payment.handlePayment());
  }

  const detailsLocked=Boolean(locked);
  return <div className="checkout"><div className="panel"><span className="eyebrow">Nuitee Connect · Live</span><h2>{ar?"بيانات الضيف والدفع":"Guest details & secure payment"}</h2>{accountPrefilled&&<p className="muted">{ar?"تم تعبئة بياناتك تلقائيًا من حساب HandMeKey. يمكنك تعديلها إذا كان الحجز لشخص آخر.":"Your HandMeKey account details were filled in automatically. You can edit them if someone else is staying."}</p>}<div className="formGrid"><label>{ar?"الاسم الأول":"First name"}<input value={firstName} onChange={(e)=>setFirstName(e.target.value)} autoComplete="given-name" disabled={paymentOpen||detailsLocked}/></label><label>{ar?"اسم العائلة":"Last name"}<input value={lastName} onChange={(e)=>setLastName(e.target.value)} autoComplete="family-name" disabled={paymentOpen||detailsLocked}/></label><label>{ar?"البريد الإلكتروني":"Email"}<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" disabled={paymentOpen||detailsLocked}/></label><label>{ar?"الهاتف":"Phone"}<input value={phone} onChange={(e)=>setPhone(e.target.value)} autoComplete="tel" disabled={paymentOpen||detailsLocked}/></label></div>{error&&<><p className="danger">{error}</p>{!locked&&<a className="resultCta" href={refreshHref}>{ar?"عرض أحدث الغرف":"View refreshed rooms"}</a>}</>}{!paymentOpen&&<button className="primary" style={{width:"100%",marginTop:22}} disabled={!canSubmit} onClick={startPayment}>{busy?(ar?"جارٍ فحص العرض وفتح الدفع…":"Checking rate & opening payment…"):locked?(ar?"إعادة فتح بوابة الدفع":"Reopen secure payment"):(ar?"المتابعة إلى الدفع الآمن":"Continue to secure payment")}</button>}{paymentOpen&&<div style={{marginTop:22}}><p className="muted">{ar?"تم إنشاء Prebook مرة واحدة وحفظ جلسة الحجز على خادم HandMeKey. أكمل الدفع أدناه؛ تحديث صفحة checkout وحده لن ينشئ Prebook جديدًا.":"The prebook was created once and the checkout session is stored on HandMeKey's server. Complete payment below; simply reloading checkout will not create another prebook."}</p>{locked?.sandbox&&<p className="muted">Sandbox: use 4242 4242 4242 4242, any future expiry and any 3-digit CVC.</p>}<div id="nuitee-payment-target"/></div>}</div><aside className="panel"><span className="eyebrow">{ar?"ملخص الإقامة":"Stay summary"}</span><h2>{locked?.hotelName??hotelName}</h2><p>{locked?(locked.roomName??(ar?"غرفة الفندق":"Hotel room")):(ar?"سيتم تأكيد الغرفة والسعر قبل فتح الدفع":"Room and price will be confirmed before payment")}{locked?.boardName?` · ${locked.boardName}`:""}</p><p className="muted">{arrival} — {departure}</p><div className="breakdown total"><span>{ar?"المبلغ المستحق":"Amount due"}</span><strong>{lockedTotal?lockedTotal.text:(ar?"يُثبت عند المتابعة":"Confirmed on continue")}</strong></div>{lockedTotal?.converted&&<p className="muted">{lockedTotal.sourceText}</p>}<p className="muted">{locked?(ar?"تم تثبيت السعر عبر Nuitee Prebook. بيانات البطاقة تتم معالجتها داخل بوابة Nuitee الآمنة ولا تمر عبر خادم HandMeKey.":"The rate is locked by Nuitee Prebook. Card details are handled inside Nuitee's secure payment portal and do not pass through HandMeKey's server."):(ar?"تحميل هذه الصفحة لا ينشئ PaymentIntent. سيتم استدعاء Prebook مرة واحدة فقط عند ضغط زر المتابعة.":"Loading this page does not create a PaymentIntent. Prebook is called once only when you press Continue.")}</p></aside></div>;
}

function loadPaymentSdk():Promise<void>{
  if(window.LiteAPIPayment)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>(`script[src^="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js"]`);
    if(existing){if(window.LiteAPIPayment){resolve();return;}existing.addEventListener("load",()=>resolve(),{once:true});existing.addEventListener("error",()=>reject(new Error("Could not load Nuitee payment SDK")),{once:true});return;}
    const script=document.createElement("script");script.src=SDK_SRC;script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error("Could not load Nuitee payment SDK"));document.head.appendChild(script);
  });
}
function nextPaint():Promise<void>{return new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}
