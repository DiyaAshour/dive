"use client";

import { useMemo, useState } from "react";
import { Baby, BedDouble, Briefcase, Car, Check, Coffee, Dumbbell, MapPin, Plane, Plus, Search, Ship, Sparkles, Utensils, Users, Waves, Wifi, X } from "lucide-react";
import { HOTEL_AMENITY_CATALOG, HOTEL_AMENITY_MINIMUM, type HotelAmenityCode } from "@platform/contracts";
import type { Locale } from "@/lib/i18n";
import { hotelAmenityLabel } from "@/lib/hotel-amenity-copy";
import styles from "./amenity-picker.module.css";

type Props = {
  locale: Locale;
  selectedCodes: HotelAmenityCode[];
  onChange: (codes: HotelAmenityCode[]) => void;
  ignoredLegacyCount?: number;
};

const CATEGORY_ORDER = ["Essentials","Convenience","Food & drink","Wellness","Transport","Family","Business","Outdoors","Activities"] as const;

export default function AmenityPicker({locale,selectedCodes,onChange,ignoredLegacyCount=0}:Props){
  const ar=locale==="ar";
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const selected=new Set(selectedCodes);
  const remaining=Math.max(0,HOTEL_AMENITY_MINIMUM-selectedCodes.length);
  const ready=remaining===0;

  const filtered=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase();
    if(!term)return HOTEL_AMENITY_CATALOG;
    return HOTEL_AMENITY_CATALOG.filter((item)=>{
      const localized=hotelAmenityLabel(locale,item.code,item.name);
      return `${localized} ${item.name} ${item.category} ${item.code}`.toLocaleLowerCase().includes(term);
    });
  },[locale,query]);

  const grouped=useMemo(()=>CATEGORY_ORDER.map((category)=>({category,items:filtered.filter((item)=>item.category===category)})).filter((group)=>group.items.length),[filtered]);

  function toggle(code:HotelAmenityCode){
    if(selected.has(code))onChange(selectedCodes.filter((item)=>item!==code));
    else onChange([...selectedCodes,code]);
  }

  return <section className={styles.picker} aria-label={ar?"اختيار مرافق الفندق":"Choose hotel amenities"}>
    <div className={styles.head}>
      <div className={styles.headText}>
        <span className={styles.title}>{ar?"مرافق وخدمات الفندق":"Property facilities & services"}</span>
        <span className={styles.help}>{ar?"اختر فقط المرافق الموجودة فعليًا في الفندق. الخيارات هنا موحّدة ومربوطة مباشرة بصفحة الفندق، لذلك لا توجد أسماء عشوائية أو أكواد يكتبها الفندق.":"Choose only facilities the property actually offers. These options are standardized and feed the public hotel page directly, so hotels cannot enter random names or technical codes."}</span>
      </div>
      <div className={`${styles.status} ${ready?styles.ready:""}`}><strong>{selectedCodes.length}/{HOTEL_AMENITY_MINIMUM}</strong><span>{ready?(ar?"الحد الأدنى مكتمل":"minimum complete"):(ar?"الحد الأدنى المطلوب":"minimum required")}</span></div>
    </div>

    {selectedCodes.length>0&&<div className={styles.selectedGrid}>{selectedCodes.map((code)=>{
      const item=HOTEL_AMENITY_CATALOG.find((option)=>option.code===code);
      if(!item)return null;
      return <div className={styles.selectedCard} key={code}>
        <span className={styles.selectedIcon}>{amenityIcon(code)}</span>
        <span className={styles.selectedCopy}><strong>{hotelAmenityLabel(locale,code,item.name)}</strong><small>{categoryLabel(item.category,ar)}</small></span>
        <button className={styles.remove} type="button" onClick={()=>toggle(code)} aria-label={ar?`إزالة ${hotelAmenityLabel(locale,code,item.name)}`:`Remove ${hotelAmenityLabel(locale,code,item.name)}`}><X size={14}/></button>
      </div>;
    })}</div>}

    <div className={styles.controls}>
      <button className={styles.addButton} type="button" aria-expanded={open} onClick={()=>setOpen((value)=>!value)}><Plus size={15}/>{ar?"إضافة أو تعديل المرافق":"Add or edit facilities"}</button>
      {open&&<div className={styles.menu}>
        <div className={styles.search}><Search size={15}/><input value={query} onChange={(event)=>setQuery(event.currentTarget.value)} placeholder={ar?"ابحث عن مرفق…":"Search facilities…"} autoFocus/></div>
        <div className={styles.groups}>{grouped.length?grouped.map(({category,items})=><div className={styles.group} key={category}>
          <span className={styles.groupTitle}>{categoryLabel(category,ar)}</span>
          <div className={styles.options}>{items.map((item)=>{
            const active=selected.has(item.code);
            return <button className={`${styles.option} ${active?styles.selected:""}`} type="button" onClick={()=>toggle(item.code)} key={item.code}>
              <span className={styles.optionIcon}>{amenityIcon(item.code)}</span>
              <span className={styles.optionCopy}><strong>{hotelAmenityLabel(locale,item.code,item.name)}</strong><small>{categoryLabel(item.category,ar)}</small></span>
              {active&&<span className={styles.check}><Check size={13}/></span>}
            </button>;
          })}</div>
        </div>):<div className={styles.empty}>{ar?"لا توجد مرافق مطابقة":"No matching facilities"}</div>}</div>
      </div>}
    </div>

    <div className={`${styles.minimumNote} ${ready?styles.ready:""}`}>
      <span>{ready?(ar?"✓ تم الوصول للحد الأدنى، وكل المرافق المختارة ستظهر ضمن قسم مرافق الفندق للضيف.":"✓ Minimum reached. Every selected facility is published into the hotel amenities section for guests."):(ar?`اختر ${remaining} مرافق إضافية على الأقل حتى يصبح قسم الفندق مكتملًا ومتناسقًا.`:`Choose at least ${remaining} more facilities so the hotel section is complete and visually balanced.`)}</span>
      <strong>{ar?"الحد الأدنى: 10 مرافق":"Minimum: 10 facilities"}</strong>
    </div>
    {ignoredLegacyCount>0&&<div className={styles.minimumNote}><span>{ar?`تم تجاهل ${ignoredLegacyCount} مرافق قديمة غير موحّدة. اختر بدائل صحيحة من القائمة قبل الحفظ.`:`${ignoredLegacyCount} legacy free-text amenities were ignored. Choose standardized replacements before saving.`}</span></div>}
  </section>;
}

function categoryLabel(category:string,ar:boolean){
  if(!ar)return category;
  const labels:Record<string,string>={Essentials:"الأساسيات",Convenience:"الراحة والخدمات", "Food & drink":"الطعام والشراب",Wellness:"الصحة والعافية",Transport:"التنقل",Family:"العائلات",Business:"الأعمال",Outdoors:"المساحات الخارجية",Activities:"الأنشطة"};
  return labels[category]??category;
}

function amenityIcon(code:HotelAmenityCode){
  if(code==="WIFI")return <Wifi size={18}/>;
  if(code==="PARKING")return <Car size={18}/>;
  if(code==="BREAKFAST")return <Coffee size={18}/>;
  if(code==="RESTAURANT"||code==="ROOM_SERVICE")return <Utensils size={18}/>;
  if(code==="GYM")return <Dumbbell size={18}/>;
  if(code==="POOL"||code==="BEACH_ACCESS"||code==="WATER_SPORTS")return <Waves size={18}/>;
  if(code==="SPA")return <Sparkles size={18}/>;
  if(code==="AIRPORT_SHUTTLE"||code==="BEACH_SHUTTLE")return <Plane size={18}/>;
  if(code==="FAMILY_ROOMS")return <Users size={18}/>;
  if(code==="BUSINESS_CENTER")return <Briefcase size={18}/>;
  if(code==="PLAY_AREA")return <Baby size={18}/>;
  if(code==="MARINA")return <Ship size={18}/>;
  if(code==="ROOFTOP"||code==="TERRACE")return <MapPin size={18}/>;
  return <BedDouble size={18}/>;
}
