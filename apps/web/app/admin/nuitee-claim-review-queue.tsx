"use client";

import {useState} from "react";
import {BadgeCheck,Building2,FileCheck2,MapPin,ShieldCheck,UserRound} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type DocumentStatus=Readonly<{
  type:string;
  required:boolean;
  uploaded:boolean;
  status:string|null;
  documentId:string|null;
  fileName:string|null;
  contentType:string|null;
  sizeBytes:number|null;
  rejectionReason:string|null;
}>;

type ClaimRequest=Readonly<{
  id:string;
  hotelId:string;
  providerHotelId:string;
  submittedAt:string;
  hotel:{id:string;name:string;slug:string;city:string;countryCode:string;status:string;verified:boolean;starRating:number|null}|null;
  provider:{providerHotelId:string;name:string;city:string|null;countryCode:string|null;area:string|null;address:string|null;starRating:number|null;coverPhoto:string|null}|null;
  submitter:{id:string;displayName:string;email:string}|null;
  documents:DocumentStatus[];
}>;

export default function NuiteeClaimReviewQueue({requests,locale}:{requests:ClaimRequest[];locale:Locale}){
  const ar=locale==="ar";
  const [items,setItems]=useState(requests);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const [message,setMessage]=useState<string|null>(null);

  async function decide(requestId:string,decision:"APPROVE"|"REJECT"){
    const reason=reasons[requestId]?.trim()??"";
    if(decision==="REJECT"&&reason.length<10){setMessage(ar?"اكتب سبب رفض واضح لا يقل عن 10 أحرف.":"Enter a clear rejection reason of at least 10 characters.");return;}
    const confirmText=decision==="APPROVE"
      ? (ar?"اعتماد ملكية الفندق؟ سيتم إخفاء نسخة المورد فورًا واعتماد مستندات الطلب.":"Approve property ownership? The supplier copy will be hidden immediately and the submitted documents will be approved.")
      : (ar?"رفض طلب الملكية وإرسال السبب للشريك؟":"Reject this ownership request and record the reason for the partner?");
    if(!window.confirm(confirmText))return;
    setBusyId(requestId);setMessage(null);
    try{
      const response=await fetch(`/api/v1/admin/nuitee-claim-requests/${encodeURIComponent(requestId)}/decision`,{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({decision,...(reason?{reason}:{})}),
      });
      const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
      if(response.status===401){window.location.assign("/admin/login?next=/admin");return;}
      if(!response.ok)throw new Error(body?.error?.message??(ar?"تعذر مراجعة الطلب.":"Could not review the ownership request."));
      setItems((current)=>current.filter((item)=>item.id!==requestId));
      setMessage(decision==="APPROVE"?(ar?"تم اعتماد الملكية واستبدال نسخة المورد بالفندق الحقيقي.":"Ownership approved and the supplier listing was replaced by the partner property."):(ar?"تم رفض الطلب وتسجيل السبب.":"Ownership request rejected and the reason was recorded."));
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusyId(null);}
  }

  return <section className="panel" style={{marginBottom:24}}>
    <div className="sectionHeading"><div><span className="eyebrow">{ar?"ملكية الفنادق":"Property ownership"}</span><h2>{ar?"طلبات استبدال فنادق المورد":"Supplier hotel takeover requests"}</h2><p className="muted">{ar?"كل طلب يجمع الفندق الذي اختاره الشريك، بيانات حساب مقدم الطلب، والوثائق الخاصة المطلوبة. لا تختفي نسخة المورد إلا بعد اعتمادك.":"Each request includes the matched supplier hotel, partner account details and all required private documents. The supplier listing stays live until you approve the claim."}</p></div><strong>{items.length} {ar?"طلب معلق":"pending"}</strong></div>
    {items.length===0?<p className="muted">{ar?"لا توجد طلبات ملكية بانتظار المراجعة.":"No ownership claims are waiting for review."}</p>:<div style={{display:"grid",gap:18}}>{items.map((request)=>{
      const docsComplete=request.documents.every((doc)=>!doc.required||doc.uploaded);
      return <article key={request.id} style={{border:"1px solid rgba(15,35,58,.13)",borderRadius:18,padding:18,display:"grid",gap:16,background:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div><span className="eyebrow">{ar?"طلب ملكية جديد":"New ownership claim"}</span><h3 style={{margin:"5px 0 4px"}}>{request.hotel?.name??(ar?"فندق Partner":"Partner property")}</h3><div className="muted">{formatDate(request.submittedAt,locale)}</div></div>
          <span className={docsComplete?"statusOk":"statusReview"}><ShieldCheck size={14}/> {docsComplete?(ar?"الوثائق مكتملة":"Documents complete"):(ar?"وثائق ناقصة":"Documents missing")}</span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
          <div style={{padding:14,border:"1px solid #e3e8ed",borderRadius:14}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}><Building2 size={16}/><strong>{ar?"فندق Partner":"Partner property"}</strong></div><b>{request.hotel?.name??"—"}</b><div className="muted" style={{marginTop:5}}>{request.hotel?[request.hotel.city,request.hotel.countryCode].filter(Boolean).join(" · "):"—"}</div><div className="muted" style={{marginTop:4}}>ID: {request.hotelId}</div></div>
          <div style={{padding:14,border:"1px solid #e3e8ed",borderRadius:14}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}><BadgeCheck size={16}/><strong>{ar?"الفندق المطابق من المورد":"Matched supplier hotel"}</strong></div><b>{request.provider?.name??request.providerHotelId}</b><div className="muted" style={{marginTop:5,display:"flex",gap:5,alignItems:"center"}}><MapPin size={13}/>{request.provider?[request.provider.area,request.provider.city,request.provider.countryCode].filter(Boolean).join(" · "):"—"}</div>{request.provider?.address&&<div className="muted" style={{marginTop:4}}>{request.provider.address}</div>}<div className="muted" style={{marginTop:4}}>Provider ID: {request.providerHotelId}{request.provider?.starRating?` · ${Math.round(request.provider.starRating)}★`:""}</div></div>
          <div style={{padding:14,border:"1px solid #e3e8ed",borderRadius:14}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}><UserRound size={16}/><strong>{ar?"مقدم الطلب":"Submitted by"}</strong></div><b>{request.submitter?.displayName??"—"}</b><div className="muted" style={{marginTop:5}}>{request.submitter?.email??"—"}</div></div>
        </div>

        <div><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><FileCheck2 size={17}/><strong>{ar?"وثائق التحقق المرفقة":"Attached verification documents"}</strong></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>{request.documents.map((doc)=><div key={doc.type} style={{padding:11,border:"1px solid #e5e9ed",borderRadius:12,display:"grid",gap:5}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:12}}>{documentLabel(doc.type,ar)}</b><span style={{fontSize:11}}>{doc.uploaded?(doc.status??(ar?"مرفوع":"Uploaded")):(ar?"ناقص":"Missing")}</span></div>{doc.fileName&&<span className="muted" style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis"}}>{doc.fileName}</span>}{doc.documentId?<a className="secondaryButton" style={{marginTop:3,textAlign:"center"}} href={`/api/v1/admin/hotel-documents/${encodeURIComponent(doc.documentId)}/download`} target="_blank" rel="noreferrer">{ar?"فتح المستند الخاص":"Open private document"}</a>:null}</div>)}</div></div>

        <div style={{display:"grid",gridTemplateColumns:"minmax(220px,1fr) auto",gap:10,alignItems:"center"}}><input value={reasons[request.id]??""} onChange={(event)=>setReasons((current)=>({...current,[request.id]:event.target.value}))} placeholder={ar?"سبب الرفض عند الحاجة":"Rejection reason if needed"}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="primaryButton" disabled={busyId!==null||!docsComplete} onClick={()=>void decide(request.id,"APPROVE")}>{ar?"اعتماد الملكية":"Approve ownership"}</button><button className="secondaryButton" disabled={busyId!==null} onClick={()=>void decide(request.id,"REJECT")}>{ar?"رفض الطلب":"Reject"}</button></div></div>
      </article>;
    })}</div>}
    {message&&<div className="setupMessage" style={{marginTop:14}}>{message}</div>}
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

function formatDate(value:string,locale:Locale):string{return new Intl.DateTimeFormat(locale==="ar"?"ar-JO":"en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}
