"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, CheckCircle2, XCircle } from "lucide-react";
import type {Locale} from "@/lib/i18n";

type Review = {
  id:string;
  submittedRevision:number;
  submittedAt:string;
  stale:boolean;
  submittedBy:{displayName:string;email:string};
  company:{
    id:string;
    name:string;
    city:string;
    countryCode:string;
    address:string;
    status:string;
    verified:boolean;
    publishRevision:number;
    supportEmail:string|null;
    supportPhone:string|null;
    counts:{vehicles:number;locations:number};
  };
};

export default function CarCompanyReviewQueue({reviews,locale}:{reviews:Review[];locale:Locale}){
  const ar=locale==="ar";
  const router=useRouter();
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);

  async function decide(reviewId:string,decision:"APPROVE"|"REJECT"){
    const reason=reasons[reviewId]?.trim();
    if(decision==="REJECT"&&!reason){setMessage(ar?"اكتب سبب الرفض قبل المتابعة.":"Add a rejection reason before continuing.");return;}
    const confirmation=decision==="APPROVE"?(ar?"اعتماد هذه النسخة من شركة السيارات وتفعيلها؟":"Approve this exact car company revision and activate it?"):(ar?"رفض الطلب وإعادة الشركة إلى المسودة؟":"Reject this submission and return the company to draft?");
    if(!window.confirm(confirmation))return;
    setBusy(`${reviewId}:${decision}`);setMessage(null);
    try{
      const response=await fetch(`/api/v1/admin/car-company-reviews/${reviewId}/decision`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({decision,reason:reason||undefined})});
      const payload=await response.json();
      if(response.status===401){window.location.assign("/admin/login?next=/admin");return;}
      if(!response.ok)throw new Error(payload?.error?.message??"Unable to resolve car company review");
      setMessage(decision==="APPROVE"?(ar?"تم اعتماد شركة السيارات وتفعيلها.":"Car company approved and activated."):(ar?"تم رفض الطلب وإعادة الشركة إلى المسودة.":"Submission rejected and company returned to draft."));
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to resolve car company review");}
    finally{setBusy(null);}
  }

  return <section className="panel" style={{marginBottom:24}}>
    <div className="sectionHeading"><div><span className="eyebrow">{ar?"سيارات · التحقق":"Cars · verification"}</span><h2>{ar?"طلبات اعتماد شركات تأجير السيارات":"Pending car company reviews"}</h2></div><strong>{reviews.length}</strong></div>
    {reviews.length===0?<p className="muted">{ar?"لا توجد شركات سيارات بانتظار المراجعة.":"No car rental companies are waiting for review."}</p>:<div style={{display:"grid",gap:14}}>{reviews.map((review)=><article className="alertCard" key={review.id} style={{alignItems:"flex-start"}}>
      <span style={{display:"grid",placeItems:"center",width:58,height:58,borderRadius:14,background:"#eef3f7",color:"#17324d",flex:"0 0 58px"}}><CarFront size={27}/></span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong>{review.company.name}</strong><p className="muted">{review.company.city}, {review.company.countryCode} · {review.company.counts.vehicles} {ar?"سيارة":"vehicles"} · {review.company.counts.locations} {ar?"فروع":"locations"}</p><p className="muted">{ar?"أرسلها":"Submitted by"} {review.submittedBy.displayName} · revision {review.submittedRevision}</p></div><span className={review.stale?"statusReview":"statusOk"}>{review.stale?"STALE":"CURRENT"}</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:10,fontSize:12}}><span><strong>{ar?"العنوان: ":"Address: "}</strong>{review.company.address}</span><span><strong>{ar?"البريد: ":"Email: "}</strong>{review.company.supportEmail??"—"}</span><span><strong>{ar?"الهاتف: ":"Phone: "}</strong>{review.company.supportPhone??"—"}</span></div>
        <textarea placeholder={ar?"ملاحظة المراجعة — إلزامية عند الرفض.":"Review note — required when rejecting."} value={reasons[review.id]??""} onChange={(event)=>setReasons((current)=>({...current,[review.id]:event.target.value}))} style={{width:"100%",minHeight:72,marginTop:10}}/>
        <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}><button className="primaryButton" type="button" disabled={review.stale||busy!==null} onClick={()=>decide(review.id,"APPROVE")}><CheckCircle2 size={17}/>{busy===`${review.id}:APPROVE`?(ar?"جارٍ الاعتماد…":"Approving..."):(ar?"اعتماد وتفعيل":"Approve & activate")}</button><button className="secondaryButton" type="button" disabled={busy!==null} onClick={()=>decide(review.id,"REJECT")}><XCircle size={17}/>{busy===`${review.id}:REJECT`?(ar?"جارٍ الرفض…":"Rejecting..."):(ar?"رفض":"Reject")}</button></div>
      </div>
    </article>)}</div>}
    {message&&<p style={{marginTop:14}}>{message}</p>}
  </section>;
}
