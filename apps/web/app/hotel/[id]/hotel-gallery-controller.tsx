"use client";

import { useEffect, useMemo, useState } from "react";
import { Bath, BedDouble, Building2, ChevronLeft, ChevronRight, Coffee, Dumbbell, Eye, Images, Landmark, Sparkles, Utensils, Waves, Wine, X } from "lucide-react";
import type { HotelPhotoCategory } from "@platform/contracts";

type GalleryPhoto = {id:string;url:string;alt:string|null;sortOrder:number;roomTypeId:string|null;category:HotelPhotoCategory};
type CategoryDefinition={value:HotelPhotoCategory;ar:string;en:string;icon:typeof Images};

const CATEGORIES:CategoryDefinition[]=[
  {value:"EXTERIOR",ar:"الواجهة",en:"Exterior",icon:Building2},
  {value:"ROOM",ar:"الغرف",en:"Rooms",icon:BedDouble},
  {value:"BATHROOM",ar:"الحمامات",en:"Bathrooms",icon:Bath},
  {value:"LOBBY",ar:"البهو",en:"Lobby",icon:Landmark},
  {value:"RECEPTION",ar:"الاستقبال",en:"Reception",icon:Sparkles},
  {value:"RESTAURANT",ar:"المطاعم",en:"Restaurants",icon:Utensils},
  {value:"BAR",ar:"البار",en:"Bar",icon:Wine},
  {value:"BREAKFAST",ar:"الإفطار",en:"Breakfast",icon:Coffee},
  {value:"POOL",ar:"المسبح",en:"Pool",icon:Waves},
  {value:"SPA",ar:"السبا",en:"Spa",icon:Sparkles},
  {value:"GYM",ar:"النادي الرياضي",en:"Gym",icon:Dumbbell},
  {value:"VIEW",ar:"الإطلالات",en:"Views",icon:Eye},
  {value:"FACILITIES",ar:"المرافق",en:"Facilities",icon:Images},
  {value:"OTHER",ar:"أخرى",en:"Other",icon:Images},
];

export function HotelGalleryController({photos,hotelName,locale}:{photos:GalleryPhoto[];hotelName:string;locale:string}) {
  const ar=locale==="ar";
  const [open,setOpen]=useState(false);
  const [filter,setFilter]=useState<HotelPhotoCategory|"ALL">("ALL");
  const [selectedId,setSelectedId]=useState<string|null>(photos[0]?.id??null);
  const filtered=useMemo(()=>filter==="ALL"?photos:photos.filter((photo)=>photo.category===filter),[photos,filter]);
  const selectedIndex=Math.max(0,filtered.findIndex((photo)=>photo.id===selectedId));
  const selected=filtered[selectedIndex]??filtered[0]??null;
  const presentCategories=useMemo(()=>CATEGORIES.filter((category)=>photos.some((photo)=>photo.category===category.value)),[photos]);

  useEffect(()=>{
    if(!photos.length)return;

    const premiumImages=Array.from(document.querySelectorAll<HTMLImageElement>(".premiumGallery img"));
    const roomImages=Array.from(document.querySelectorAll<HTMLImageElement>(".publicRoomMedia img"));
    const bindings:Array<{image:HTMLImageElement;photo:GalleryPhoto;onClick:()=>void;onKeyDown:(event:KeyboardEvent)=>void}>=[];

    function matchingPhoto(image:HTMLImageElement,fallback?:GalleryPhoto){
      const rawSrc=image.getAttribute("src");
      return photos.find((photo)=>photo.url===rawSrc||photo.url===image.currentSrc||photo.url===image.src)??fallback;
    }

    function bind(image:HTMLImageElement,photo:GalleryPhoto){
      image.setAttribute("role","button");
      image.setAttribute("tabindex","0");
      image.setAttribute("aria-label",ar?`فتح معرض صور ${hotelName}`:`Open ${hotelName} photo gallery`);
      const activate=()=>{
        setFilter("ALL");
        setSelectedId(photo.id);
        setOpen(true);
      };
      const onClick=()=>activate();
      const onKeyDown=(event:KeyboardEvent)=>{
        if(!(["Enter"," "].includes(event.key)))return;
        event.preventDefault();
        activate();
      };
      image.addEventListener("click",onClick);
      image.addEventListener("keydown",onKeyDown);
      bindings.push({image,photo,onClick,onKeyDown});
    }

    premiumImages.forEach((image,index)=>{
      const photo=matchingPhoto(image,photos[index]);
      if(photo)bind(image,photo);
    });
    roomImages.forEach((image)=>{
      const photo=matchingPhoto(image);
      if(photo)bind(image,photo);
    });

    return()=>{
      bindings.forEach(({image,onClick,onKeyDown})=>{
        image.removeEventListener("click",onClick);
        image.removeEventListener("keydown",onKeyDown);
      });
    };
  },[photos,hotelName,ar]);

  useEffect(()=>{
    if(!open)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setOpen(false);
      if(event.key==="ArrowLeft")move(-1);
      if(event.key==="ArrowRight")move(1);
    };
    window.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener("keydown",onKey);};
  });

  useEffect(()=>{
    if(filtered.length&&!filtered.some((photo)=>photo.id===selectedId))setSelectedId(filtered[0]!.id);
  },[filter,filtered,selectedId]);

  function move(step:number){
    if(!filtered.length)return;
    const current=Math.max(0,filtered.findIndex((photo)=>photo.id===selectedId));
    setSelectedId(filtered[(current+step+filtered.length)%filtered.length]!.id);
  }

  if(!photos.length||!open||!selected)return null;

  return <div className="hotelGalleryLightbox" role="dialog" aria-modal="true" aria-label={ar?`معرض صور ${hotelName}`:`${hotelName} photo gallery`}>
    <div className="hotelGalleryTopbar">
      <div><strong>{hotelName}</strong><span>{ar?`${photos.length} صورة`:`${photos.length} photos`}</span></div>
      <button type="button" onClick={()=>setOpen(false)} aria-label={ar?"إغلاق المعرض":"Close gallery"}><X size={22}/></button>
    </div>
    <div className="hotelGalleryCategories">
      <button type="button" className={filter==="ALL"?"active":""} onClick={()=>setFilter("ALL")}><Images size={15}/>{ar?"كل الصور":"All photos"}<b>{photos.length}</b></button>
      {presentCategories.map((category)=>{const Icon=category.icon;const count=photos.filter((photo)=>photo.category===category.value).length;return <button type="button" className={filter===category.value?"active":""} onClick={()=>setFilter(category.value)} key={category.value}><Icon size={15}/>{ar?category.ar:category.en}<b>{count}</b></button>})}
    </div>
    <div className="hotelGalleryStage">
      {filtered.length>1&&<button className="hotelGalleryArrow prev" type="button" onClick={()=>move(-1)} aria-label={ar?"الصورة السابقة":"Previous photo"}><ChevronLeft size={27}/></button>}
      <div className="hotelGalleryMain"><img src={selected.url} alt={selected.alt??hotelName}/></div>
      {filtered.length>1&&<button className="hotelGalleryArrow next" type="button" onClick={()=>move(1)} aria-label={ar?"الصورة التالية":"Next photo"}><ChevronRight size={27}/></button>}
    </div>
    <div className="hotelGalleryCaption"><div><strong>{selected.alt??categoryLabel(selected.category,ar)}</strong><span>{categoryLabel(selected.category,ar)}</span></div><b>{selectedIndex+1} / {filtered.length}</b></div>
    <div className="hotelGalleryThumbs">{filtered.map((photo,index)=><button type="button" className={photo.id===selected.id?"active":""} key={photo.id} onClick={()=>setSelectedId(photo.id)} aria-label={`${index+1}`}><img src={photo.url} alt=""/></button>)}</div>
  </div>;
}

function categoryLabel(value:HotelPhotoCategory,ar:boolean){const category=CATEGORIES.find((entry)=>entry.value===value);return category?(ar?category.ar:category.en):(ar?"صور الفندق":"Property photos");}
