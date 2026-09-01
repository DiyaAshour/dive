"use client";

import { useEffect } from "react";

export function SearchStarRatingEnhancer(){
  useEffect(()=>{
    const enhance=(select:HTMLSelectElement)=>{
      if(select.dataset.starEnhanced==="true")return;
      select.dataset.starEnhanced="true";
      select.classList.add("searchStarNativeSelect");

      const label=select.closest("label");
      const labelText=label?.querySelector("span")?.textContent?.trim()||label?.childNodes[0]?.textContent?.trim()||"Star rating";
      const picker=document.createElement("div");
      picker.className="searchStarPicker";
      picker.setAttribute("role","radiogroup");
      picker.setAttribute("aria-label",labelText);

      const buttons:Array<HTMLButtonElement>=[];

      const current=()=>{
        const value=Number(select.value);
        return Number.isInteger(value)&&value>=1&&value<=5?value:0;
      };
      const paint=(visible:number,selected=current())=>{
        buttons.forEach((button,index)=>{
          const value=index+1;
          button.classList.toggle("isActive",value<=visible);
          button.setAttribute("aria-checked",String(selected===value));
        });
      };
      const choose=(value:number)=>{
        const next=current()===value?0:value;
        select.value=next?String(next):"";
        select.dispatchEvent(new Event("input",{bubbles:true}));
        select.dispatchEvent(new Event("change",{bubbles:true}));
        paint(next,next);
      };

      for(let value=1;value<=5;value++){
        const button=document.createElement("button");
        button.type="button";
        button.className="searchStarPickerButton";
        button.setAttribute("role","radio");
        button.setAttribute("aria-label",`${value} ${labelText}`);
        button.textContent="★";
        button.addEventListener("click",()=>choose(value));
        button.addEventListener("mouseenter",()=>paint(value,current()));
        button.addEventListener("focus",()=>paint(value,current()));
        button.addEventListener("blur",()=>paint(current(),current()));
        button.addEventListener("keydown",(event)=>{
          if(event.key!=="ArrowRight"&&event.key!=="ArrowLeft")return;
          event.preventDefault();
          const direction=event.key==="ArrowRight"?1:-1;
          const next=Math.min(5,Math.max(1,value+direction));
          buttons[next-1]?.focus();
        });
        buttons.push(button);
        picker.appendChild(button);
      }

      picker.addEventListener("mouseleave",()=>paint(current(),current()));
      select.insertAdjacentElement("afterend",picker);
      paint(current(),current());
    };

    const enhanceAll=()=>document.querySelectorAll<HTMLSelectElement>('select[name="stars"]').forEach(enhance);
    enhanceAll();
    const observer=new MutationObserver(enhanceAll);
    observer.observe(document.body,{childList:true,subtree:true});
    return ()=>observer.disconnect();
  },[]);

  return <style>{`
    .searchStarNativeSelect{display:none!important}
    .searchStarPicker{display:grid;grid-template-columns:repeat(5,1fr);align-items:center;gap:2px;width:100%;height:40px;min-height:40px;padding:3px 6px;border:1px solid #d3dde6;border-radius:11px;background:#fff;box-shadow:0 1px 2px rgba(18,45,68,.035);overflow:hidden}
    .searchStarPickerButton{width:100%;height:32px;min-width:0;border:0;border-radius:7px;background:transparent;color:#aab5bf;font-size:18px;line-height:1;display:grid;place-items:center;cursor:pointer;transition:color .14s ease,background .14s ease,transform .14s ease}
    .searchStarPickerButton.isActive{color:#d49a16;background:#fff7df}
    .searchStarPickerButton:hover{background:#f4f7f9;color:#7f8f9d;transform:translateY(-1px)}
    .searchStarPickerButton.isActive:hover{background:#fff1c8;color:#c58b0b}
    .searchStarPickerButton:focus-visible{outline:2px solid rgba(23,112,207,.22);outline-offset:-2px}
    .mobileSearchSheet .searchStarPicker{height:42px;min-height:42px;padding:4px 6px;border-radius:11px}.mobileSearchSheet .searchStarPickerButton{height:32px;font-size:19px}
    @media(max-width:390px){.searchStarPicker{gap:1px;padding-inline:5px}.searchStarPickerButton{font-size:17px}}
  `}</style>;
}
