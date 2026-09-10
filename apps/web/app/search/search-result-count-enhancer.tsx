"use client";

import {useEffect} from "react";

export function SearchResultCountEnhancer(){
  useEffect(()=>{
    const ar=document.documentElement.dir==="rtl";
    const sync=()=>{
      const list=document.querySelector<HTMLElement>(".searchResultList");
      const head=document.querySelector<HTMLElement>(".searchResultsHead>div");
      if(!list||!head)return;
      const count=list.querySelectorAll(".premiumResultCard").length;
      let note=head.querySelector<HTMLElement>("[data-search-live-count-note]");
      if(!note){
        note=document.createElement("small");
        note.dataset.searchLiveCountNote="true";
        note.className="searchLiveCountNote";
        head.appendChild(note);
      }
      const next=ar
        ?`نعرض ${count} فندقاً الآن. العدد الرئيسي يخص الفنادق التي رجعت بسعر حي لهذه التواريخ، وتُحمّل فنادق مطابقة إضافية أثناء التمرير.`
        :`Showing ${count} hotels now. The headline count reflects properties that returned a live rate for these dates; more matching hotels load as you scroll.`;
      if(note.textContent!==next)note.textContent=next;
    };
    sync();
    const target=document.querySelector(".searchResults")??document.body;
    const observer=new MutationObserver(sync);
    observer.observe(target,{subtree:true,childList:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
