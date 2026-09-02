"use client";

import {useEffect, useState} from "react";
import {Check, ChevronDown, X} from "lucide-react";
import styles from "./car-brand-filter.module.css";

type Props = Readonly<{
  value:string;
  onChange:(value:string)=>void;
  empty:string;
  brands:string[];
  closeLabel:string;
}>;

const SIMPLE_ICON_SLUGS:Record<string,string>={
  Toyota:"toyota",Hyundai:"hyundai",Kia:"kia",Nissan:"nissan",Honda:"honda",Mazda:"mazda",Mitsubishi:"mitsubishi",Suzuki:"suzuki",
  Ford:"ford",Chevrolet:"chevrolet",GMC:"gmc",Jeep:"jeep",Dodge:"dodge",Chrysler:"chrysler",
  Volkswagen:"volkswagen",Skoda:"skoda",SEAT:"seat",Peugeot:"peugeot",Renault:"renault",Citroen:"citroen",Opel:"opel",Fiat:"fiat",
  BMW:"bmw","Mercedes-Benz":"mercedesbenz",Audi:"audi",Lexus:"lexus",Volvo:"volvo","Land Rover":"landrover",Porsche:"porsche",
  Tesla:"tesla",BYD:"byd",MG:"mg",Geely:"geely",Changan:"changan",Chery:"chery",Haval:"haval",Dongfeng:"dongfeng",Zeekr:"zeekr"
};

const BRAND_DOMAINS:Record<string,string>={
  Toyota:"toyota.com",Hyundai:"hyundai.com",Kia:"kia.com",Nissan:"nissan-global.com",Honda:"honda.com",Mazda:"mazda.com",Mitsubishi:"mitsubishi-motors.com",Suzuki:"globalsuzuki.com",
  Ford:"ford.com",Chevrolet:"chevrolet.com",GMC:"gmc.com",Jeep:"jeep.com",Dodge:"dodge.com",Chrysler:"chrysler.com",
  Volkswagen:"volkswagen.com",Skoda:"skoda-auto.com",SEAT:"seat.com",Peugeot:"peugeot.com",Renault:"renault.com",Citroen:"citroen.com",Opel:"opel.com",Fiat:"fiat.com",
  BMW:"bmw.com","Mercedes-Benz":"mercedes-benz.com",Audi:"audi.com",Lexus:"lexus.com",Volvo:"volvocars.com","Land Rover":"landrover.com",Porsche:"porsche.com",
  Tesla:"tesla.com",BYD:"bydglobal.com",MG:"mgmotor.com",Geely:"global.geely.com",Changan:"globalchangan.com",Chery:"cheryinternational.com",Haval:"haval-global.com",GAC:"gacmotor.com",JAC:"jac.com.cn",Jetour:"jetourglobal.com",Dongfeng:"dongfeng-global.com","Great Wall":"gwm-global.com",Zeekr:"zeekrglobal.com",Hongqi:"hongqi-auto.com"
};

export function CarBrandFilter({value,onChange,empty,brands,closeLabel}:Props){
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("keydown",onKeyDown);
    return()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",onKeyDown);};
  },[open]);

  const choose=(next:string)=>{onChange(next);setOpen(false);};
  return <div className={styles.wrap}>
    <button type="button" className={`${styles.trigger} ${value?styles.triggerActive:""}`} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span>{value||empty}</span><ChevronDown size={16}/>
    </button>
    {open&&<div className={styles.overlay} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={empty}>
        <div className={styles.handle}/>
        <div className={styles.head}><div><strong>{empty}</strong><small>{brands.length} brands</small></div><button type="button" onClick={()=>setOpen(false)} aria-label={closeLabel}><X size={20}/></button></div>
        <div className={styles.options}>
          <button type="button" className={`${styles.allOption} ${!value?styles.active:""}`} onClick={()=>choose("")}><span>{empty}</span>{!value&&<Check size={18}/>}</button>
          <div className={styles.grid}>
            {brands.map((brand)=><button type="button" key={brand} className={`${styles.brandOption} ${value===brand?styles.active:""}`} onClick={()=>choose(brand)}>
              <BrandLogo brand={brand}/><span>{brand}</span>{value===brand&&<Check className={styles.check} size={15}/>} 
            </button>)}
          </div>
        </div>
      </section>
    </div>}
  </div>;
}

function BrandLogo({brand}:{brand:string}){
  const slug=SIMPLE_ICON_SLUGS[brand];
  const domain=BRAND_DOMAINS[brand]||`${brand.toLowerCase().replace(/[^a-z0-9]+/g,"")}.com`;
  const initial=slug?`https://cdn.simpleicons.org/${slug}`:`https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  return <span className={styles.logo} aria-hidden="true"><img src={initial} alt="" width={32} height={32} loading="lazy" decoding="async" onError={(event)=>{
    const image=event.currentTarget;
    if(image.dataset.fallback!=="1"){
      image.dataset.fallback="1";
      image.src=`https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      return;
    }
    image.style.display="none";
    const fallback=image.nextElementSibling;
    if(fallback instanceof HTMLElement)fallback.style.display="grid";
  }}/><span className={styles.fallback}>{brand.slice(0,2).toUpperCase()}</span></span>;
}
