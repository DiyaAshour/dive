"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale:Locale;
  destination:string;
  arrival:string;
  departure:string;
  adults:number;
  children:number;
  filters:Record<string,unknown>;
};

export function SaveSearchButton({locale,...search}:Props) {
  const [state,setState]=useState<"idle"|"saving"|"saved">("idle");
  const [message,setMessage]=useState<string|null>(null);
  const ar=locale==="ar";

  async function save() {
    setState("saving");setMessage(null);
    try {
      const response=await fetch("/api/v1/saved-searches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...search,name:ar?`إقامة في ${search.destination}`:`${search.destination} stay`})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.error)throw new Error(payload?.error?.message||(ar?"تعذر حفظ البحث":"Unable to save search"));
      setState("saved");setMessage(ar?"تم حفظ البحث في مركز التنبيهات.":"Search saved to your alerts center.");
    } catch(error){setState("idle");setMessage(error instanceof Error?error.message:(ar?"تعذر حفظ البحث":"Unable to save search"));}
  }

  return <div style={{textAlign:ar?"left":"right"}}><button className="secondaryButton" type="button" onClick={save} disabled={state!=="idle"}>{state==="saving"?(ar?"جارٍ الحفظ…":"Saving…"):state==="saved"?(ar?"تم الحفظ":"Saved"):(ar?"حفظ هذا البحث":"Save this search")}</button>{message&&<small className={state==="saved"?"status":"danger"} style={{display:"block",marginTop:6}}>{message}</small>}</div>;
}
