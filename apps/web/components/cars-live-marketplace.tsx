"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, CarFront, Check, ChevronDown, Fuel, Gauge, MapPin, ShieldCheck, Users, X } from "lucide-react";
import {CarBrandFilter} from "./car-brand-filter";
import type { CarSearchValues } from "./cars-marketplace";
import styles from "./cars-live-marketplace.module.css";

export type LiveCar = Readonly<{
  id:string;
  brand:string;
  model:string;
  year:number;
  category:string;
  transmission:string;
  fuel:string;
  seats:number;
  bags:number;
  supplier:string;
  supplierRating:number;
  dailyPrice:number;
  deposit:number;
  freeCancellation:boolean;
  unlimitedMileage:boolean;
  airportPickup:boolean;
  imageUrl:string|null;
  imageAlt:string|null;
  location:string;
}>;

type Props=Readonly<{locale:"ar"|"en";initialSearch:CarSearchValues;cars:LiveCar[]}>;
type FilterOption=Readonly<{value:string;label:string}>;

const STANDARD_BRANDS = [
  "Toyota","Hyundai","Kia","Nissan","Honda","Mazda","Mitsubishi","Suzuki",
  "Ford","Chevrolet","GMC","Jeep","Dodge","Chrysler",
  "Volkswagen","Skoda","SEAT","Peugeot","Renault","Citroen","Opel","Fiat",
  "BMW","Mercedes-Benz","Audi","Lexus","Volvo","Land Rover","Porsche",
  "Tesla","BYD","MG","Geely","Changan","Chery","Haval","GAC","JAC","Jetour",
  "Dongfeng","Great Wall","Zeekr","Hongqi"
] as const;
const STANDARD_FUELS = ["Petrol","Diesel","Electric","Hybrid","Plug-in Hybrid","LPG","CNG","Hydrogen"] as const;

export function CarsLiveMarketplace({locale,initialSearch,cars}:Props){
  const ar=locale==="ar";
  const [brand,setBrand]=useState(initialSearch.brand??"");
  const [category,setCategory]=useState("");
  const [transmission,setTransmission]=useState("");
  const [fuel,setFuel]=useState("");
  const copy=ar?{
    live:"توفر حي من شركات التأجير",liveBody:"هذه السيارات تأتي من لوحة شركات التأجير في HandMeKey. السعر والشروط مرتبطة بالمخزون المنشور من الشركة.",
    title:"السيارات المتاحة الآن",found:"سيارة متاحة",allBrands:"كل الماركات",allTypes:"كل الفئات",allTrans:"كل نواقل الحركة",allFuel:"كل أنواع الوقود",
    automatic:"أوتوماتيك",manual:"عادي",pickup:"الاستلام",period:"الفترة",change:"تعديل البحث",perDay:"لليوم",view:"شاهد التفاصيل",verified:"شركة موثقة",seats:"مقاعد",bags:"حقائب",free:"إلغاء مجاني",unlimited:"كيلومترات غير محدودة",airport:"استلام من المطار",noResults:"لا توجد سيارات مطابقة",noResultsBody:"غيّر الفلاتر أو عدّل مكان وتاريخ الاستلام.",close:"إغلاق"
  }:{
    live:"Live rental-company availability",liveBody:"These vehicles come from the HandMeKey rental-company control panel. Pricing and terms are tied to company-published inventory.",
    title:"Cars available now",found:"cars available",allBrands:"All brands",allTypes:"All categories",allTrans:"All transmissions",allFuel:"All fuel types",
    automatic:"Automatic",manual:"Manual",pickup:"Pick-up",period:"Period",change:"Change search",perDay:"per day",view:"View details",verified:"Verified company",seats:"seats",bags:"bags",free:"Free cancellation",unlimited:"Unlimited mileage",airport:"Airport pickup",noResults:"No matching cars",noResultsBody:"Change the filters or adjust your pick-up location and dates.",close:"Close"
  };
  const brands=useMemo(()=>unique([...STANDARD_BRANDS,...cars.map((car)=>car.brand)]),[cars]);
  const categories=useMemo(()=>unique(cars.map((car)=>car.category)),[cars]);
  const fuels=useMemo(()=>unique([...STANDARD_FUELS,...cars.map((car)=>car.fuel)]),[cars]);
  const results=useMemo(()=>cars.filter((car)=>{
    if(brand&&car.brand!==brand)return false;
    if(category&&car.category!==category)return false;
    if(transmission&&car.transmission!==transmission)return false;
    if(fuel&&car.fuel!==fuel)return false;
    return true;
  }),[cars,brand,category,transmission,fuel]);
  const days=rentalDays(initialSearch.pickupDate,initialSearch.returnDate);
  const baseParams=new URLSearchParams({pickup:initialSearch.pickup,dropoff:initialSearch.dropoff,pickupDate:initialSearch.pickupDate,pickupTime:initialSearch.pickupTime,returnDate:initialSearch.returnDate,returnTime:initialSearch.returnTime,driverAge:initialSearch.driverAge});

  return <div className={styles.root}>
    <div className={styles.liveNotice}><ShieldCheck size={20}/><div><strong>{copy.live}</strong><p>{copy.liveBody}</p></div></div>
    <section className={styles.summary}><div><span>{copy.pickup}</span><strong><MapPin size={12}/>{initialSearch.pickup}</strong></div><div><span>{copy.period}</span><strong>{initialSearch.pickupDate} {initialSearch.pickupTime} → {initialSearch.returnDate} {initialSearch.returnTime}</strong></div><div><span>{ar?"عمر السائق":"Driver age"}</span><strong>{initialSearch.driverAge}</strong></div><Link href="/?service=cars">{copy.change}</Link></section>
    <div className={styles.head}><div><h1>{copy.title}</h1><p><strong>{results.length}</strong> {copy.found}</p></div></div>
    <div className={styles.filters}>
      <CarBrandFilter value={brand} onChange={setBrand} empty={copy.allBrands} brands={brands} closeLabel={copy.close}/>
      <FilterSelect value={category} onChange={setCategory} empty={copy.allTypes} options={categories.map((value)=>({value,label:categoryLabel(value,ar)}))} closeLabel={copy.close}/>
      <FilterSelect value={transmission} onChange={setTransmission} empty={copy.allTrans} options={[{value:"Automatic",label:copy.automatic},{value:"Manual",label:copy.manual}]} closeLabel={copy.close}/>
      <FilterSelect value={fuel} onChange={setFuel} empty={copy.allFuel} options={fuels.map((value)=>({value,label:fuelLabel(value,ar)}))} closeLabel={copy.close}/>
    </div>
    {results.length?<div className={styles.grid}>{results.map((car)=>{
      const params=new URLSearchParams(baseParams);const total=car.dailyPrice*days;
      return <Link key={car.id} className={styles.card} href={`/cars/${car.id}?${params.toString()}`}>
        <div className={styles.media}>{car.imageUrl?<img src={car.imageUrl} alt={car.imageAlt??`${car.brand} ${car.model}`}/>:<div className={styles.placeholder}><CarFront size={38}/></div>}<span className={styles.verified}><ShieldCheck size={11}/>{copy.verified}</span></div>
        <div className={styles.body}><div className={styles.meta}><span>{categoryLabel(car.category,ar)} · {car.year}</span><span>{car.location}</span></div><h2>{car.brand} {car.model}</h2><div className={styles.supplier}>{car.supplier}</div>
          <div className={styles.specs}><span><Users size={12}/>{car.seats} {copy.seats}</span><span><BriefcaseBusiness size={12}/>{car.bags} {copy.bags}</span><span><Gauge size={12}/>{car.transmission==="Automatic"?copy.automatic:copy.manual}</span><span><Fuel size={12}/>{fuelLabel(car.fuel,ar)}</span></div>
          <div className={styles.benefits}>{car.freeCancellation&&<span><Check size={11}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={11}/>{copy.unlimited}</span>}{car.airportPickup&&<span><Check size={11}/>{copy.airport}</span>}</div>
          <div className={styles.price}><div><small>{copy.perDay}</small><strong>{car.dailyPrice.toFixed(2)} JOD</strong><small>{days} × = {total.toFixed(2)} JOD</small></div><span className={styles.cta}>{copy.view}<ArrowUpRight size={14}/></span></div>
        </div>
      </Link>;
    })}</div>:<div className={styles.empty}><div><CarFront size={30}/><h2>{copy.noResults}</h2><p>{copy.noResultsBody}</p></div></div>}
  </div>;
}

function FilterSelect({value,onChange,empty,options,closeLabel}:{value:string;onChange:(value:string)=>void;empty:string;options:FilterOption[];closeLabel:string}){
  const [open,setOpen]=useState(false);
  const selected=options.find((option)=>option.value===value)?.label;
  const choose=(next:string)=>{onChange(next);setOpen(false);};
  return <div className={styles.selectWrap}>
    <button type="button" className={`${styles.selectTrigger} ${value?styles.selectTriggerActive:""}`} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span>{selected||empty}</span><ChevronDown size={16}/>
    </button>
    {open&&<div className={styles.filterOverlay} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <section className={styles.filterSheet} role="dialog" aria-modal="true" aria-label={empty}>
        <div className={styles.filterSheetHandle}/>
        <div className={styles.filterSheetHead}><strong>{empty}</strong><button type="button" onClick={()=>setOpen(false)} aria-label={closeLabel}><X size={18}/></button></div>
        <div className={styles.filterOptions}>
          <button type="button" className={!value?styles.filterOptionActive:""} onClick={()=>choose("")}><span>{empty}</span>{!value&&<Check size={17}/>}</button>
          {options.map((option)=><button type="button" key={option.value} className={value===option.value?styles.filterOptionActive:""} onClick={()=>choose(option.value)}><span>{option.label}</span>{value===option.value&&<Check size={17}/>}</button>)}
        </div>
      </section>
    </div>}
  </div>;
}
function unique(values:readonly string[]){return [...new Set(values)].sort((a,b)=>a.localeCompare(b));}
function rentalDays(start:string,end:string){const diff=Date.parse(`${end}T12:00:00Z`)-Date.parse(`${start}T12:00:00Z`);return Math.max(1,Math.round(diff/86_400_000));}
function fuelLabel(value:string,ar:boolean){if(!ar)return value;if(value==="Petrol")return"بنزين";if(value==="Diesel")return"ديزل";if(value==="Electric")return"كهرباء";if(value==="Hybrid")return"هايبرد";if(value==="Plug-in Hybrid")return"هايبرد قابل للشحن";if(value==="LPG")return"غاز بترولي مسال (LPG)";if(value==="CNG")return"غاز طبيعي مضغوط (CNG)";if(value==="Hydrogen")return"هيدروجين";return value;}
function categoryLabel(value:string,ar:boolean){if(!ar)return value;if(value==="Economy")return"اقتصادية";if(value==="Compact")return"مدمجة";if(value==="Sedan")return"سيدان";if(value==="SUV")return"دفع رباعي SUV";if(value==="Luxury")return"فاخرة";if(value==="Van")return"فان";return value;}
