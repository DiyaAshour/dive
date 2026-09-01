"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Expand, ShieldCheck, X } from "lucide-react";
import styles from "./car-gallery.module.css";

type Photo={id:string;url:string;alt:string;category:string};
type Props=Readonly<{photos:Photo[];locale:"ar"|"en";verified:boolean;vehicleName:string}>;

export function CarGallery({photos,locale,verified,vehicleName}:Props){
  const ar=locale==="ar";
  const labels=useMemo(()=>categoryLabels(ar),[ar]);
  const categories=useMemo(()=>Array.from(new Set(photos.map((photo)=>photo.category))),[photos]);
  const [filter,setFilter]=useState("ALL");
  const filtered=useMemo(()=>filter==="ALL"?photos:photos.filter((photo)=>photo.category===filter),[photos,filter]);
  const [activeId,setActiveId]=useState(photos[0]?.id??"");
  const [fullscreen,setFullscreen]=useState(false);
  const touchStart=useRef<number|null>(null);
  const activeIndex=Math.max(0,filtered.findIndex((photo)=>photo.id===activeId));
  const active=filtered[activeIndex]??filtered[0]??null;

  function chooseFilter(value:string){setFilter(value);const next=value==="ALL"?photos[0]:photos.find((photo)=>photo.category===value);setActiveId(next?.id??"");}
  function step(direction:-1|1){if(filtered.length<2)return;const current=Math.max(0,filtered.findIndex((photo)=>photo.id===activeId));const next=(current+direction+filtered.length)%filtered.length;setActiveId(filtered[next].id);}
  function onTouchEnd(event:React.TouchEvent){if(touchStart.current===null)return;const delta=event.changedTouches[0]?.clientX-touchStart.current;touchStart.current=null;if(Math.abs(delta)>45)step(delta>0?-1:1);}
  const copy=ar?{all:"كل الصور",verified:"شركة موثقة",count:"صورة",open:"عرض بالحجم الكامل",pending:"صور السيارة قيد التجهيز",pendingBody:"ستظهر الصور الحقيقية التي ترفعها شركة التأجير هنا.",close:"إغلاق معرض الصور"}:{all:"All photos",verified:"Verified company",count:"photos",open:"View fullscreen",pending:"Vehicle photos pending",pendingBody:"Real photos uploaded by the rental company will appear here.",close:"Close photo gallery"};

  return <div className={styles.gallery}>
    <div className={styles.stage} onTouchStart={(event)=>{touchStart.current=event.touches[0]?.clientX??null;}} onTouchEnd={onTouchEnd}>
      {active?<img src={active.url} alt={active.alt||vehicleName}/>:<div className={styles.empty}><Camera size={44}/><strong>{copy.pending}</strong><span>{copy.pendingBody}</span></div>}
      <div className={styles.topbar}>{verified&&<span className={styles.badge}><ShieldCheck size={13}/>{copy.verified}</span>}{active&&<span className={styles.counter}>{activeIndex+1} / {filtered.length}</span>}</div>
      {filtered.length>1&&<><button className={`${styles.navButton} ${styles.prev}`} type="button" aria-label="Previous photo" onClick={()=>step(-1)}><ChevronLeft size={20}/></button><button className={`${styles.navButton} ${styles.next}`} type="button" aria-label="Next photo" onClick={()=>step(1)}><ChevronRight size={20}/></button></>}
      {active&&<button className={styles.fullscreen} type="button" onClick={()=>setFullscreen(true)}><Expand size={14}/>{copy.open}</button>}
    </div>
    {photos.length>0&&<>
      <div className={styles.filters}><button className={filter==="ALL"?styles.active:""} type="button" onClick={()=>chooseFilter("ALL")}>{copy.all} · {photos.length}</button>{categories.map((category)=><button className={filter===category?styles.active:""} type="button" key={category} onClick={()=>chooseFilter(category)}>{labels[category]??category}</button>)}</div>
      <div className={styles.thumbs}>{filtered.map((photo)=><button className={`${styles.thumb} ${photo.id===active?.id?styles.active:""}`} key={photo.id} type="button" onClick={()=>setActiveId(photo.id)}><img src={photo.url} alt=""/><span>{labels[photo.category]??photo.category}</span></button>)}</div>
    </>}
    {fullscreen&&active&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-label={copy.open}>
      <div className={styles.overlayHead}><span>{vehicleName} · {activeIndex+1}/{filtered.length}</span><button className={styles.close} type="button" aria-label={copy.close} onClick={()=>setFullscreen(false)}><X size={20}/></button></div>
      <div className={styles.overlayStage}><img src={active.url} alt={active.alt||vehicleName}/>{filtered.length>1&&<><button className={`${styles.navButton} ${styles.prev}`} type="button" onClick={()=>step(-1)}><ChevronLeft size={22}/></button><button className={`${styles.navButton} ${styles.next}`} type="button" onClick={()=>step(1)}><ChevronRight size={22}/></button></>}</div>
      <div className={styles.overlayThumbs}>{filtered.map((photo)=><button className={photo.id===active.id?styles.active:""} key={photo.id} type="button" onClick={()=>setActiveId(photo.id)}><img src={photo.url} alt=""/></button>)}</div>
    </div>}
  </div>;
}

function categoryLabels(ar:boolean):Record<string,string>{return ar?{EXTERIOR_FRONT:"الأمام",EXTERIOR_REAR:"الخلف",EXTERIOR_LEFT:"الجانب الأيسر",EXTERIOR_RIGHT:"الجانب الأيمن",INTERIOR_DASHBOARD:"لوحة القيادة",INTERIOR_FRONT_SEATS:"المقاعد الأمامية",INTERIOR_REAR_SEATS:"المقاعد الخلفية",TRUNK:"الشنطة",INFOTAINMENT:"الشاشة",STEERING_WHEEL:"المقود",ODOMETER:"العدادات",KEYS_ACCESSORIES:"المفتاح والملحقات",OTHER:"أخرى"}:{EXTERIOR_FRONT:"Front",EXTERIOR_REAR:"Rear",EXTERIOR_LEFT:"Left side",EXTERIOR_RIGHT:"Right side",INTERIOR_DASHBOARD:"Dashboard",INTERIOR_FRONT_SEATS:"Front seats",INTERIOR_REAR_SEATS:"Rear seats",TRUNK:"Trunk",INFOTAINMENT:"Infotainment",STEERING_WHEEL:"Steering wheel",ODOMETER:"Instrument cluster",KEYS_ACCESSORIES:"Keys & accessories",OTHER:"Other"};}
