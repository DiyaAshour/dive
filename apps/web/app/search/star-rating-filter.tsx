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
      const valueLabel=document.createElement("span");
      valueLabel.className="searchStarPickerValue";

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
        valueLabel.textContent=selected?`${selected} ★`:"—";
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
      picker.appendChild(valueLabel);
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
    .searchStarPicker{display:flex;align-items:center;gap:5px;width:100%;min-height:48px;padding:7px 8px;border:1px solid #d3dde6;border-radius:13px;background:linear-gradient(180deg,#fff 0%,#f8fbfd 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
    .searchStarPickerButton{width:38px;height:34px;flex:0 0 38px;border:0;border-radius:9px;background:transparent;color:#a9b4be;font-size:23px;line-height:1;display:grid;place-items:center;cursor:pointer;transition:color .14s ease,background .14s ease,transform .14s ease}
    .searchStarPickerButton.isActive{color:#d49a16;background:#fff6d9}
    .searchStarPickerButton:hover{background:#f1f5f8;transform:translateY(-1px)}
    .searchStarPickerButton.isActive:hover{background:#fff1c4}
    .searchStarPickerButton:focus-visible{outline:3px solid rgba(23,112,207,.2);outline-offset:2px}
    .searchStarPickerValue{min-width:45px;margin-inline-start:auto;padding-inline-start:8px;border-inline-start:1px solid #dfe7ed;text-align:center;color:#344f66;font-size:11px;font-weight:900;white-space:nowrap}
    .mobileSearchSheet .searchStarPicker{min-height:52px;border-radius:14px}.mobileSearchSheet .searchStarPickerButton{height:38px;width:40px;flex-basis:40px;font-size:24px}
    @media(max-width:390px){.searchStarPicker{gap:3px;padding:7px 6px}.searchStarPickerButton{width:35px;flex-basis:35px}.searchStarPickerValue{min-width:38px;padding-inline-start:4px}}
  `}</style>;
}
