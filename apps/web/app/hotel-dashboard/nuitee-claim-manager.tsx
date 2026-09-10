"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {BadgeCheck,Building2,Check,Link2,MapPin,Search,Unlink} from "lucide-react";

type Claim=Readonly<{providerHotelId:string;providerHotelName:string;claimedAt:string|null}>;
type Candidate=Readonly<{
  providerHotelId:string;
  name:string;
  city:string|null;
  area:string|null;
  address:string|null;
  starRating:number|null;
  coverPhoto:string|null;
}>;

export default function NuiteeClaimManager({hotelId,hotelName,initialClaim,locale}:{hotelId:string;hotelName:string;initialClaim:Claim|null;locale:string}){
  const router=useRouter();
  const ar=locale==="ar";
  const [claim,setClaim]=useState<Claim|null>(initialClaim);
  const [query,setQuery]=useState(initialClaim?"":hotelName);
  const [results,setResults]=useState<Candidate[]>([]);
  const [searching,setSearching]=useState(false);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [manualId,setManualId]=useState("");
  const [message,setMessage]=useState<string|null>(null);

  useEffect(()=>{
    if(claim){setResults([]);setSearching(false);return;}
    const value=query.trim();
    if(value.length<2){setResults([]);setSearching(false);return;}
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setSearching(true);setMessage(null);
      try{
        const response=await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/nuitee-claim?q=${encodeURIComponent(value)}`,{cache:"no-store",signal:controller.signal});
        const body=await response.json().catch(()=>null) as {data?:Candidate[];error?:{message?:string}}|null;
        if(!response.ok)throw new Error(body?.error?.message??(ar?"تعذر البحث عن الفندق.":"Could not search properties."));
        setResults(Array.isArray(body?.data)?body.data:[]);
      }catch(error){
        if(error instanceof DOMException&&error.name==="AbortError")return;
        setResults([]);setMessage(error instanceof Error?error.message:String(error));
      }finally{if(!controller.signal.aborted)setSearching(false);}
    },350);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[ar,claim,hotelId,query]);

  async function linkHotel(providerHotelId:string){
    const id=providerHotelId.trim();
    if(!id)return;
    setBusyId(id);setMessage(null);
    try{
      const response=await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/nuitee-claim`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({providerHotelId:id})});
      const body=await response.json().catch(()=>null) as {data?:Claim;error?:{message?:string}}|null;
      if(!response.ok||!body?.data)throw new Error(body?.error?.message??(ar?"تعذر ربط الفندق.":"Could not link the hotel."));
      setClaim(body.data);setResults([]);setQuery("");setManualId("");
      setMessage(ar?"تم. نسخة المورد لهذا الفندق توقفت عن الظهور، وفندقك الذي تديره من Partner Hub أصبح النسخة الأساسية على HandMeKey.":"Done. The supplier copy is now hidden and the property you manage in Partner Hub is the canonical HandMeKey listing.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusyId(null);}
  }

  async function unlinkHotel(){
    setBusyId("unlink");setMessage(null);
    try{
      const response=await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/nuitee-claim`,{method:"DELETE"});
      const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
      if(!response.ok)throw new Error(body?.error?.message??(ar?"تعذر إلغاء الربط.":"Could not remove the link."));
      setClaim(null);setQuery(hotelName);setMessage(ar?"تم إلغاء الربط. نسخة المورد قد تصبح مؤهلة للظهور مرة أخرى.":"Link removed. The supplier listing may become eligible to appear again.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusyId(null);}
  }

  return <section className="partnerInsight" style={{alignItems:"flex-start",gap:16}}>
    <Building2 size={22}/>
    <div style={{width:"100%",minWidth:0}}>
      <strong>{ar?"اربط فندقك بالنسخة الموجودة على HandMeKey":"Connect your property to its existing HandMeKey listing"}</strong>
      <p>{ar?"ابحث باسم الفندق واختره. بعد التأكيد تختفي نسخة المورد تلقائيًا من نتائج الضيوف وتصبح صفحة الفندق التي تديرها هنا هي الصفحة الأساسية.":"Search by hotel name and select your property. After confirmation, the supplier copy disappears from guest results and the property you manage here becomes the primary listing."}</p>

      {claim?<div style={{display:"grid",gap:12,marginTop:16,padding:16,border:"1px solid rgba(34,120,79,.24)",borderRadius:14,background:"rgba(34,120,79,.06)"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><span style={{display:"grid",placeItems:"center",width:34,height:34,borderRadius:10,background:"rgba(34,120,79,.12)"}}><BadgeCheck size={19}/></span><div><b>{claim.providerHotelName}</b><div style={{fontSize:12,opacity:.7,marginTop:2}}>{ar?"مرتبط — نسخة المورد مخفية عن الضيوف":"Connected — supplier copy hidden from guests"}</div></div></div>
        <div style={{fontSize:12,lineHeight:1.6,opacity:.78}}>{ar?"الحجوزات والمحتوى العام لهذا الفندق يتم توجيهها إلى نسخة الشريك الأساسية. الرابط القديم لنسخة المورد يتحول إلى صفحة فندقك.":"Public traffic for this property is routed to the partner listing. The old supplier URL redirects to your property page."}</div>
        <div><button className="partnerSecondaryAction" type="button" disabled={busyId!==null} onClick={unlinkHotel}><Unlink size={15}/>{busyId==="unlink"?(ar?"جاري التنفيذ...":"Working..."):(ar?"إلغاء الربط":"Remove connection")}</button></div>
      </div>:<>
        <div style={{position:"relative",marginTop:16}}>
          <Search size={17} style={{position:"absolute",top:13,insetInlineStart:13,opacity:.55,pointerEvents:"none"}}/>
          <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={ar?"مثال: Hilton Amman":"Example: Hilton Amman"} aria-label={ar?"ابحث عن فندقك":"Find your property"} style={{width:"100%",padding:"12px 42px",border:"1px solid var(--border, #d8d8d8)",borderRadius:12,fontSize:14,background:"var(--surface, #fff)"}}/>
          {searching&&<span style={{position:"absolute",top:13,insetInlineEnd:13,fontSize:12,opacity:.6}}>{ar?"بحث…":"Searching…"}</span>}
        </div>

        {query.trim().length>=2&&!searching&&results.length===0&&<p style={{marginTop:10,fontSize:12,opacity:.7}}>{ar?"إذا لم يظهر الفندق، جرّب جزءًا من الاسم أو المدينة.":"No match yet? Try part of the hotel name or its city."}</p>}

        {results.length>0&&<div style={{display:"grid",gap:10,marginTop:12}}>{results.map((hotel)=>{
          const location=[hotel.area,hotel.city].filter(Boolean).join(" · ");
          return <div key={hotel.providerHotelId} style={{display:"grid",gridTemplateColumns:"84px minmax(0,1fr) auto",gap:13,alignItems:"center",padding:10,border:"1px solid var(--border, #e1e4e8)",borderRadius:14,background:"var(--surface, #fff)"}}>
            <div style={{width:84,height:68,borderRadius:10,overflow:"hidden",background:"rgba(15,35,58,.07)",display:"grid",placeItems:"center"}}>{hotel.coverPhoto?<img src={hotel.coverPhoto} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<Building2 size={20} style={{opacity:.45}}/>}</div>
            <div style={{minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><b style={{fontSize:14}}>{hotel.name}</b>{hotel.starRating&&hotel.starRating>0?<span style={{fontSize:12,whiteSpace:"nowrap"}}>{Math.round(hotel.starRating)}★</span>:null}</div>{location&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:5,fontSize:12,opacity:.7}}><MapPin size={13}/><span>{location}</span></div>}{hotel.address&&<div style={{marginTop:4,fontSize:11,opacity:.55,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hotel.address}</div>}</div>
            <button className="partnerSecondaryAction" type="button" disabled={busyId!==null} onClick={()=>linkHotel(hotel.providerHotelId)} style={{whiteSpace:"nowrap"}}><Check size={15}/>{busyId===hotel.providerHotelId?(ar?"جاري الربط…":"Connecting…"):(ar?"هذا فندقي":"This is my property")}</button>
          </div>;
        })}</div>}

        <details style={{marginTop:14,fontSize:12}}><summary style={{cursor:"pointer",opacity:.72}}>{ar?"لم تجد فندقك؟ استخدام Provider ID يدويًا":"Can't find your property? Use a Provider ID manually"}</summary><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><input value={manualId} onChange={(event)=>setManualId(event.target.value)} placeholder="Provider ID" style={{minWidth:220,flex:"1 1 220px",padding:"10px 11px",border:"1px solid var(--border, #d8d8d8)",borderRadius:10}}/><button className="partnerSecondaryAction" type="button" disabled={busyId!==null||!manualId.trim()} onClick={()=>linkHotel(manualId)}><Link2 size={15}/>{ar?"ربط يدوي":"Connect manually"}</button></div></details>
      </>}
      {message&&<p style={{marginTop:12,fontWeight:600}}>{message}</p>}
    </div>
  </section>;
}
