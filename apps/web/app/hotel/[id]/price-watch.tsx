"use client";

import { useState } from "react";

type Props={hotelId:string;arrival:string;departure:string;adults:number;children:number;currentTotal:number;currency:string};

export function PriceWatch({hotelId,arrival,departure,adults,children,currentTotal,currency}:Props){
  const [target,setTarget]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function watch(){
    setBusy(true);setMessage(null);
    try{
      const parsedTarget=target.trim()?Number(target):undefined;
      const response=await fetch("/api/v1/price-watches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({hotelId,arrival,departure,adults,children,...(parsedTarget!==undefined?{targetTotal:parsedTarget}:{})})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.error)throw new Error(payload?.error?.message||"Unable to create price watch");
      setMessage("Price watch active. New lows will appear in Alerts.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to create price watch");}finally{setBusy(false);}
  }

  return <div className="panel" style={{marginTop:20}}><span className="eyebrow">Price watch</span><h3>Track this stay automatically</h3><p className="muted">Current cheapest live stay: {currentTotal.toFixed(2)} {currency}. Leave the target blank to be notified when a new lowest price is found.</p><div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}><label style={{minWidth:220}}>Optional target total<input type="number" min="0.01" step="0.01" value={target} onChange={(event)=>setTarget(event.target.value)} placeholder={currentTotal.toFixed(2)}/></label><button type="button" className="secondaryButton" disabled={busy} onClick={watch}>{busy?"Starting watch…":"Watch this price"}</button></div>{message&&<p className={message.startsWith("Price watch")?"status":"danger"}>{message}</p>}</div>;
}
