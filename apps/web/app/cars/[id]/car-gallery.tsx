"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Expand, Rotate3D, ShieldCheck, X } from "lucide-react";
import styles from "./car-gallery.module.css";

type Photo={id:string;url:string;alt:string;category:string;source?:"CATALOG"|"SUPPLIER"};
type Props=Readonly<{photos:Photo[];spinFrames?:Photo[];locale:"ar"|"en";verified:boolean;vehicleName:string}>;

export function CarGallery({photos,spinFrames=[],locale,verified,vehicleName}:Props){
  const ar=locale==="ar";
  const labels=useMemo(()=>categoryLabels(ar),[ar]);
  const categories=useMemo(()=>Array.from(new Set(photos.map((photo)=>photo.category))),[photos]);
  const [filter,setFilter]=useState("ALL");
  const [mode,setMode]=useState<"PHOTO"|"SPIN">("PHOTO");
  const filtered=useMemo(()=>filter==="ALL"?photos:photos.filter((photo)=>photo.category===filter),[photos,filter]);
  const [activeId,setActiveId]=useState(photos[0]?.id??"");
  const [fullscreen,setFullscreen]=useState(false);
  const touchStart=useRef<number|null>(null);
  const dragStart=useRef<{x:number;frame:number}|null>(null);
  const [spinIndex,setSpinIndex]=useState(0);
  const activeIndex=Math.max(0,filtered.findIndex((photo)=>photo.id===activeId));
  const active=filtered[activeIndex]??filtered[0]??null;
  const spinFrame=spinFrames[spinIndex]??spinFrames[0]??null;
  const canSpin=spinFrames.length>=8;

  function chooseFilter(value:string){setMode("PHOTO");setFilter(value);const next=value==="ALL"?photos[0]:photos.find((photo)=>photo.category===value);setActiveId(next?.id??"");}
  function step(direction:-1|1){if(filtered.length<2)return;const current=Math.max(0,filtered.findIndex((photo)=>photo.id===activeId));const nextIndex=(current+direction+filtered.length)%filtered.length;const nextPhoto=filtered[nextIndex];if(nextPhoto)setActiveId(nextPhoto.id);}
  function onTouchEnd(event:React.TouchEvent){if(mode!=="PHOTO"||touchStart.current===null)return;const end=event.changedTouches[0]?.clientX;const start=touchStart.current;touchStart.current=null;if(end===undefined)return;const delta=end-start;if(Math.abs(delta)>45)step(delta>0?-1:1);}
  function startSpin(event:React.PointerEvent){if(!canSpin)return;event.currentTarget.setPointerCapture(event.pointerId);dragStart.current={x:event.clientX,frame:spinIndex};}
  function moveSpin(event:React.PointerEvent){const start=dragStart.current;if(!start||!canSpin)return;const delta=event.clientX-start.x;const offset=Math.round(delta/8);const length=spinFrames.length;setSpinIndex(((start.frame-offset)%length+length)%length);}
  function stopSpin(){dragStart.current=null;}

  const copy=ar?{
    all:"كل الصور",verified:"شركة موثقة",open:"عرض بالحجم الكامل",pending:"صور السيارة قيد التجهيز",pendingBody:"ستظهر صور الاستوديو القياسية وصور شركة التأجير هنا عند توفرها.",close:"إغلاق معرض الصور",spin:"360° خارجي",drag:"اسحب لتدوير السيارة",catalog:"استوديو HandMeKey",supplier:"صور السيارة الفعلية"
  }:{
    all:"All photos",verified:"Verified company",open:"View fullscreen",pending:"Vehicle photos pending",pendingBody:"Standardized studio visuals and supplier photos will appear here when available.",close:"Close photo gallery",spin:"Exterior 360°",drag:"Drag to rotate the vehicle",catalog:"HandMeKey studio",supplier:"Actual vehicle photo"
  };

  return <div className={styles.gallery}>
    <div className={`${styles.stage} ${mode==="SPIN"?styles.spinStage:""}`} onTouchStart={(event)=>{if(mode==="PHOTO")touchStart.current=event.touches[0]?.clientX??null;}} onTouchEnd={onTouchEnd} onPointerDown={mode==="SPIN"?startSpin:undefined} onPointerMove={mode==="SPIN"?moveSpin:undefined} onPointerUp={mode==="SPIN"?stopSpin:undefined} onPointerCancel={mode==="SPIN"?stopSpin:undefined}>
      {mode==="SPIN"&&spinFrame?<img className={styles.catalogImage} src={spinFrame.url} alt={spinFrame.alt||vehicleName} draggable={false}/>:active?<img className={active.source==="CATALOG"?styles.catalogImage:""} src={active.url} alt={active.alt||vehicleName}/>:<div className={styles.empty}><Camera size={44}/><strong>{copy.pending}</strong><span>{copy.pendingBody}</span></div>}
      <div className={styles.topbar}>{verified&&<span className={styles.badge}><ShieldCheck size={13}/>{copy.verified}</span>}{mode==="SPIN"&&spinFrame?<span className={styles.counter}>{spinIndex+1} / {spinFrames.length}</span>:active?<span className={styles.counter}>{activeIndex+1} / {filtered.length}</span>:null}</div>
      {mode==="PHOTO"&&filtered.length>1&&<><button className={`${styles.navButton} ${styles.prev}`} type="button" aria-label="Previous photo" onClick={()=>step(-1)}><ChevronLeft size={20}/></button><button className={`${styles.navButton} ${styles.next}`} type="button" aria-label="Next photo" onClick={()=>step(1)}><ChevronRight size={20}/></>}
      {mode==="SPIN"&&spinFrame?<div className={styles.spinHint}><Rotate3D size={15}/><span>{copy.drag}</span></div>:null}
      {mode==="PHOTO"&&active&&<button className={styles.fullscreen} type="button" onClick={()=>setFullscreen(true)}><Expand size={14}/>{copy.open}</button>}
      {mode==="PHOTO"&&active?.source?<span className={styles.sourceBadge}>{active.source==="CATALOG"?copy.catalog:copy.supplier}</span>:null}
    </div>
    {(photos.length>0||canSpin)&&<>
      <div className={styles.filters}>
        {canSpin?<button className={mode==="SPIN"?styles.active:""} type="button" onClick={()=>setMode("SPIN")}><Rotate3D size={13}/>{copy.spin}</button>:null}
        {photos.length?<button className={mode==="PHOTO"&&filter==="ALL"?styles.active:""} type="button" onClick={()=>chooseFilter("ALL")}>{copy.all} · {photos.length}</button>:null}
        {categories.map((category)=><button className={mode==="PHOTO"&&filter===category?styles.active:""} type="button" key={category} onClick={()=>chooseFilter(category)}>{labels[category]??category}</button>)}
      </div>
      {mode==="PHOTO"&&photos.length>0?<div className={styles.thumbs}>{filtered.map((photo)=><button className={`${styles.thumb} ${photo.id===active?.id?styles.active:""}`} key={photo.id} type="button" onClick={()=>setActiveId(photo.id)}><img className={photo.source==="CATALOG"?styles.catalogImage:""} src={photo.url} alt=""/><span>{labels[photo.category]??photo.category}</span></button>)}</div>:null}
    </>}
    {fullscreen&&active&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-label={copy.open}>
      <div className={styles.overlayHead}><span>{vehicleName} · {activeIndex+1}/{filtered.length}</span><button className={styles.close} type="button" aria-label={copy.close} onClick={()=>setFullscreen(false)}><X size={20}/></button></div>
      <div className={styles.overlayStage}><img className={active.source==="CATALOG"?styles.catalogImage:""} src={active.url} alt={active.alt||vehicleName}/>{filtered.length>1&&<><button className={`${styles.navButton} ${styles.prev}`} type="button" onClick={()=>step(-1)}><ChevronLeft size={22}/></button><button className={`${styles.navButton} ${styles.next}`} type="button" onClick={()=>step(1)}><ChevronRight size={22}/></button></>}</div>
      <div className={styles.overlayThumbs}>{filtered.map((photo)=><button className={photo.id===active.id?styles.active:""} key={photo.id} type="button" onClick={()=>setActiveId(photo.id)}><img className={photo.source==="CATALOG"?styles.catalogImage:""} src={photo.url} alt=""/></button>)}</div>
    </div>}
  </div>;
}

function categoryLabels(ar:boolean):Record<string,string>{return ar?{
  HERO:"استوديو",EXTERIOR_FRONT:"الأمام",EXTERIOR_FRONT_LEFT:"أمام يسار",EXTERIOR_FRONT_RIGHT:"أمام يمين",EXTERIOR_SIDE_LEFT:"الجانب الأيسر",EXTERIOR_SIDE_RIGHT:"الجانب الأيمن",EXTERIOR_LEFT:"الجانب الأيسر",EXTERIOR_RIGHT:"الجانب الأيمن",EXTERIOR_REAR:"الخلف",EXTERIOR_REAR_LEFT:"خلف يسار",EXTERIOR_REAR_RIGHT:"خلف يمين",INTERIOR_DASHBOARD:"لوحة القيادة",INTERIOR_FRONT_SEATS:"المقاعد الأمامية",INTERIOR_REAR_SEATS:"المقاعد الخلفية",INTERIOR_PANORAMA:"المقصورة 360°",TRUNK:"الشنطة",INFOTAINMENT:"الشاشة",STEERING_WHEEL:"المقود",ODOMETER:"العدادات",KEYS_ACCESSORIES:"المفتاح والملحقات",OTHER:"أخرى"
}:{HERO:"Studio",EXTERIOR_FRONT:"Front",EXTERIOR_FRONT_LEFT:"Front left",EXTERIOR_FRONT_RIGHT:"Front right",EXTERIOR_SIDE_LEFT:"Left side",EXTERIOR_SIDE_RIGHT:"Right side",EXTERIOR_LEFT:"Left side",EXTERIOR_RIGHT:"Right side",EXTERIOR_REAR:"Rear",EXTERIOR_REAR_LEFT:"Rear left",EXTERIOR_REAR_RIGHT:"Rear right",INTERIOR_DASHBOARD:"Dashboard",INTERIOR_FRONT_SEATS:"Front seats",INTERIOR_REAR_SEATS:"Rear seats",INTERIOR_PANORAMA:"Interior 360°",TRUNK:"Trunk",INFOTAINMENT:"Infotainment",STEERING_WHEEL:"Steering wheel",ODOMETER:"Instrument cluster",KEYS_ACCESSORIES:"Keys & accessories",OTHER:"Other"};}
