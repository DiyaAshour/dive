"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Props={
  initialValue?:string|null;
  label:string;
  clearLabel:string;
  name?:string;
  compact?:boolean;
};

export function StarRatingFilter({initialValue,label,clearLabel,name="stars",compact=false}:Props){
  const parsed=Number(initialValue??"");
  const initial=Number.isInteger(parsed)&&parsed>=1&&parsed<=5?parsed:0;
  const [selected,setSelected]=useState(initial);
  const [preview,setPreview]=useState(0);
  const visible=preview||selected;

  return <div className={`starRatingFilter${compact?" isCompact":""}`}>
    <style>{`
      .starRatingFilter{display:grid;gap:8px;min-width:0}
      .starRatingFilterLabel{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:850;color:#435a70}
      .starRatingFilterClear{border:0;background:transparent;color:#637a90;padding:0;font-size:10px;font-weight:800;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
      .starRatingFilterClear:hover{color:#0d5fa7}
      .starRatingPicker{display:flex;align-items:center;gap:6px;min-height:48px;padding:7px 9px;border:1px solid #d4dee7;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fbfd);box-shadow:inset 0 1px 0 rgba(255,255,255,.85)}
      .starRatingButton{width:42px;height:34px;border:0;border-radius:9px;background:transparent;display:grid;place-items:center;color:#a8b4bf;cursor:pointer;transition:background .15s ease,color .15s ease,transform .15s ease}
      .starRatingButton svg{fill:transparent;transition:fill .15s ease,stroke .15s ease,transform .15s ease}
      .starRatingButton.isActive{color:#d79a11;background:#fff8df}
      .starRatingButton.isActive svg{fill:currentColor}
      .starRatingButton:hover{background:#f2f6fa;transform:translateY(-1px)}
      .starRatingButton:focus-visible{outline:3px solid rgba(23,112,207,.22);outline-offset:2px}
      .starRatingFilterValue{min-width:46px;margin-inline-start:auto;padding-inline-start:8px;border-inline-start:1px solid #e0e7ed;text-align:center;color:#314d65;font-size:11px;font-weight:900;white-space:nowrap}
      .starRatingFilter.isCompact .starRatingPicker{min-height:50px}.starRatingFilter.isCompact .starRatingButton{width:40px;height:36px}
      @media(max-width:420px){.starRatingPicker{gap:4px;padding:7px}.starRatingButton{width:38px}.starRatingFilterValue{min-width:40px;padding-inline-start:5px}}
    `}</style>
    <div className="starRatingFilterLabel"><span>{label}</span>{selected>0&&<button type="button" className="starRatingFilterClear" onClick={()=>{setSelected(0);setPreview(0);}}>{clearLabel}</button>}</div>
    <input type="hidden" name={name} value={selected||""}/>
    <div className="starRatingPicker" role="radiogroup" aria-label={label} onMouseLeave={()=>setPreview(0)}>
      {[1,2,3,4,5].map((value)=><button key={value} type="button" className={`starRatingButton ${value<=visible?"isActive":""}`} role="radio" aria-checked={selected===value} aria-label={`${value} ${label}`} onMouseEnter={()=>setPreview(value)} onFocus={()=>setPreview(value)} onBlur={()=>setPreview(0)} onClick={()=>{setSelected((current)=>current===value?0:value);setPreview(0);}}><Star size={21} strokeWidth={1.9}/></button>)}
      <span className="starRatingFilterValue">{selected?`${selected} ★`:"—"}</span>
    </div>
  </div>;
}
