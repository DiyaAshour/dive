"use client";

import {BadgeCheck} from "lucide-react";
import {useEffect,useMemo,useRef,useState} from "react";

type Hotel={id:string;slug:string;name:string;city:string;area:string|null;starRating:number|null;coverPhoto:{url:string;alt:string}|null;reviewSummary:{count:number;overall:number|null}};
type Page={hotels:Hotel[];total:number;nextOffset:number|null};

type Props={destination:string;country:string;arrival:string;departure:string;adults:number;children:number;childrenAges:readonly number[];seenSlugs:readonly string[];startOffset?:number;locale:string};

export function InfiniteStoredHotels({destination,country,arrival,departure,adults,children,childrenAges,seenSlugs,startOffset=0,locale}:Props){
  const ar=locale==="ar";
  const [items,setItems]=useState<Hotel[]>([]);
  const [offset,setOffset]=useState<number|null>(startOffset);
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const sentinel=useRef<HTMLDivElement>(null);
  const seen=useRef(new Set(seenSlugs));
  const stayQuery=useMemo(()=>{const q=new URLSearchParams({arrival,departure,adults:String(adults),children:String(children)});childrenAges.forEach((age)=>q.append("childrenAge",String(age)));return q.toString();},[arrival,departure,adults,children,childrenAges]);

  async function loadMore(){
    if(loading||done||offset===null)return;
    setLoading(true);
    try{
      const q=new URLSearchParams({destination,country,offset:String(offset),limit:"20"});
      const response=await fetch(`/api/v1/search/stored-hotels?${q.toString()}`,{cache:"no-store"});
      if(!response.ok)throw new Error(`stored hotel page ${response.status}`);
      const page=await response.json() as Page;
      const fresh=page.hotels.filter((hotel)=>!seen.current.has(hotel.slug));
      fresh.forEach((hotel)=>seen.current.add(hotel.slug));
      if(fresh.length)setItems((current)=>[...current,...fresh]);
      setOffset(page.nextOffset);
      if(page.nextOffset===null)setDone(true);
    }catch(error){console.error("More hotels could not be loaded",error);setDone(true);}finally{setLoading(false);}
  }

  useEffect(()=>{
    const node=sentinel.current;if(!node||done)return;
    const observer=new IntersectionObserver((entries)=>{if(entries.some((entry)=>entry.isIntersecting))void loadMore();},{rootMargin:"900px 0px"});
    observer.observe(node);return()=>observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[offset,done,loading]);

  return <>
    {items.map((hotel)=>{const href=`/hotel/${hotel.slug}?${stayQuery}`;return <article className="premiumResultCard" key={hotel.id}>
      <a className="premiumResultMedia" href={href}>{hotel.coverPhoto?<img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt} loading="lazy" decoding="async"/>:<div className="stayCardPlaceholder">{ar?"الصورة قيد التحديث":"Photo pending"}</div>}<span className="verifiedPill"><BadgeCheck size={14}/>{ar?"متاح للحجز":"Bookable"}</span></a>
      <div className="premiumResultContent"><div className="premiumResultMain"><div className="stayCardMeta">{hotel.starRating?`${hotel.starRating}★ · `:""}{hotel.area?`${hotel.area}, `:""}{hotel.city}</div><a href={href}><h2>{hotel.name}</h2></a>{hotel.reviewSummary.overall!==null&&hotel.reviewSummary.overall>0&&<div className="resultRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} {ar?"تقييم":"reviews"}</span></div>}<div className="resultPolicy"><strong>{ar?"تحقق من السعر المباشر":"Check live price"}</strong><span>{ar?"يتم جلب التوفر والسعر عند فتح الفندق":"Availability and price load when you open the hotel"}</span></div></div><div className="premiumResultPrice"><span>{ar?"فندق إضافي في نتائج عمّان":"More Amman hotels"}</span><strong>{ar?"سعر مباشر عند الفتح":"Live price on open"}</strong><a className="resultCta" href={href}>{ar?"عرض الغرف":"See rooms"}</a></div></div>
    </article>;})}
    <div ref={sentinel} style={{minHeight:72,display:"grid",placeItems:"center"}} aria-live="polite">{loading?<span>{ar?"جاري تحميل فنادق إضافية…":"Loading more hotels…"}</span>:done&&items.length>0?<span style={{opacity:.55}}>{ar?"تم عرض كل الفنادق المحفوظة لهذه الوجهة":"All stored hotels for this destination are shown"}</span>:null}</div>
  </>;
}
