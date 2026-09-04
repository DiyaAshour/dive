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

type MarketVehicle = {
  key:string;
  make:string;
  model:string;
  aliases:readonly string[];
  category:string;
  bodyType:string;
  seats:number;
  bags:number;
  transmission:"AUTOMATIC"|"MANUAL";
  fuel:"PETROL"|"DIESEL"|"HYBRID"|"ELECTRIC";
  observedBy:readonly string[];
};

type Selected =
  | {kind:"catalog"; vehicle:CatalogVehicle}
  | {kind:"market"; vehicle:MarketVehicle};

type Props = Readonly<{locale:"ar"|"en"}>;

export function CarCatalogPicker({locale}:Props){
  const ar=locale==="ar";
  const rootRef=useRef<HTMLDivElement|null>(null);
  const [query,setQuery]=useState("");
  const [catalogResults,setCatalogResults]=useState<CatalogVehicle[]>([]);
  const [marketResults,setMarketResults]=useState<MarketVehicle[]>([]);
  const [selected,setSelected]=useState<Selected|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const copy=ar?{
    eyebrow:"مكتبة سيارات HandMeKey",title:"اختر السيارة الدقيقة أو موديل السوق الأردني",body:"نبحث أولًا عن نسخة دقيقة مرتبطة بالصور القياسية. إذا لم تتوفر، ستجد موديلات سيارات التأجير المرصودة في الأردن لتعبئة البيانات بسرعة ثم تحدد السنة والنسخة.",placeholder:"مثال: BMW 5 Series أو Toyota Corolla",searching:"جارٍ البحث...",empty:"لا توجد نتيجة مطابقة في المكتبة أو قائمة سوق التأجير الأردني.",manual:"أدخل البيانات يدويًا",selected:"تم ربط السيارة بالمكتبة",marketSelected:"موديل معروف في سوق التأجير الأردني",visuals:"صور قياسية",spin:"360°",interior:"داخلية 360°",pending:"الصور القياسية قيد التجهيز",market:"سوق الأردن",catalog:"Catalog",chooseYear:"حدد السنة والنسخة في الحقول أدناه",clear:"إلغاء الاختيار"
  }:{
    eyebrow:"HandMeKey vehicle library",title:"Choose an exact car or a Jordan rental-market model",body:"We look for an exact standardized visual match first. If it is not ready yet, choose from models currently observed across Jordan rental fleets, then set the year and trim below.",placeholder:"e.g. BMW 5 Series or Toyota Corolla",searching:"Searching...",empty:"No match in the exact catalog or Jordan rental-market list.",manual:"Enter details manually",selected:"Linked to vehicle library",marketSelected:"Known Jordan rental-market model",visuals:"Standard visuals",spin:"360°",interior:"Interior 360°",pending:"Standard visuals pending",market:"Jordan fleet",catalog:"Catalog",chooseYear:"Set the exact year and trim in the fields below",clear:"Clear selection"
  };

  useEffect(()=>{
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError("");
      try{
        const encoded=encodeURIComponent(query);
        const [catalogResponse,marketResponse]=await Promise.all([
          fetch(`/api/v1/cars/catalog?q=${encoded}&limit=24`,{signal:controller.signal}),
          fetch(`/api/v1/cars/jordan-market?q=${encoded}&limit=36`,{signal:controller.signal}),
        ]);
        const [catalogPayload,marketPayload]=await Promise.all([catalogResponse.json(),marketResponse.json()]);
        if(!catalogResponse.ok)throw new Error(catalogPayload?.error?.message||"Catalog request failed");
        if(!marketResponse.ok)throw new Error(marketPayload?.error?.message||"Jordan market request failed");
        const catalog=Array.isArray(catalogPayload?.data)?catalogPayload.data:[];
        const market=Array.isArray(marketPayload?.data?.models)?marketPayload.data.models:[];
        setCatalogResults(catalog);
        const exactKeys=new Set(catalog.map((vehicle:CatalogVehicle)=>modelKey(vehicle.make,vehicle.model)));
        setMarketResults(market.filter((vehicle:MarketVehicle)=>!exactKeys.has(modelKey(vehicle.make,vehicle.model))));
      }catch(value){if((value as Error)?.name!=="AbortError")setError(value instanceof Error?value.message:"Catalog request failed");}
      finally{setLoading(false);}
    },query?180:0);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[query]);

  function chooseCatalog(vehicle:CatalogVehicle){
    setSelected({kind:"catalog",vehicle});
    applyToForm(vehicle, vehicle.id);
  }

  function chooseMarket(vehicle:MarketVehicle){
    setSelected({kind:"market",vehicle});
    applyToForm(vehicle, "");
  }

  function applyToForm(vehicle:CatalogVehicle|MarketVehicle,catalogVehicleId:string){
    const form=rootRef.current?.closest("form");
    if(!form)return;
    setField(form,"catalogVehicleId",catalogVehicleId);
    setField(form,"make",vehicle.make);
    if("year" in vehicle){
      setField(form,"model",[vehicle.model,vehicle.trim].filter(Boolean).join(" "));
      setField(form,"year",String(vehicle.year));
    }else{
      setField(form,"model",vehicle.model);
    }
    setField(form,"category",vehicle.category);
    if(vehicle.transmission)setField(form,"transmission",vehicle.transmission);
    if(vehicle.fuel)setField(form,"fuel",vehicle.fuel);
    if(vehicle.seats!==null)setField(form,"seats",String(vehicle.seats));
    if(vehicle.bags!==null)setField(form,"bags",String(vehicle.bags));
  }

  const selectedCatalog=selected?.kind==="catalog"?selected.vehicle:null;
  const selectedMarket=selected?.kind==="market"?selected.vehicle:null;

  return <div ref={rootRef} className={styles.catalogBox}>
    <input type="hidden" name="catalogVehicleId" value={selectedCatalog?.id??""}/>
    <div className={styles.heading}>
      <div><span>{copy.eyebrow}</span><h3>{copy.title}</h3><p>{copy.body}</p></div>
      {selected?<button type="button" className={styles.clear} onClick={()=>setSelected(null)}><X size={14}/>{copy.clear}</button>:null}
    </div>

    {selectedCatalog?<div className={styles.selectedCard}>
      <div className={styles.vehicleMedia}>{selectedCatalog.primaryImageUrl?<img src={selectedCatalog.primaryImageUrl} alt={`${selectedCatalog.make} ${selectedCatalog.model}`}/>:<CarFront size={35}/>}</div>
      <div className={styles.vehicleCopy}><span className={styles.linked}><BadgeCheck size={13}/>{copy.selected}</span><strong>{selectedCatalog.make} {selectedCatalog.model}{selectedCatalog.trim?` ${selectedCatalog.trim}`:""}</strong><small>{selectedCatalog.year}{selectedCatalog.bodyType?` · ${selectedCatalog.bodyType}`:""}{selectedCatalog.generation?` · ${selectedCatalog.generation}`:""}</small><div className={styles.capabilities}><span>{selectedCatalog.primaryImageUrl?copy.visuals:copy.pending}</span>{selectedCatalog.exterior360Available?<span><Rotate3D size={12}/>{copy.spin}</span>:null}{selectedCatalog.interior360Available?<span><Rotate3D size={12}/>{copy.interior}</span>:null}</div></div>
    </div>:selectedMarket?<div className={styles.selectedCard}>
      <div className={styles.vehicleMedia}><CarFront size={35}/></div>
      <div className={styles.vehicleCopy}><span className={styles.linked}><BadgeCheck size={13}/>{copy.marketSelected}</span><strong>{selectedMarket.make} {selectedMarket.model}</strong><small>{selectedMarket.bodyType} · {selectedMarket.category}</small><div className={styles.capabilities}><span>{copy.market}</span><span>{copy.chooseYear}</span></div></div>
    </div>:<>
      <label className={styles.search}><Search size={17}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={copy.placeholder} autoComplete="off"/>{loading?<LoaderCircle className={styles.spin} size={16}/>:null}</label>
      {error?<div className={styles.error}>{error}</div>:null}
      <div className={styles.results}>
        {catalogResults.map((vehicle)=><button type="button" className={styles.result} key={`catalog-${vehicle.id}`} onClick={()=>chooseCatalog(vehicle)}>
          <span className={styles.resultMedia}>{vehicle.primaryImageUrl?<img src={vehicle.primaryImageUrl} alt=""/>:<CarFront size={24}/>}</span>
          <span className={styles.resultCopy}><strong>{vehicle.make} {vehicle.model}{vehicle.trim?` ${vehicle.trim}`:""}</strong><small>{vehicle.year}{vehicle.bodyType?` · ${vehicle.bodyType}`:""}</small></span>
          <span className={styles.provider}>{vehicle.exterior360Available?<Rotate3D size={12}/>:null}{copy.catalog}</span>
        </button>)}
        {marketResults.map((vehicle)=><button type="button" className={styles.result} key={`market-${vehicle.key}`} onClick={()=>chooseMarket(vehicle)}>
          <span className={styles.resultMedia}><CarFront size={24}/></span>
          <span className={styles.resultCopy}><strong>{vehicle.make} {vehicle.model}</strong><small>{vehicle.category} · {vehicle.bodyType}</small></span>
          <span className={styles.provider}>{copy.market}</span>
        </button>)}
        {!loading&&!error&&catalogResults.length===0&&marketResults.length===0?<div className={styles.empty}><CarFront size={23}/><span>{copy.empty}</span><small>{copy.manual}</small></div>:null}
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

function modelKey(make:string,model:string){
  return `${make} ${model}`.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
