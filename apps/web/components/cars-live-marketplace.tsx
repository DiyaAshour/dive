"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, CarFront, Check, ChevronDown, Fuel, Gauge, MapPin, Search, ShieldCheck, Users } from "lucide-react";
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

export function CarsLiveMarketplace({locale,initialSearch,cars}:Props){
  const ar=locale==="ar";
  const [query,setQuery]=useState("");
  const [brand,setBrand]=useState(initialSearch.brand??"");
  const [category,setCategory]=useState("");
  const [transmission,setTransmission]=useState("");
  const [fuel,setFuel]=useState("");
  const copy=ar?{
    live:"توفر حي من شركات التأجير",liveBody:"هذه السيارات تأتي من لوحة شركات التأجير في HandMeKey. السعر والشروط مرتبطة بالمخزون المنشور من الشركة.",
    title:"السيارات المتاحة الآن",found:"سيارة متاحة",search:"ابحث عن سيارة أو ماركة",allBrands:"كل الماركات",allTypes:"كل الفئات",allTrans:"كل نواقل الحركة",allFuel:"كل أنواع الوقود",
    automatic:"أوتوماتيك",manual:"عادي",pickup:"الاستلام",period:"الفترة",change:"تعديل البحث",perDay:"لليوم",view:"شاهد التفاصيل",verified:"شركة موثقة",seats:"مقاعد",bags:"حقائب",free:"إلغاء مجاني",unlimited:"كيلومترات غير محدودة",airport:"استلام من المطار",noResults:"لا توجد سيارات مطابقة",noResultsBody:"غيّر الفلاتر أو عدّل مكان وتاريخ الاستلام."
  }:{
    live:"Live rental-company availability",liveBody:"These vehicles come from the HandMeKey rental-company control panel. Pricing and terms are tied to company-published inventory.",
    title:"Cars available now",found:"cars available",search:"Search car or brand",allBrands:"All brands",allTypes:"All categories",allTrans:"All transmissions",allFuel:"All fuel types",
    automatic:"Automatic",manual:"Manual",pickup:"Pick-up",period:"Period",change:"Change search",perDay:"per day",view:"View details",verified:"Verified company",seats:"seats",bags:"bags",free:"Free cancellation",unlimited:"Unlimited mileage",airport:"Airport pickup",noResults:"No matching cars",noResultsBody:"Change the filters or adjust your pick-up location and dates."
  };
  const brands=useMemo(()=>unique(cars.map((car)=>car.brand)),[cars]);
  const categories=useMemo(()=>unique(cars.map((car)=>car.category)),[cars]);
  const fuels=useMemo(()=>unique(cars.map((car)=>car.fuel)),[cars]);
  const results=useMemo(()=>cars.filter((car)=>{
    const normalized=query.trim().toLowerCase();
    if(normalized&&!`${car.brand} ${car.model} ${car.supplier} ${car.category}`.toLowerCase().includes(normalized))return false;
    if(brand&&car.brand!==brand)return false;
    if(category&&car.category!==category)return false;
    if(transmission&&car.transmission!==transmission)return false;
    if(fuel&&car.fuel!==fuel)return false;
    return true;
  }),[cars,query,brand,category,transmission,fuel]);
  const days=rentalDays(initialSearch.pickupDate,initialSearch.returnDate);
  const baseParams=new URLSearchParams({pickup:initialSearch.pickup,dropoff:initialSearch.dropoff,pickupDate:initialSearch.pickupDate,pickupTime:initialSearch.pickupTime,returnDate:initialSearch.returnDate,returnTime:initialSearch.returnTime,driverAge:initialSearch.driverAge});

  return <div className={styles.root}>
    <div className={styles.liveNotice}><ShieldCheck size={20}/><div><strong>{copy.live}</strong><p>{copy.liveBody}</p></div></div>
    <section className={styles.summary}><div><span>{copy.pickup}</span><strong><MapPin size={12}/>{initialSearch.pickup}</strong></div><div><span>{copy.period}</span><strong>{initialSearch.pickupDate} {initialSearch.pickupTime} → {initialSearch.returnDate} {initialSearch.returnTime}</strong></div><div><span>{ar?"عمر السائق":"Driver age"}</span><strong>{initialSearch.driverAge}</strong></div><Link href="/?service=cars">{copy.change}</Link></section>
    <div className={styles.head}><div><h1>{copy.title}</h1><p><strong>{results.length}</strong> {copy.found}</p></div></div>
    <div className={styles.filters}>
      <label className={styles.search}><Search size={16}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={copy.search}/></label>
      <Select value={brand} onChange={setBrand} empty={copy.allBrands} options={brands}/>
      <Select value={category} onChange={setCategory} empty={copy.allTypes} options={categories}/>
      <Select value={transmission} onChange={setTransmission} empty={copy.allTrans} options={["Automatic","Manual"]}/>
      <Select value={fuel} onChange={setFuel} empty={copy.allFuel} options={fuels}/>
    </div>
    {results.length?<div className={styles.grid}>{results.map((car)=>{
      const params=new URLSearchParams(baseParams);const total=car.dailyPrice*days;
      return <Link key={car.id} className={styles.card} href={`/cars/${car.id}?${params.toString()}`}>
        <div className={styles.media}>{car.imageUrl?<img src={car.imageUrl} alt={car.imageAlt??`${car.brand} ${car.model}`}/>:<div className={styles.placeholder}><CarFront size={38}/></div>}<span className={styles.verified}><ShieldCheck size={11}/>{copy.verified}</span></div>
        <div className={styles.body}><div className={styles.meta}><span>{car.category} · {car.year}</span><span>{car.location}</span></div><h2>{car.brand} {car.model}</h2><div className={styles.supplier}>{car.supplier}</div>
          <div className={styles.specs}><span><Users size={12}/>{car.seats} {copy.seats}</span><span><BriefcaseBusiness size={12}/>{car.bags} {copy.bags}</span><span><Gauge size={12}/>{car.transmission==="Automatic"?copy.automatic:copy.manual}</span><span><Fuel size={12}/>{fuelLabel(car.fuel,ar)}</span></div>
          <div className={styles.benefits}>{car.freeCancellation&&<span><Check size={11}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={11}/>{copy.unlimited}</span>}{car.airportPickup&&<span><Check size={11}/>{copy.airport}</span>}</div>
          <div className={styles.price}><div><small>{copy.perDay}</small><strong>{car.dailyPrice.toFixed(2)} JOD</strong><small>{days} × = {total.toFixed(2)} JOD</small></div><span className={styles.cta}>{copy.view}<ArrowUpRight size={14}/></span></div>
        </div>
      </Link>;
    })}</div>:<div className={styles.empty}><div><CarFront size={30}/><h2>{copy.noResults}</h2><p>{copy.noResultsBody}</p></div></div>}
  </div>;
}

function Select({value,onChange,empty,options}:{value:string;onChange:(value:string)=>void;empty:string;options:string[]}){return <label className={styles.select}><select value={value} onChange={(event)=>onChange(event.target.value)}><option value="">{empty}</option>{options.map((option)=><option key={option} value={option}>{option}</option>)}</select><ChevronDown size={14}/></label>}
function unique(values:string[]){return [...new Set(values)].sort((a,b)=>a.localeCompare(b));}
function rentalDays(start:string,end:string){const diff=Date.parse(`${end}T12:00:00Z`)-Date.parse(`${start}T12:00:00Z`);return Math.max(1,Math.round(diff/86_400_000));}
function fuelLabel(value:string,ar:boolean){if(!ar)return value;if(value==="Petrol")return"بنزين";if(value==="Diesel")return"ديزل";if(value==="Hybrid")return"هايبرد";if(value==="Electric")return"كهرباء";return value;}
