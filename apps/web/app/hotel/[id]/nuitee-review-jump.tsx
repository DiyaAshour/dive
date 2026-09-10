"use client";

import {useEffect} from "react";

export function NuiteeReviewJump({score,count,locale}:Readonly<{score:number|null;count:number;locale:string}>) {
  useEffect(()=>{
    const card=document.querySelector<HTMLElement>(".premiumHotelHead .hotelRatingSummary");
    if(!card)return;
    card.style.cursor="pointer";
    card.setAttribute("role","link");
    card.setAttribute("tabindex","0");
    card.setAttribute("aria-label",locale==="ar"?"الانتقال إلى تقييمات الضيوف":"Jump to guest reviews");
    const go=()=>document.getElementById("guest-reviews")?.scrollIntoView({behavior:"smooth",block:"start"});
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();go();}};
    card.addEventListener("click",go);
    card.addEventListener("keydown",onKey);
    const strong=card.querySelector("strong");
    if(strong)strong.textContent=score!==null&&score>0?score.toFixed(1):"—";
    const small=card.querySelector("small");
    if(small)small.textContent=locale==="ar"?`${count} مراجعة`:`${count} reviews`;
    return()=>{card.removeEventListener("click",go);card.removeEventListener("keydown",onKey);};
  },[score,count,locale]);
  return null;
}
