"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";
import type {GuestLocale} from "@/lib/guest-market";

export function PublicSupplierBrandGuard({locale}:{locale:GuestLocale}){
  const pathname=usePathname();
  const ar=locale==="ar";
  useEffect(()=>{
    const isPublicSupplierRoute=pathname.startsWith("/search")||pathname.startsWith("/hotel/nuitee-")||pathname.startsWith("/nuitee-hotel/")||pathname.startsWith("/nuitee-checkout")||pathname.startsWith("/nuitee-payment-return");
    if(!isPublicSupplierRoute)return;
    const replace=()=>{
      const replacements:[RegExp,string][]=[
        [/Nuitee Connect\s*·\s*Live/gi,ar?"HandMeKey · توفر مباشر":"HandMeKey · Live availability"],
        [/Nuitee Connect/gi,ar?"متاح على HandMeKey":"Bookable on HandMeKey"],
        [/Hotelbeds API/gi,ar?"متاح على HandMeKey":"Bookable on HandMeKey"],
      ];
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      const nodes:Text[]=[];
      while(walker.nextNode())nodes.push(walker.currentNode as Text);
      for(const node of nodes){
        const parent=node.parentElement;
        if(!parent||parent.closest("script,style,[data-keep-provider-name='true']"))continue;
        let next=node.data;
        for(const [pattern,value] of replacements)next=next.replace(pattern,value);
        if(next!==node.data)node.data=next;
      }
      if(pathname.startsWith("/hotel/nuitee-")||pathname.startsWith("/nuitee-hotel/")){
        for(const badge of document.querySelectorAll<HTMLElement>(".hotelBadges span,.verifiedPill")){
          const label=(badge.textContent??"").trim();
          if(label==="Verified Property"||label==="فندق موثّق"){
            const svg=badge.querySelector("svg");
            const text=document.createTextNode(ar?"متاح للحجز عبر HandMeKey":"Bookable on HandMeKey");
            badge.replaceChildren(...(svg?[svg.cloneNode(true),text]:[text]));
          }
        }
      }
      if(pathname.startsWith("/search")){
        for(const card of document.querySelectorAll<HTMLElement>(".premiumResultCard")){
          const badge=card.querySelector<HTMLElement>(".verifiedPill");
          if(!badge)continue;
          const badgeText=(badge.textContent??"").trim();
          const supplierCard=/Bookable on HandMeKey|متاح على HandMeKey/i.test(badgeText);
          if(!supplierCard)continue;
          badge.title=ar?"هذا الفندق معروض عبر مخزون حجز خارجي متصل بـ HandMeKey.":"This property is available through external booking inventory connected to HandMeKey.";
          const rating=card.querySelector<HTMLElement>(".resultRating span");
          if(rating&&!rating.dataset.reviewSourceLabeled){
            const count=(rating.textContent??"").match(/[0-9][0-9,._]*/)?.[0];
            if(count){
              rating.textContent=ar?`${count} مراجعة مقدمة من شريك التوريد`:`${count} supplier-provided reviews`;
              rating.dataset.reviewSourceLabeled="true";
              rating.title=ar?"هذه المراجعات جُمعت بواسطة شريك توريد الحجز وتعرضها HandMeKey كما وردت.":"These reviews were collected by a booking-supply partner and are displayed by HandMeKey as supplied.";
            }
          }
        }
      }
    };
    let frame=0;
    const schedule=()=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{frame=0;replace();});
    };
    replace();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);};
  },[ar,pathname]);
  return null;
}
