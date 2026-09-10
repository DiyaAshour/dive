"use client";

import {useSearchParams} from "next/navigation";
import {useEffect,useRef} from "react";

type Hotel={id:string;slug:string;name:string;city:string;area:string|null;starRating:number|null;coverPhoto:{url:string;alt:string}|null;reviewSummary:{count:number;overall:number|null}};
type Page={hotels:Hotel[];total:number;nextOffset:number|null};

export function SearchInfiniteLoader(){
  const params=useSearchParams();
  const key=params.toString();
  const state=useRef({offset:0,loading:false,done:false,loaded:new Map<string,Hotel>()});

  useEffect(()=>{
    state.current={offset:0,loading:false,done:false,loaded:new Map()};
    let list:HTMLElement|null=null;
    let sentinel:HTMLDivElement|null=null;
    let observer:IntersectionObserver|null=null;
    let mutation:MutationObserver|null=null;
    let timer:number|undefined;

    const destination=params.get("destination")?.trim()||"Amman";
    const arrival=params.get("arrival")||"";
    const departure=params.get("departure")||"";
    const adults=params.get("adults")||"2";
    const children=params.get("children")||"0";
    const childAges=params.getAll("childrenAge");
    const ar=(document.documentElement.lang||"").toLowerCase().startsWith("ar")||document.documentElement.dir==="rtl";

    function existingSlugs(){
      const output=new Set<string>();
      document.querySelectorAll<HTMLAnchorElement>(".searchResultList a[href*='/hotel/nuitee-']").forEach((anchor)=>{
        const match=anchor.getAttribute("href")?.match(/\/hotel\/(nuitee-[^?/#]+)/);if(match?.[1])output.add(match[1]);
      });
      state.current.loaded.forEach((_,slug)=>output.add(slug));
      return output;
    }

    function href(hotel:Hotel){
      const q=new URLSearchParams({arrival,departure,adults,children});childAges.forEach((age)=>q.append("childrenAge",age));
      return `/hotel/${encodeURIComponent(hotel.slug)}?${q.toString()}`;
    }

    function card(hotel:Hotel){
      const article=document.createElement("article");article.className="premiumResultCard";article.dataset.infiniteStoredHotel=hotel.slug;
      const url=href(hotel);const location=[hotel.area,hotel.city].filter(Boolean).join(", ");const rating=hotel.reviewSummary.overall&&hotel.reviewSummary.overall>0?`<div class="resultRating"><strong>${hotel.reviewSummary.overall.toFixed(1)}</strong><span>${hotel.reviewSummary.count} ${ar?"تقييم":"reviews"}</span></div>`:"";
      article.innerHTML=`<a class="premiumResultMedia" href="${esc(url)}">${hotel.coverPhoto?`<img src="${esc(hotel.coverPhoto.url)}" alt="${esc(hotel.coverPhoto.alt||hotel.name)}" loading="lazy" decoding="async">`:`<div class="stayCardPlaceholder">${ar?"الصورة قيد التحديث":"Photo pending"}</div>`}<span class="verifiedPill">${ar?"متاح للحجز":"Bookable"}</span></a><div class="premiumResultContent"><div class="premiumResultMain"><div class="stayCardMeta">${hotel.starRating?`${hotel.starRating}★ · `:""}${esc(location)}</div><a href="${esc(url)}"><h2>${esc(hotel.name)}</h2></a>${rating}<div class="resultPolicy"><strong>${ar?"تحقق من السعر المباشر":"Check live price"}</strong><span>${ar?"التوفر والسعر يظهران عند فتح الفندق":"Availability and live price appear when you open the hotel"}</span></div></div><div class="premiumResultPrice"><span>${ar?"فندق إضافي في نفس الوجهة":"More hotels in this destination"}</span><strong>${ar?"السعر المباشر عند الفتح":"Live price on open"}</strong><a class="resultCta" href="${esc(url)}">${ar?"عرض الغرف":"See rooms"}</a></div></div>`;
      return article;
    }

    function renderLoaded(){
      const current=document.querySelector<HTMLElement>(".searchResultList");if(!current)return;
      list=current;
      const present=existingSlugs();
      state.current.loaded.forEach((hotel)=>{if(!current.querySelector(`[data-infinite-stored-hotel="${cssEscape(hotel.slug)}"]`)&&!present.has(hotel.slug))current.appendChild(card(hotel));});
      if(sentinel&&sentinel.parentElement!==current.parentElement)current.parentElement?.appendChild(sentinel);
    }

    async function load(){
      if(state.current.loading||state.current.done)return;
      const current=document.querySelector<HTMLElement>(".searchResultList");if(!current)return;
      state.current.loading=true;if(sentinel)sentinel.textContent=ar?"جاري تحميل فنادق إضافية…":"Loading more hotels…";
      try{
        const q=new URLSearchParams({destination,country:"JO",offset:String(state.current.offset),limit:"20"});
        const response=await fetch(`/api/v1/search/stored-hotels?${q.toString()}`,{cache:"no-store"});if(!response.ok)throw new Error(String(response.status));
        const page=await response.json() as Page;const seen=existingSlugs();
        page.hotels.forEach((hotel)=>{if(!seen.has(hotel.slug))state.current.loaded.set(hotel.slug,hotel);});
        state.current.offset=page.nextOffset??state.current.offset+page.hotels.length;state.current.done=page.nextOffset===null;renderLoaded();
        if(state.current.done&&sentinel)sentinel.textContent=ar?"تم عرض كل الفنادق المحفوظة لهذه الوجهة":"All stored hotels for this destination are shown";
      }catch(error){console.error("Infinite hotel loading failed",error);if(sentinel)sentinel.textContent="";}finally{state.current.loading=false;}
    }

    function attach(){
      const current=document.querySelector<HTMLElement>(".searchResultList");if(!current)return false;list=current;
      if(!sentinel){sentinel=document.createElement("div");sentinel.className="searchInfiniteSentinel";sentinel.style.cssText="min-height:76px;display:grid;place-items:center;opacity:.7;font-size:13px";current.parentElement?.appendChild(sentinel);observer=new IntersectionObserver((entries)=>{if(entries.some((entry)=>entry.isIntersecting))void load();},{rootMargin:"1000px 0px"});observer.observe(sentinel);}renderLoaded();return true;
    }

    timer=window.setInterval(()=>{attach();},500);
    mutation=new MutationObserver(()=>{if(list&&!document.contains(list)){list=null;window.setTimeout(()=>attach(),50);}else renderLoaded();});mutation.observe(document.body,{childList:true,subtree:true});
    attach();
    return()=>{if(timer)window.clearInterval(timer);observer?.disconnect();mutation?.disconnect();sentinel?.remove();};
  },[key,params]);
  return null;
}

function esc(value:string){return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]||char));}
function cssEscape(value:string){return typeof CSS!=="undefined"&&CSS.escape?CSS.escape(value):value.replace(/[^a-zA-Z0-9_-]/g,"\\$&");}
