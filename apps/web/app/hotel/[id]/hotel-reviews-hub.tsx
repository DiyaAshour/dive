"use client";

import { ChevronRight, MessageSquareText, ShieldCheck, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";

type ReviewSummary = Readonly<{
  count: number;
  overall: number | null;
  cleanliness: number | null;
  staff: number | null;
  location: number | null;
  facilities: number | null;
  comfort: number | null;
  value: number | null;
}>;

type ReviewItem = Readonly<{
  id: string;
  overall: number;
  cleanliness: number;
  staff: number;
  location: number;
  facilities: number;
  comfort: number;
  value: number;
  title: string | null;
  comment: string;
  hotelReply: string | null;
  guestName: string;
  stayCompleted: string;
}>;

type ReviewData = Readonly<{summary: ReviewSummary; reviews: ReviewItem[]}>;

export function HotelReviewsHub({reviews,locale}:{reviews:ReviewData;locale:Locale}) {
  const copy=reviewCopy(locale);
  const [open,setOpen]=useState(false);
  const closeRef=useRef<HTMLButtonElement>(null);
  const titleId=useId();
  const count=reviews.summary.count;
  const hasReviews=count>0&&reviews.summary.overall!==null;
  const categories=[
    {label:copy.cleanliness,value:reviews.summary.cleanliness},
    {label:copy.staff,value:reviews.summary.staff},
    {label:copy.location,value:reviews.summary.location},
    {label:copy.facilities,value:reviews.summary.facilities},
    {label:copy.comfort,value:reviews.summary.comfort},
    {label:copy.value,value:reviews.summary.value},
  ];

  useEffect(()=>{
    if(!open)return;
    const previous=document.documentElement.style.overflow;
    document.documentElement.style.overflow="hidden";
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    window.addEventListener("keydown",onKeyDown);
    window.setTimeout(()=>closeRef.current?.focus(),0);
    return ()=>{document.documentElement.style.overflow=previous;window.removeEventListener("keydown",onKeyDown);};
  },[open]);

  const score=reviews.summary.overall;
  return <section className={`hotelReviewsHub reviewsSection ${hasReviews?"hasReviews":"isPending"}`} aria-label={copy.title}>
    <button className="hotelReviewsSummaryButton" type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog">
      <span className="hotelReviewsSummaryIcon"><MessageSquareText size={22}/></span>
      <span className="hotelReviewsSummaryCopy"><small>{copy.kicker}</small><strong>{copy.title}</strong><em>{hasReviews?copy.count(count):copy.waiting}</em></span>
      <span className="hotelReviewsSummaryScore"><b>{score?.toFixed(1)??"—"}</b><span>{hasReviews?ratingLabel(score!,locale):copy.pending}</span><small>{copy.outOf10}</small></span>
      <span className="hotelReviewsOpenCue"><span>{copy.open}</span><ChevronRight size={18}/></span>
    </button>

    {open&&typeof document!=="undefined"&&createPortal(
      <div className="hotelReviewsModalBackdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}>
        <section className="hotelReviewsModal" role="dialog" aria-modal="true" aria-labelledby={titleId} dir={locale==="ar"?"rtl":"ltr"}>
          <header className="hotelReviewsModalHeader">
            <div><span>{copy.kicker}</span><h2 id={titleId}>{copy.title}</h2><p>{copy.dialogBody}</p></div>
            <button ref={closeRef} type="button" onClick={()=>setOpen(false)} aria-label={copy.close}><X size={21}/></button>
          </header>

          <div className="hotelReviewsModalBody">
            {!hasReviews?<div className="hotelReviewsPendingState"><span><ShieldCheck size={34}/></span><h3>{copy.pending}</h3><p>{copy.pendingBody}</p><small>{copy.integrity}</small></div>:<>
              <section className="hotelReviewsScorePanel">
                <div className="hotelReviewsOverall"><strong>{score?.toFixed(1)}</strong><span>{ratingLabel(score!,locale)}</span><small>{copy.outOf10} · {copy.count(count)}</small></div>
                <div className="hotelReviewsCategoryGrid">{categories.map((item)=><div className="hotelReviewsCategory" key={item.label}><div><span>{item.label}</span><strong>{item.value?.toFixed(1)??"—"}</strong></div><div><i style={{width:item.value===null?"0%":`${Math.max(0,Math.min(100,item.value*10))}%`}}/></div></div>)}</div>
              </section>

              <section className="hotelReviewsListSection">
                <div className="hotelReviewsListHead"><div><span>{copy.reviewsKicker}</span><h3>{copy.reviewsTitle}</h3></div><strong>{copy.count(count)}</strong></div>
                <div className="hotelReviewsList">{reviews.reviews.map((review)=><article key={review.id}>
                  <div className="hotelReviewCardHead"><span className="hotelReviewScore"><Star size={13} fill="currentColor"/>{review.overall}/10</span><div><strong>{review.guestName}</strong><small><ShieldCheck size={12}/>{copy.verifiedStay} · {review.stayCompleted}</small></div></div>
                  {review.title&&<h4>{review.title}</h4>}
                  <p>{review.comment}</p>
                  {review.hotelReply&&<div className="hotelReviewReply"><strong>{copy.propertyReply}</strong><p>{review.hotelReply}</p></div>}
                </article>)}</div>
              </section>
            </>}
          </div>
        </section>
      </div>,document.body)}
  </section>;
}

function ratingLabel(score:number,locale:Locale):string {
  if(locale==="ar"){
    if(score>=9)return "استثنائي";
    if(score>=8)return "رائع";
    if(score>=7)return "جيد جدًا";
    if(score>=6)return "جيد";
    return "مقبول";
  }
  if(score>=9)return "Exceptional";
  if(score>=8)return "Excellent";
  if(score>=7)return "Very good";
  if(score>=6)return "Good";
  return "Fair";
}

function reviewCopy(locale:Locale) {
  if(locale==="ar")return {
    kicker:"تقييمات من إقامات موثقة",title:"تقييمات الضيوف",waiting:"بانتظار أول تقييم موثق",pending:"قيد التقييم",outOf10:"من 10",open:"عرض التقييمات",close:"إغلاق التقييمات",dialogBody:"كل الدرجات والمراجعات هنا تأتي من ضيوف أكملوا إقاماتهم.",pendingBody:"لم يصل تقييم موثق لهذا الفندق بعد. عند وصول أول مراجعة من إقامة مكتملة ستظهر الدرجة والتفاصيل هنا تلقائيًا.",integrity:"لا نعرض درجات تجريبية أو تقييمات غير مرتبطة بإقامة مكتملة.",cleanliness:"النظافة",staff:"الخدمة والاستقبال",location:"الموقع",facilities:"المرافق",comfort:"راحة الغرفة",value:"القيمة مقابل السعر",reviewsKicker:"آراء الضيوف",reviewsTitle:"المراجعات الموثقة",verifiedStay:"إقامة موثقة",propertyReply:"رد المنشأة",count:(value:number)=>value===1?"تقييم موثق واحد":`${value} تقييمات موثقة`,
  };
  return {
    kicker:"Verified-stay ratings",title:"Guest reviews",waiting:"Waiting for the first verified review",pending:"Pending",outOf10:"out of 10",open:"View reviews",close:"Close reviews",dialogBody:"Every score and review shown here comes from a guest who completed their stay.",pendingBody:"This property has not received a verified review yet. The score and full review details will appear here automatically after the first completed stay review.",integrity:"No demo scores or reviews without a completed stay are shown.",cleanliness:"Cleanliness",staff:"Service & staff",location:"Location",facilities:"Facilities",comfort:"Room comfort",value:"Value for money",reviewsKicker:"Guest voice",reviewsTitle:"Verified reviews",verifiedStay:"Verified stay",propertyReply:"Property response",count:(value:number)=>`${value} verified ${value===1?"review":"reviews"}`,
  };
}
