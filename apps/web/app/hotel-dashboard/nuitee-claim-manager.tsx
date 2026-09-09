"use client";

import {useState} from "react";
import {BadgeCheck,Link2,Unlink} from "lucide-react";

type Claim=Readonly<{providerHotelId:string;providerHotelName:string;claimedAt:string|null}>;

export default function NuiteeClaimManager({hotelId,initialClaim,locale}:{hotelId:string;initialClaim:Claim|null;locale:string}){
  const ar=locale==="ar";
  const [claim,setClaim]=useState<Claim|null>(initialClaim);
  const [providerHotelId,setProviderHotelId]=useState(initialClaim?.providerHotelId??"");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function linkHotel(){
    const id=providerHotelId.trim();
    if(!id)return setMessage(ar?"أدخل Nuitee Hotel ID أولاً.":"Enter the Nuitee hotel ID first.");
    setBusy(true);setMessage(null);
    try{
      const response=await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/nuitee-claim`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({providerHotelId:id})});
      const body=await response.json().catch(()=>null) as {data?:Claim;error?:{message?:string}}|null;
      if(!response.ok||!body?.data)throw new Error(body?.error?.message??(ar?"تعذر ربط الفندق.":"Could not link the hotel."));
      setClaim(body.data);setProviderHotelId(body.data.providerHotelId);setMessage(ar?"تم استبدال نسخة Nuitee بالفندق الحقيقي. لن تظهر نسخة الـAPI في البحث ولن يتم تحديثها من المزامنة الدورية.":"Nuitee has been replaced by this partner property. The API copy is hidden from search and skipped by scheduled sync.");
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }

  async function unlinkHotel(){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/nuitee-claim`,{method:"DELETE"});
      const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
      if(!response.ok)throw new Error(body?.error?.message??(ar?"تعذر إلغاء الربط.":"Could not remove the link."));
      setClaim(null);setProviderHotelId("");setMessage(ar?"تم إلغاء الربط. سيعود فندق Nuitee للظهور والتحديث في دورة المزامنة التالية.":"Link removed. The Nuitee property can return to search and scheduled sync on the next cycle.");
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }

  return <section className="partnerInsight" style={{alignItems:"flex-start",gap:16}}>
    <Link2 size={22}/>
    <div style={{width:"100%"}}>
      <strong>{ar?"استبدال فندق Nuitee بالفندق الحقيقي":"Replace Nuitee hotel with this partner property"}</strong>
      <p>{ar?"أدخل Hotel ID من Nuitee. بعد الربط يتم إخفاء نسخة الـAPI، إيقاف مزامنتها، وتحويل رابطها القديم إلى صفحة الفندق الحقيقي.":"Enter the Nuitee Hotel ID. Once linked, the API copy is hidden, skipped by sync, and its old URL redirects to the real partner property."}</p>
      {claim?<div style={{display:"grid",gap:8,marginTop:12}}>
        <span><BadgeCheck size={15} style={{verticalAlign:"middle"}}/> <b>{claim.providerHotelName}</b> · ID {claim.providerHotelId}</span>
        <button className="partnerSecondaryAction" type="button" disabled={busy} onClick={unlinkHotel}><Unlink size={15}/>{busy?(ar?"جاري التنفيذ...":"Working..."):(ar?"إلغاء الربط":"Remove link")}</button>
      </div>:<div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
        <input value={providerHotelId} onChange={(event)=>setProviderHotelId(event.target.value)} placeholder={ar?"Nuitee Hotel ID":"Nuitee Hotel ID"} style={{minWidth:260,flex:"1 1 260px",padding:"11px 12px",border:"1px solid var(--border, #d8d8d8)",borderRadius:10}}/>
        <button className="partnerSecondaryAction" type="button" disabled={busy} onClick={linkHotel}><Link2 size={15}/>{busy?(ar?"جاري الربط...":"Linking..."):(ar?"ربط واستبدال":"Link & replace")}</button>
      </div>}
      {message&&<p style={{marginTop:10}}>{message}</p>}
    </div>
  </section>;
}
