"use client";

import {useEffect} from "react";

export function SeoArticleTracker({locale,slug}:{locale:"en"|"ar";slug:string}){
  useEffect(()=>{
    const send=(event:string,target?:string)=>{
      void fetch("/api/v1/analytics/seo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event,locale,slug,target}),keepalive:true}).catch(()=>{});
    };
    send("BLOG_VIEW",location.pathname);
    const onClick=(e:MouseEvent)=>{
      const anchor=(e.target as Element|null)?.closest?.("a");
      if(!anchor)return;
      const href=anchor.getAttribute("href")||"";
      if(href==="/search"||href.startsWith("/search?"))send("BLOG_TO_SEARCH",href);
      if(href==="/cars"||href.startsWith("/cars?"))send("BLOG_TO_CARS",href);
    };
    document.addEventListener("click",onClick,{capture:true});
    return()=>document.removeEventListener("click",onClick,{capture:true});
  },[locale,slug]);
  return null;
}
