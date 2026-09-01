"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Minus, Plus, Users } from "lucide-react";
import styles from "./stay-guest-picker.module.css";

type GuestKey = "adults" | "children" | "infants" | "pets";
type GuestCounts = Record<GuestKey, number>;

type Props = Readonly<{
  locale: "ar" | "en";
  adults: number;
  children: number;
  infants?: number;
  pets?: number;
  label?: string;
  className?: string;
}>;

export function StayGuestPicker({locale,adults,children,infants=0,pets=0,label,className=""}:Props){
  const [open,setOpen]=useState(false);
  const [counts,setCounts]=useState<GuestCounts>({adults,children,infants,pets});
  const rootRef=useRef<HTMLDivElement>(null);
  const copy=locale==="ar"?{
    label:label??"الضيوف",
    adults:"البالغون",adultHint:"13 سنة فأكثر",
    children:"الأطفال",childHint:"من 2 إلى 12 سنة",
    infants:"الرضّع",infantHint:"أقل من سنتين",
    pets:"الحيوانات الأليفة",petHint:"طلب حيوان أليف؛ سياسة الفندق تُراجع قبل الحجز",
    guest:"ضيف",guests:"ضيوف",infant:"رضيع",infants:"رضّع",pet:"حيوان أليف",pets:"حيوانات أليفة",
    decrease:"إنقاص",increase:"زيادة",
  }:{
    label:label??"Guests",
    adults:"Adults",adultHint:"Ages 13 or above",
    children:"Children",childHint:"Ages 2–12",
    infants:"Infants",infantHint:"Under 2",
    pets:"Pets",petHint:"Pet request; property policy is checked before booking",
    guest:"guest",guests:"guests",infant:"infant",infants:"infants",pet:"pet",pets:"pets",
    decrease:"Decrease",increase:"Increase",
  };
  const rows=[
    {key:"adults" as const,title:copy.adults,hint:copy.adultHint,min:1,max:20},
    {key:"children" as const,title:copy.children,hint:copy.childHint,min:0,max:20},
    {key:"infants" as const,title:copy.infants,hint:copy.infantHint,min:0,max:5},
    {key:"pets" as const,title:copy.pets,hint:copy.petHint,min:0,max:5},
  ];

  useEffect(()=>{
    const onPointer=(event:MouseEvent)=>{if(!rootRef.current?.contains(event.target as Node))setOpen(false);};
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("mousedown",onPointer);
    document.addEventListener("keydown",onKey);
    return()=>{document.removeEventListener("mousedown",onPointer);document.removeEventListener("keydown",onKey);};
  },[]);

  const primary=counts.adults+counts.children;
  const summary=[
    `${primary} ${primary===1?copy.guest:copy.guests}`,
    counts.infants?`${counts.infants} ${counts.infants===1?copy.infant:copy.infants}`:null,
    counts.pets?`${counts.pets} ${counts.pets===1?copy.pet:copy.pets}`:null,
  ].filter(Boolean).join(" · ");

  function change(key:GuestKey,delta:number,min:number,max:number){
    setCounts((current)=>({...current,[key]:Math.min(max,Math.max(min,current[key]+delta))}));
  }

  return <div ref={rootRef} className={`${styles.root} ${className}`}>
    <button type="button" className={`${styles.trigger} ${open?styles.active:""}`} onClick={()=>setOpen((value)=>!value)} aria-expanded={open} aria-haspopup="dialog">
      <span className={styles.label}><Users size={14}/>{copy.label}</span>
      <strong>{summary}</strong>
      <ChevronDown size={16} className={styles.chevron}/>
    </button>
    <input type="hidden" name="adults" value={counts.adults}/>
    <input type="hidden" name="children" value={counts.children}/>
    <input type="hidden" name="infants" value={counts.infants}/>
    <input type="hidden" name="pets" value={counts.pets}/>
    {open&&<div className={styles.panel} role="dialog" aria-label={copy.label}>
      {rows.map((row)=><div className={styles.row} key={row.key}>
        <div className={styles.copy}><strong>{row.title}</strong><span>{row.hint}</span></div>
        <div className={styles.counter}>
          <button type="button" disabled={counts[row.key]<=row.min} aria-label={`${copy.decrease} ${row.title}`} onClick={()=>change(row.key,-1,row.min,row.max)}><Minus size={16}/></button>
          <span aria-live="polite">{counts[row.key]}</span>
          <button type="button" disabled={counts[row.key]>=row.max} aria-label={`${copy.increase} ${row.title}`} onClick={()=>change(row.key,1,row.min,row.max)}><Plus size={16}/></button>
        </div>
      </div>)}
    </div>}
  </div>;
}
