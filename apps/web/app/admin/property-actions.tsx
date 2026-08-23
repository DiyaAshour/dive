"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PropertyActions({hotelId,status}:{hotelId:string;status:string}) {
  const router = useRouter();
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function suspend() {
    if(!window.confirm("Suspend this property and remove it from discovery? The reason will be recorded in the audit log."))return;
    setBusy(true);setMessage(null);
    try {
      const response=await fetch(`/api/v1/admin/hotels/${hotelId}/suspend`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reason})});
      const payload=await response.json();
      if(response.status===401){window.location.assign("/admin/login?next=/admin");return;}
      if(!response.ok) throw new Error(payload?.error?.message??"Unable to suspend property");
      setMessage("Property suspended.");router.refresh();
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to suspend property");} finally {setBusy(false);}
  }

  async function restore() {
    if(!window.confirm("Restore this property to draft? It must pass publishing review again before returning to discovery."))return;
    setBusy(true);setMessage(null);
    try {
      const response=await fetch(`/api/v1/admin/hotels/${hotelId}/restore`,{method:"POST"});
      const payload=await response.json();
      if(response.status===401){window.location.assign("/admin/login?next=/admin");return;}
      if(!response.ok) throw new Error(payload?.error?.message??"Unable to restore property");
      setMessage("Property restored to draft and must pass review again.");router.refresh();
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to restore property");} finally {setBusy(false);}
  }

  if(status==="SUSPENDED") return <div style={{display:"grid",gap:6}}><button className="secondaryButton" type="button" disabled={busy} onClick={restore}>{busy?"Restoring...":"Restore to draft"}</button>{message&&<small>{message}</small>}</div>;
  return <div style={{display:"grid",gap:6,minWidth:200}}><input value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Suspension reason"/><button className="secondaryButton" type="button" disabled={busy||reason.trim().length<10} onClick={suspend}>{busy?"Suspending...":"Suspend"}</button>{message&&<small>{message}</small>}</div>;
}
