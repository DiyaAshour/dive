"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, CarFront, LoaderCircle, Rotate3D, Search, X } from "lucide-react";
import styles from "./car-catalog-picker.module.css";

type CatalogVehicle = {
  id:string;
  make:string;
  model:string;
  year:number;
  generation:string|null;
  trim:string|null;
  bodyType:string|null;
  category:string;
  transmission:"AUTOMATIC"|"MANUAL"|null;
  fuel:"PETROL"|"DIESEL"|"HYBRID"|"ELECTRIC"|null;
  seats:number|null;
  bags:number|null;
  doors:number|null;
  provider:string;
  primaryImageUrl:string|null;
  exterior360Available:boolean;
  interior360Available:boolean;
};

type Props = Readonly<{locale:"ar"|"en"}>;

export function CarCatalogPicker({locale}:Props){
  const ar=locale==="ar";
  const rootRef=useRef<HTMLDivElement|null>(null);
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<CatalogVehicle[]>([]);
  const [selected,setSelected]=useState<CatalogVehicle|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const copy=ar?{
    eyebrow:"مكتبة سيارات HandMeKey",title:"اختر السيارة الدقيقة",body:"ابحث بالماركة أو الموديل أو النسخة. عند اختيار سيارة نربطها بمكتبة الصور والـ 360° بدل رفع صورة عشوائية لكل شركة.",placeholder:"مثال: BMW 330i أو Toyota Corolla",searching:"جارٍ البحث...",empty:"لا توجد نتيجة مطابقة في المكتبة حاليًا.",manual:"أدخل البيانات يدويًا",selected:"تم ربط السيارة بالمكتبة",visuals:"صور قياسية",spin:"360°",interior:"داخلية 360°",pending:"الصور القياسية قيد التجهيز",clear:"إلغاء الربط"
  }:{
    eyebrow:"HandMeKey vehicle library",title:"Choose the exact vehicle",body:"Search by make, model or trim. Selecting a match links the fleet car to the standardized image and 360° library instead of using random supplier artwork.",placeholder:"e.g. BMW 330i or Toyota Corolla",searching:"Searching...",empty:"No matching catalog vehicle yet.",manual:"Enter details manually",selected:"Linked to vehicle library",visuals:"Standard visuals",spin:"360°",interior:"Interior 360°",pending:"Standard visuals pending",clear:"Clear catalog match"
  };

  useEffect(()=>{
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError("");
      try{
        const response=await fetch(`/api/v1/cars/catalog?q=${encodeURIComponent(query)}&limit=36`,{signal:controller.signal});
        const result=await response.json();
        if(!response.ok)throw new Error(result?.error?.message||"Catalog request failed");
        setResults(Array.isArray(result?.data)?result.data:[]);
      }catch(value){if((value as Error)?.name!=="AbortError")setError(value instanceof Error?value.message:"Catalog request failed");}
      finally{setLoading(false);}
    },query?220:0);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[query]);

  function choose(vehicle:CatalogVehicle){
    setSelected(vehicle);
    const form=rootRef.current?.closest("form");
    if(!form)return;
    setField(form,"make",vehicle.make);
    setField(form,"model",[vehicle.model,vehicle.trim].filter(Boolean).join(" "));
    setField(form,"year",String(vehicle.year));
    setField(form,"category",vehicle.category);
    if(vehicle.transmission)setField(form,"transmission",vehicle.transmission);
    if(vehicle.fuel)setField(form,"fuel",vehicle.fuel);
    if(vehicle.seats!==null)setField(form,"seats",String(vehicle.seats));
    if(vehicle.bags!==null)setField(form,"bags",String(vehicle.bags));
  }

  return <div ref={rootRef} className={styles.catalogBox}>
    <input type="hidden" name="catalogVehicleId" value={selected?.id??""}/>
    <div className={styles.heading}>
      <div><span>{copy.eyebrow}</span><h3>{copy.title}</h3><p>{copy.body}</p></div>
      {selected?<button type="button" className={styles.clear} onClick={()=>setSelected(null)}><X size={14}/>{copy.clear}</button>:null}
    </div>

    {selected?<div className={styles.selectedCard}>
      <div className={styles.vehicleMedia}>{selected.primaryImageUrl?<img src={selected.primaryImageUrl} alt={`${selected.make} ${selected.model}`}/>:<CarFront size={35}/>}</div>
      <div className={styles.vehicleCopy}><span className={styles.linked}><BadgeCheck size={13}/>{copy.selected}</span><strong>{selected.make} {selected.model}{selected.trim?` ${selected.trim}`:""}</strong><small>{selected.year}{selected.bodyType?` · ${selected.bodyType}`:""}{selected.generation?` · ${selected.generation}`:""}</small><div className={styles.capabilities}><span>{selected.primaryImageUrl?copy.visuals:copy.pending}</span>{selected.exterior360Available?<span><Rotate3D size={12}/>{copy.spin}</span>:null}{selected.interior360Available?<span><Rotate3D size={12}/>{copy.interior}</span>:null}</div></div>
    </div>:<>
      <label className={styles.search}><Search size={17}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={copy.placeholder} autoComplete="off"/>{loading?<LoaderCircle className={styles.spin} size={16}/>:null}</label>
      {error?<div className={styles.error}>{error}</div>:null}
      <div className={styles.results}>
        {results.map((vehicle)=><button type="button" className={styles.result} key={vehicle.id} onClick={()=>choose(vehicle)}>
          <span className={styles.resultMedia}>{vehicle.primaryImageUrl?<img src={vehicle.primaryImageUrl} alt=""/>:<CarFront size={24}/>}</span>
          <span className={styles.resultCopy}><strong>{vehicle.make} {vehicle.model}{vehicle.trim?` ${vehicle.trim}`:""}</strong><small>{vehicle.year}{vehicle.bodyType?` · ${vehicle.bodyType}`:""}</small></span>
          <span className={styles.provider}>{vehicle.exterior360Available?<Rotate3D size={12}/>:null}{vehicle.provider}</span>
        </button>)}
        {!loading&&!error&&results.length===0?<div className={styles.empty}><CarFront size={23}/><span>{copy.empty}</span><small>{copy.manual}</small></div>:null}
      </div>
    </>}
  </div>;
}

function setField(form:HTMLFormElement,name:string,value:string){
  const field=form.elements.namedItem(name);
  if(field instanceof HTMLInputElement||field instanceof HTMLSelectElement){
    field.value=value;
    field.dispatchEvent(new Event("change",{bubbles:true}));
  }
}
