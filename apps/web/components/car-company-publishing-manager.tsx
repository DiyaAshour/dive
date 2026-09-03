"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Clock3, Send, ShieldCheck, XCircle } from "lucide-react";
import styles from "./car-partner-shell.module.css";

type Readiness = {
  companyId: string;
  companyName: string;
  status: string;
  verified: boolean;
  publishRevision: number;
  publishedRevision: number | null;
  lastPublishedAt: string | null;
  ready: boolean;
  checks: Array<{code:string;label:string;passed:boolean;detail:string}>;
  counts: {activeLocations:number;activeVehicles:number;publishableVehicles:number};
  latestReview: null | {
    id:string;
    status:string;
    submittedRevision:number;
    decisionReason:string|null;
    submittedAt:string;
    reviewedAt:string|null;
  };
};

export function CarCompanyPublishingManager({initialReadiness, locale, role}:{initialReadiness:Readiness;locale:"ar"|"en";role:string}) {
  const ar=locale==="ar";
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const canSubmit=role==="OWNER"||role==="MANAGER";
  const readiness=initialReadiness;
  const pending=readiness.status==="PENDING_REVIEW";
  const active=readiness.status==="ACTIVE"&&readiness.verified;
  const suspended=readiness.status==="SUSPENDED";
  const rejected=readiness.latestReview?.status==="REJECTED";

  async function submit(){
    if(!readiness.ready||readiness.status!=="DRAFT"||!canSubmit)return;
    if(!window.confirm(ar?"إرسال النسخة الحالية من الشركة للمراجعة؟":"Submit the current company revision for platform review?"))return;
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/v1/cars/partner/publishing",{method:"POST"});
      const payload=await response.json();
      if(response.status===401){window.location.assign("/login?next=/car-dashboard/settings");return;}
      if(!response.ok)throw new Error(payload?.error?.message??"Unable to submit company for review");
      setMessage(ar?"تم إرسال الشركة للمراجعة. لن تظهر السيارات للعامة حتى اعتمادها.":"Company submitted for review. Vehicles remain private until approval.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to submit company for review");}
    finally{setBusy(false);}
  }

  return <section className={styles.panel} style={{marginTop:18,maxWidth:820}}>
    <div className={styles.panelHead}><div><span style={{display:"block",fontSize:10,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",color:"#9a7426"}}>{ar?"بوابة النشر":"Publishing gate"}</span><h2 style={{marginTop:5}}>{ar?"جاهزية واعتماد الشركة":"Company readiness & verification"}</h2></div><StatusIcon active={active} pending={pending} suspended={suspended}/></div>
    <div className={styles.panelBody}>
      {active&&<div className={styles.notice} style={{borderColor:"#cfe8da",background:"#f1fbf5",color:"#176b48"}}><ShieldCheck size={18}/><span>{ar?`الشركة موثقة وفعالة. النسخة المنشورة ${readiness.publishedRevision??readiness.publishRevision}.`:`Company is verified and live. Published revision ${readiness.publishedRevision??readiness.publishRevision}.`}</span></div>}
      {pending&&<div className={styles.notice}><Clock3 size={18}/><span>{ar?`النسخة ${readiness.latestReview?.submittedRevision??readiness.publishRevision} بانتظار قرار الأدمن. السيارات لن تظهر للعامة قبل الموافقة.`:`Revision ${readiness.latestReview?.submittedRevision??readiness.publishRevision} is waiting for an admin decision. Vehicles remain private until approval.`}</span></div>}
      {suspended&&<div className={styles.notice} style={{borderColor:"#f0c8c4",background:"#fff6f5",color:"#9b2c23"}}><CircleAlert size={18}/><span>{ar?"الشركة موقوفة من المنصة ولا يمكن إرسالها للمراجعة حتى إعادتها إلى المسودة.":"This company is suspended by the platform and cannot be submitted until it is restored to draft."}</span></div>}
      {rejected&&readiness.status==="DRAFT"&&<div className={styles.notice} style={{borderColor:"#f0c8c4",background:"#fff6f5",color:"#9b2c23"}}><XCircle size={18}/><span><strong>{ar?"ملاحظات المراجعة: ":"Review feedback: "}</strong>{readiness.latestReview?.decisionReason|| (ar?"تم رفض الطلب. راجع المتطلبات ثم أعد الإرسال.":"The submission was rejected. Review the requirements and submit again.")}</span></div>}

      <div className={styles.checklist}>
        {readiness.checks.map((item)=><div className={styles.checkItem} key={item.code}><span className={styles.checkIcon} style={item.passed?{background:"#e9f7ef",color:"#16794e"}:undefined}>{item.passed?<CheckCircle2 size={17}/>:<CircleAlert size={17}/>}</span><div><strong>{translateLabel(item.code,item.label,ar)}</strong><p>{translateDetail(item.code,item.detail,ar)}</p></div></div>)}
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginTop:18,paddingTop:16,borderTop:"1px solid #edf0f3"}}>
        <div><strong style={{fontSize:13}}>{readiness.ready?(ar?"جاهزة للإرسال":"Ready to submit"):(ar?"أكمل المتطلبات أعلاه":"Complete the requirements above")}</strong><div style={{marginTop:4,color:"#7b8998",fontSize:11}}>{ar?`Revision ${readiness.publishRevision} · ${readiness.counts.publishableVehicles} سيارة جاهزة للنشر`:`Revision ${readiness.publishRevision} · ${readiness.counts.publishableVehicles} publishable vehicle(s)`}</div></div>
        {readiness.status==="DRAFT"&&<button className={styles.primary} type="button" disabled={!readiness.ready||!canSubmit||busy} onClick={submit} style={{opacity:!readiness.ready||!canSubmit||busy?.55:1,cursor:!readiness.ready||!canSubmit?"not-allowed":"pointer"}}><Send size={16}/>{busy?(ar?"جارٍ الإرسال…":"Submitting..."):(ar?"إرسال للمراجعة":"Submit for review")}</button>}
      </div>
      {!canSubmit&&readiness.status==="DRAFT"&&<p className={styles.error}>{ar?"فقط Owner أو Manager يستطيع إرسال الشركة للمراجعة.":"Only an Owner or Manager can submit the company for review."}</p>}
      {message&&<p className={message.includes("submitted")||message.includes("تم إرسال")?styles.success:styles.error}>{message}</p>}
    </div>
  </section>;
}

function StatusIcon({active,pending,suspended}:{active:boolean;pending:boolean;suspended:boolean}){
  if(active)return <ShieldCheck size={22} color="#16794e"/>;
  if(suspended)return <XCircle size={22} color="#b42318"/>;
  if(pending)return <Clock3 size={22} color="#9a7426"/>;
  return <CircleAlert size={22} color="#6a798b"/>;
}

function translateLabel(code:string,fallback:string,ar:boolean){
  if(!ar)return fallback;
  return ({COMPANY_PROFILE:"بيانات الشركة",ACTIVE_LOCATION:"موقع الاستلام والتسليم",ACTIVE_VEHICLE:"سيارة فعالة",VEHICLE_LISTING:"سيارة جاهزة للحجز"} as Record<string,string>)[code]??fallback;
}

function translateDetail(code:string,fallback:string,ar:boolean){
  if(!ar)return fallback;
  const map:Record<string,string>={
    COMPANY_PROFILE:"تأكد من اسم الشركة والمدينة والدولة والعنوان.",
    ACTIVE_LOCATION:"يجب وجود فرع فعّال يسمح بالاستلام والتسليم.",
    ACTIVE_VEHICLE:"يجب إضافة سيارة واحدة فعالة على الأقل.",
    VEHICLE_LISTING:"يجب أن تحتوي سيارة فعالة على البيانات الأساسية وسعر يومي وصورة حقيقية.",
  };
  return map[code]??fallback;
}
