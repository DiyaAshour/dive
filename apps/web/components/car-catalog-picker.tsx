"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, CarFront, LoaderCircle, Rotate3D, Search, Sparkles, X } from "lucide-react";
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
    eyebrow:"مكتبة سيارات HandMeKey",title:"اختر السيارة — والصور علينا",body:"اختر الماركة والموديل والسنة فقط. يطابق النظام السيارة تلقائيًا مع صور الاستوديو ومجسم 360° الدقيق عند الحفظ، بدون أن ترفع الشركة أي صورة.",placeholder:"مثال: BMW 5 Series أو Toyota Corolla",searching:"جارٍ البحث...",empty:"لا توجد نتيجة مطابقة في المكتبة أو قائمة سوق التأجير الأردني.",manual:"أدخل البيانات يدويًا وسيحاول النظام مطابقتها",selected:"تم اختيار السيارة الدقيقة",marketSelected:"تم اختيار الموديل",visuals:"صور استوديو جاهزة",spin:"360°",interior:"داخلية 360°",pending:"سيجهز النظام الصور تلقائيًا",market:"سوق الأردن",catalog:"نسخة دقيقة",chooseYear:"حدد السنة أدناه وسيختار النظام المجسم المطابق",clear:"إلغاء الاختيار",automatic:"اختيار آلي"
  }:{
    eyebrow:"HandMeKey vehicle library",title:"Choose the car — imagery is automatic",body:"Select the make, model and year. On save, HandMeKey automatically attaches the matching studio angles and exact 360° visual, with no supplier upload required.",placeholder:"e.g. BMW 5 Series or Toyota Corolla",searching:"Searching...",empty:"No match in the exact catalog or Jordan rental-market list.",manual:"Enter it manually and automatic matching will still run",selected:"Exact vehicle selected",marketSelected:"Model selected",visuals:"Studio visuals ready",spin:"360°",interior:"Interior 360°",pending:"Visuals will be prepared automatically",market:"Jordan fleet",catalog:"Exact vehicle",chooseYear:"Set the year below and the matching visual is selected automatically",clear:"Clear selection",automatic:"Automatic match"
  };

  useEffect(()=>{
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError("");
      try{
        const encoded=encodeURIComponent(query);
        const [catalogResponse,marketResponse]=await Promise.all([
          fetch(`/api/v1/cars/catalog?q=${encoded}&limit=24`,{signal:controller.signal}),
          fetch(`/api/v1/cars/jordan-market?q=${encoded}&limit=100`,{signal:controller.signal}),
        ]);
        const [catalogPayload,marketPayload]=await Promise.all([catalogResponse.json(),marketResponse.json()]);
        if(!catalogResponse.ok)throw new Error(catalogPayload?.error?.message||"Catalog request failed");
        if(!marketResponse.ok)throw new Error(marketPayload?.error?.message||"Jordan market request failed");
        const catalog=Array.isArray(catalogPayload?.data)?catalogPayload.data:[];
        const market=Array.isArray(marketPayload?.data?.models)?marketPayload.data.models:[];
        setCatalogResults(catalog);
        setMarketResults(market);
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
      setField(form,"trim",vehicle.trim??"");
      setField(form,"year",String(vehicle.year));
    }else{
      setField(form,"model",vehicle.model);
      setField(form,"trim","");
    }
    setField(form,"bodyType",vehicle.bodyType??"");
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
    <input type="hidden" name="trim" value={selectedCatalog?.trim??""}/>
    <input type="hidden" name="bodyType" value={selectedCatalog?.bodyType??selectedMarket?.bodyType??""}/>
    <div className={styles.heading}>
      <div><span>{copy.eyebrow}</span><h3>{copy.title}</h3><p>{copy.body}</p></div>
      {selected?<button type="button" className={styles.clear} onClick={()=>setSelected(null)}><X size={14}/>{copy.clear}</button>:null}
    </div>

    {selectedCatalog?<div className={styles.selectedCard}>
      <div className={styles.vehicleMedia}>{selectedCatalog.primaryImageUrl?<img src={selectedCatalog.primaryImageUrl} alt={`${selectedCatalog.make} ${selectedCatalog.model}`}/>:<CarFront size={35}/>}</div>
      <div className={styles.vehicleCopy}><span className={styles.linked}><BadgeCheck size={13}/>{copy.selected}</span><strong>{selectedCatalog.make} {selectedCatalog.model}{selectedCatalog.trim?` ${selectedCatalog.trim}`:""}</strong><small>{selectedCatalog.year}{selectedCatalog.bodyType?` · ${selectedCatalog.bodyType}`:""}{selectedCatalog.generation?` · ${selectedCatalog.generation}`:""}</small><div className={styles.capabilities}><span>{selectedCatalog.primaryImageUrl?copy.visuals:copy.pending}</span>{selectedCatalog.exterior360Available?<span><Rotate3D size={12}/>{copy.spin}</span>:null}{selectedCatalog.interior360Available?<span><Rotate3D size={12}/>{copy.interior}</span>:null}</div></div>
    </div>:selectedMarket?<div className={styles.selectedCard}>
      <div className={styles.vehicleMedia}><CarFront size={35}/></div>
      <div className={styles.vehicleCopy}><span className={styles.linked}><BadgeCheck size={13}/>{copy.marketSelected}</span><strong>{selectedMarket.make} {selectedMarket.model}</strong><small>{selectedMarket.bodyType} · {selectedMarket.category}</small><div className={styles.capabilities}><span><Sparkles size={12}/>{copy.automatic}</span><span>{copy.chooseYear}</span></div></div>
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
