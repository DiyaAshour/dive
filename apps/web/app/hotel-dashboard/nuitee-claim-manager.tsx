"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {BadgeCheck,Building2,Check,Clock3,FileCheck2,FileWarning,Link2,MapPin,Search,Send,ShieldCheck,Unlink} from "lucide-react";

type Claim=Readonly<{providerHotelId:string;providerHotelName:string;claimedAt:string|null}>;
type ClaimRequest=Readonly<{id:string;providerHotelId:string;providerHotelName:string;status:"PENDING"|"APPROVED"|"REJECTED"|"CANCELED";submittedAt:string;reviewedAt:string|null;rejectionReason:string|null}>;
type Candidate=Readonly<{providerHotelId:string;name:string;city:string|null;area:string|null;address:string|null;starRating:number|null;coverPhoto:string|null}>;
type DocumentStatus=Readonly<{type:string;required:boolean;uploaded:boolean;status:string|null;documentId:string|null;fileName:string|null;contentType:string|null;sizeBytes:number|null;rejectionReason:string|null}>;

type Props=Readonly<{hotelId:string;hotelName?:string;initialClaim:Claim|null;initialRequest:ClaimRequest|null;initialDocuments:DocumentStatus[];locale:string}>;

export default function NuiteeClaimManager({hotelId,hotelName="",initialClaim,initialRequest,initialDocuments,locale}:Props){
  const router=useRouter();
  const ar=locale==="ar";
  const [claim,setClaim]=useState<Claim|null>(initialClaim);
  const [claimRequest,setClaimRequest]=useState<ClaimRequest|null>(initialRequest);
  const [documents,setDocuments]=useState<DocumentStatus[]>(initialDocuments);
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<Candidate[]>([]);
  const [selected,setSelected]=useState<Candidate|null>(null);
  const [searching,setSearching]=useState(false);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [manualId,setManualId]=useState("");
  const [message,setMessage]=useState<string|null>(null);

  useEffect(()=>setDocuments(initialDocuments),[initialDocuments]);
  useEffect(()=>setClaim(initialClaim),[initialClaim]);
  useEffect(()=>setClaimRequest(initialRequest),[initialRequest]);

  useEffect(()=>{
    if(!claim&&claimRequest?.status!=="PENDING"&&!query&&hotelName)setQuery(hotelName);
  },[claim,claimRequest?.status,hotelName,query]);

  useEffect(()=>{
    if(claim||claimRequest?.status==="PENDING"||selected){setResults([]);setSearching(false);return;}
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
  },[ar,claim,claimRequest?.status,hotelId,query,selected]);

  const requiredDocuments=documents.filter((item)=>item.required);
  const documentsComplete=requiredDocuments.length>0&&requiredDocuments.every((item)=>item.uploaded&&item.status!=="REJECTED");

  async function submitRequest(providerHotelId:string){
    const id=providerHotelId.trim();if(!id)return;
    if(!documentsComplete){setMessage(ar?"ارفع جميع مستندات التحقق المطلوبة أولًا، وبعدها أرسل طلب الملكية للإدارة.":"Upload all required verification documents first, then submit the ownership request for admin review.");return;}
    setBusyId(id);setMessage(null);
    try{
      const response=await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/nuitee-claim`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({providerHotelId:id})});
      const body=await response.json().catch(()=>null) as {data?:ClaimRequest;error?:{message?:string}}|null;
      if(!response.ok||!body?.data)throw new Error(body?.error?.message??(ar?"تعذر إرسال طلب الملكية.":"Could not submit the ownership request."));
      setClaimRequest(body.data);setSelected(null);setResults([]);setQuery("");setManualId("");
      setMessage(ar?"تم إرسال طلب الملكية للإدارة مع مستنداتك. نسخة المورد ستبقى ظاهرة إلى أن يتم اعتماد الطلب، وبعد الاعتماد تختفي تلقائيًا.":"Ownership request sent to the HandMeKey admin with your documents. The supplier listing stays visible until approval, then it is replaced automatically.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusyId(null);}
  }

  async function removeOrCancel(){
    setBusyId("unlink");setMessage(null);
    try{
      const response=await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/nuitee-claim`,{method:"DELETE"});
      const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
      if(!response.ok)throw new Error(body?.error?.message??(ar?"تعذر تنفيذ الطلب.":"Could not complete the request."));
      if(claim){setClaim(null);setMessage(ar?"تم إلغاء الربط. نسخة المورد قد تصبح مؤهلة للظهور مرة أخرى.":"Connection removed. The supplier listing may become eligible to appear again.");}
      else{setClaimRequest(null);setMessage(ar?"تم إلغاء طلب الملكية المعلق.":"Pending ownership request canceled.");}
      setQuery(hotelName);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusyId(null);}
  }

  function chooseHotel(hotel:Candidate){setSelected(hotel);setResults([]);setMessage(null);}

  return <section className="partnerInsight" style={{alignItems:"flex-start",gap:16}}>
    <Building2 size={22}/><div style={{width:"100%",minWidth:0}}>
      <strong>{ar?"ملكية الفندق وربط نسخة المورد":"Property ownership & supplier listing"}</strong>
      <p>{ar?"ابحث عن فندقك، اختر «هذا فندقي»، ارفع مستندات الملكية، ثم أرسل الطلب. لن يتم استبدال نسخة المورد إلا بعد مراجعة HandMeKey واعتماد الملكية.":"Find your hotel, choose “This is my property”, upload the ownership documents and submit the request. The supplier listing is not replaced until HandMeKey reviews and approves ownership."}</p>

      {claim?<div style={{display:"grid",gap:12,marginTop:16,padding:16,border:"1px solid rgba(34,120,79,.24)",borderRadius:14,background:"rgba(34,120,79,.06)"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><span style={{display:"grid",placeItems:"center",width:34,height:34,borderRadius:10,background:"rgba(34,120,79,.12)"}}><BadgeCheck size={19}/></span><div><b>{claim.providerHotelName}</b><div style={{fontSize:12,opacity:.7,marginTop:2}}>{ar?"تم اعتماد الملكية — نسخة المورد مخفية عن الضيوف":"Ownership approved — supplier copy hidden from guests"}</div></div></div>
        <div style={{fontSize:12,lineHeight:1.6,opacity:.78}}>{ar?"الرابط القديم لنسخة المورد يتحول إلى صفحة فندقك، والمزامنة الدورية لا تعيد النسخة المكررة.":"The old supplier URL redirects to your property page and scheduled sync does not restore the duplicate listing."}</div>
        <div><button className="partnerSecondaryAction" type="button" disabled={busyId!==null} onClick={removeOrCancel}><Unlink size={15}/>{busyId==="unlink"?(ar?"جاري التنفيذ...":"Working..."):(ar?"إلغاء الربط":"Remove connection")}</button></div>
      </div>:claimRequest?.status==="PENDING"?<div style={{display:"grid",gap:13,marginTop:16,padding:17,border:"1px solid rgba(174,126,26,.3)",borderRadius:14,background:"rgba(201,169,80,.08)"}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{display:"grid",placeItems:"center",width:36,height:36,borderRadius:10,background:"rgba(201,169,80,.15)"}}><Clock3 size={19}/></span><div><b>{claimRequest.providerHotelName}</b><div style={{fontSize:12,opacity:.72,marginTop:2}}>{ar?"طلب الملكية بانتظار مراجعة HandMeKey":"Ownership request pending HandMeKey review"}</div></div></div>
        <div style={{fontSize:12,lineHeight:1.65,opacity:.78}}>{ar?"وصل الطلب إلى لوحة الإدارة مع السجل التجاري، رخصة التشغيل، التسجيل الضريبي، هوية المالك/المفوض وإثبات الحساب البنكي. نسخة المورد لن تختفي قبل الاعتماد.":"The admin received your request with the commercial registration, operating license, tax registration, owner/representative ID and bank proof. The supplier listing remains visible until approval."}</div>
        <div><button className="partnerSecondaryAction" type="button" disabled={busyId!==null} onClick={removeOrCancel}>{busyId==="unlink"?(ar?"جاري الإلغاء...":"Canceling..."):(ar?"إلغاء الطلب":"Cancel request")}</button></div>
      </div>:<>
        {claimRequest?.status==="REJECTED"&&<div style={{marginTop:14,padding:14,border:"1px solid rgba(175,54,54,.25)",borderRadius:12,background:"rgba(175,54,54,.05)"}}><b>{ar?"تم رفض طلب الملكية السابق":"Previous ownership claim was rejected"}</b><p style={{margin:"6px 0 0",fontSize:12}}>{claimRequest.rejectionReason||(ar?"راجع المستندات واختر الفندق الصحيح ثم أرسل طلبًا جديدًا.":"Review your documents and property match, then submit a new request.")}</p></div>}

        {!selected&&<><div style={{position:"relative",marginTop:16}}><Search size={17} style={{position:"absolute",top:13,insetInlineStart:13,opacity:.55,pointerEvents:"none"}}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={ar?"مثال: Hilton Amman":"Example: Hilton Amman"} aria-label={ar?"ابحث عن فندقك":"Find your property"} style={{width:"100%",padding:"12px 42px",border:"1px solid var(--border,#d8d8d8)",borderRadius:12,fontSize:14,background:"var(--surface,#fff)"}}/>{searching&&<span style={{position:"absolute",top:13,insetInlineEnd:13,fontSize:12,opacity:.6}}>{ar?"بحث…":"Searching…"}</span>}</div>
        {query.trim().length>=2&&!searching&&results.length===0&&<p style={{marginTop:10,fontSize:12,opacity:.7}}>{ar?"إذا لم يظهر الفندق، جرّب جزءًا من الاسم أو المدينة.":"No match yet? Try part of the hotel name or its city."}</p>}
        {results.length>0&&<div style={{display:"grid",gap:10,marginTop:12}}>{results.map((hotel)=>{const location=[hotel.area,hotel.city].filter(Boolean).join(" · ");return <div key={hotel.providerHotelId} style={{display:"grid",gridTemplateColumns:"84px minmax(0,1fr) auto",gap:13,alignItems:"center",padding:10,border:"1px solid var(--border,#e1e4e8)",borderRadius:14,background:"var(--surface,#fff)"}}>
          <div style={{width:84,height:68,borderRadius:10,overflow:"hidden",background:"rgba(15,35,58,.07)",display:"grid",placeItems:"center"}}>{hotel.coverPhoto?<img src={hotel.coverPhoto} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<Building2 size={20} style={{opacity:.45}}/>}</div>
          <div style={{minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><b style={{fontSize:14}}>{hotel.name}</b>{hotel.starRating&&hotel.starRating>0?<span style={{fontSize:12,whiteSpace:"nowrap"}}>{Math.round(hotel.starRating)}★</span>:null}</div>{location&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:5,fontSize:12,opacity:.7}}><MapPin size={13}/><span>{location}</span></div>}{hotel.address&&<div style={{marginTop:4,fontSize:11,opacity:.55,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hotel.address}</div>}</div>
          <button className="partnerSecondaryAction" type="button" disabled={busyId!==null} onClick={()=>chooseHotel(hotel)} style={{whiteSpace:"nowrap"}}><Check size={15}/>{ar?"هذا فندقي":"This is my property"}</button>
        </div>;})}</div>}
        <details style={{marginTop:14,fontSize:12}}><summary style={{cursor:"pointer",opacity:.72}}>{ar?"لم تجد فندقك؟ استخدام Provider ID يدويًا":"Can't find your property? Use a Provider ID manually"}</summary><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><input value={manualId} onChange={(event)=>setManualId(event.target.value)} placeholder="Provider ID" style={{minWidth:220,flex:"1 1 220px",padding:"10px 11px",border:"1px solid var(--border,#d8d8d8)",borderRadius:10}}/><button className="partnerSecondaryAction" type="button" disabled={!manualId.trim()} onClick={()=>setSelected({providerHotelId:manualId.trim(),name:manualId.trim(),city:null,area:null,address:null,starRating:null,coverPhoto:null})}><Link2 size={15}/>{ar?"اختيار":"Select"}</button></div></details></>}

        {selected&&<div style={{display:"grid",gap:14,marginTop:16,padding:17,border:"1px solid rgba(15,35,58,.14)",borderRadius:15,background:"rgba(15,35,58,.025)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><div><span className="eyebrow">{ar?"الفندق المختار":"Selected property"}</span><h3 style={{margin:"4px 0"}}>{selected.name}</h3><span style={{fontSize:12,opacity:.65}}>{[selected.area,selected.city].filter(Boolean).join(" · ")||`Provider ID ${selected.providerHotelId}`}</span></div><button className="partnerSecondaryAction" type="button" onClick={()=>{setSelected(null);setQuery(hotelName);}}>{ar?"تغيير الفندق":"Change property"}</button></div>
          <div><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}><ShieldCheck size={17}/><b>{ar?"مستندات التحقق المطلوبة":"Required verification documents"}</b></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:8}}>{requiredDocuments.map((doc)=><div key={doc.type} style={{padding:11,border:"1px solid #e2e7eb",borderRadius:11,display:"flex",gap:8,alignItems:"center"}}>{doc.uploaded&&doc.status!=="REJECTED"?<FileCheck2 size={17}/>:<FileWarning size={17}/>}<div><b style={{fontSize:12}}>{documentLabel(doc.type,ar)}</b><div style={{fontSize:11,opacity:.62,marginTop:2}}>{doc.uploaded?(doc.status==="REJECTED"?(ar?"مرفوض — ارفع بديلًا":"Rejected — upload a replacement"):(ar?"مرفوع":"Uploaded")):(ar?"مطلوب":"Required")}</div></div></div>)}</div></div>
          {!documentsComplete?<div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><a className="partnerSecondaryAction" href="#verification-documents"><FileWarning size={15}/>{ar?"رفع المستندات المطلوبة":"Upload required documents"}</a><span style={{fontSize:12,opacity:.68}}>{ar?"بعد رفع جميع الملفات ارجع لهذا القسم وأرسل الطلب.":"After all files are uploaded, return here and submit the request."}</span></div>:<button className="primaryButton" type="button" disabled={busyId!==null} onClick={()=>submitRequest(selected.providerHotelId)}><Send size={16}/>{busyId===selected.providerHotelId?(ar?"جاري إرسال الطلب...":"Submitting request..."):(ar?"إرسال طلب الملكية إلى HandMeKey":"Submit ownership request to HandMeKey")}</button>}
        </div>}
      </>}
      {message&&<p style={{marginTop:12,fontWeight:600}}>{message}</p>}
    </div>
  </section>;
}

function documentLabel(type:string,ar:boolean):string{
  const labels:Record<string,[string,string]>={
    COMMERCIAL_REGISTRATION:["السجل التجاري","Commercial registration"],
    BUSINESS_LICENSE:["رخصة مزاولة/تشغيل الفندق","Hotel/business operating license"],
    TAX_REGISTRATION:["التسجيل الضريبي","Tax registration"],
    OWNER_ID:["هوية المالك أو المفوض","Owner / authorized representative ID"],
    BANK_PROOF:["إثبات الحساب البنكي","Bank account proof"],
  };
  return labels[type]?.[ar?0:1]??type.replaceAll("_"," ");
}
