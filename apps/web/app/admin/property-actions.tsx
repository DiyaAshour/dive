"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {Locale} from "@/lib/i18n";

export default function PropertyActions({hotelId,status,locale="en",nextPath="/admin"}:{hotelId:string;status:string;locale?:Locale;nextPath?:string}) {
  const router = useRouter();
  const ar=locale==="ar";
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function suspend() {
    if(!window.confirm(ar?"إيقاف المنشأة وإزالتها من البحث؟ سيتم تسجيل السبب في سجل التدقيق.":"Suspend this property and remove it from discovery? The reason will be recorded in the audit log."))return;
    setBusy(true);setMessage(null);
    try {
      const response=await fetch(`/api/v1/admin/hotels/${hotelId}/suspend`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reason})});
      const payload=await response.json();
      if(response.status===401){window.location.assign(`/admin/login?next=${encodeURIComponent(nextPath)}`);return;}
      if(!response.ok) throw new Error(payload?.error?.message??"Unable to suspend property");
      setMessage(ar?"تم إيقاف المنشأة.":"Property suspended.");router.refresh();
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to suspend property");} finally {setBusy(false);}
  }

  async function restore() {
    if(!window.confirm(ar?"استعادة المنشأة كمسودة؟ يجب أن تجتاز مراجعة النشر مجددًا قبل العودة للبحث.":"Restore this property to draft? It must pass publishing review again before returning to discovery."))return;
    setBusy(true);setMessage(null);
    try {
      const response=await fetch(`/api/v1/admin/hotels/${hotelId}/restore`,{method:"POST"});
      const payload=await response.json();
      if(response.status===401){window.location.assign(`/admin/login?next=${encodeURIComponent(nextPath)}`);return;}
      if(!response.ok) throw new Error(payload?.error?.message??"Unable to restore property");
      setMessage(ar?"أُعيدت المنشأة إلى المسودة ويجب مراجعتها مجددًا.":"Property restored to draft and must pass review again.");router.refresh();
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to restore property");} finally {setBusy(false);}
  }

  if(status==="SUSPENDED") return <div style={{display:"grid",gap:6}}><button className="secondaryButton" type="button" disabled={busy} onClick={restore}>{busy?(ar?"جارٍ الاستعادة…":"Restoring..."):(ar?"استعادة كمسودة":"Restore to draft")}</button>{message&&<small>{message}</small>}</div>;
  return <div style={{display:"grid",gap:6,minWidth:200}}><input value={reason} onChange={(event)=>setReason(event.target.value)} placeholder={ar?"سبب الإيقاف":"Suspension reason"}/><button className="secondaryButton" type="button" disabled={busy||reason.trim().length<10} onClick={suspend}>{busy?(ar?"جارٍ الإيقاف…":"Suspending..."):(ar?"إيقاف المنشأة":"Suspend")}</button>{message&&<small>{message}</small>}</div>;
}
