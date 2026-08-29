"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type Props={locale:Locale;hotelId:string;arrival:string;departure:string;adults:number;children:number;currentTotal:number;currency:string};

export function PriceWatch({locale,hotelId,arrival,departure,adults,children,currentTotal,currency}:Props){
  const [target,setTarget]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [success,setSuccess]=useState(false);
  const ar=locale==="ar";

  async function watch(){
    setBusy(true);setMessage(null);setSuccess(false);
    try{
      const parsedTarget=target.trim()?Number(target):undefined;
      const response=await fetch("/api/v1/price-watches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({hotelId,arrival,departure,adults,children,...(parsedTarget!==undefined?{targetTotal:parsedTarget}:{})})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.error)throw new Error(payload?.error?.message||(ar?"تعذر إنشاء مراقبة السعر":"Unable to create price watch"));
      setSuccess(true);setMessage(ar?"تم تفعيل مراقبة السعر. ستظهر الأسعار الأدنى الجديدة في التنبيهات.":"Price watch active. New lows will appear in Alerts.");
    }catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر إنشاء مراقبة السعر":"Unable to create price watch"));}finally{setBusy(false);}
  }

  return <div className="panel priceWatchPanel" style={{marginTop:20}}><span className="eyebrow">{ar?"مراقبة السعر":"Price watch"}</span><h3>{ar?"تابع سعر هذه الإقامة تلقائيًا":"Track this stay automatically"}</h3><p className="muted">{ar?`أرخص سعر مباشر حاليًا: ${currentTotal.toFixed(2)} ${currency}. اترك الهدف فارغًا ليصلك تنبيه عند تسجيل سعر أدنى جديد.`:`Current cheapest live stay: ${currentTotal.toFixed(2)} ${currency}. Leave the target blank to be notified when a new lowest price is found.`}</p><div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}><label style={{minWidth:220}}>{ar?"إجمالي مستهدف اختياري":"Optional target total"}<input type="number" min="0.01" step="0.01" value={target} onChange={(event)=>setTarget(event.target.value)} placeholder={currentTotal.toFixed(2)}/></label><button type="button" className="secondaryButton" disabled={busy} onClick={watch}>{busy?(ar?"جارٍ بدء المراقبة…":"Starting watch…"):(ar?"راقب هذا السعر":"Watch this price")}</button></div>{message&&<p className={success?"status":"danger"}>{message}</p>}</div>;
}
