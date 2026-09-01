"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Search, Users, X } from "lucide-react";
import styles from "./car-booking-search.module.css";

type Locale = "ar" | "en";
type Picker = "pickupDate" | "pickupTime" | "returnDate" | "returnTime" | "age" | "brand" | null;

type Props = Readonly<{locale:Locale;defaultPickupDate:string;defaultReturnDate:string}>;

const CAR_BRANDS = ["Toyota","Hyundai","Kia","Nissan","Honda","BMW","Mercedes-Benz","Audi","Volkswagen","Ford","Chevrolet","Lexus","Tesla","BYD","MG","Geely","Land Rover","Mazda","Mitsubishi","Suzuki","Jeep"] as const;
type CarBrand = (typeof CAR_BRANDS)[number];
const DRIVER_AGES = ["18-24","25-29","30-65","66+"] as const;
const TIME_SLOTS = Array.from({length:48},(_,index)=>`${String(Math.floor(index/2)).padStart(2,"0")}:${index%2?"30":"00"}`);

export function CarBookingSearch({locale, defaultPickupDate, defaultReturnDate}: Props) {
  const ar = locale === "ar";
  const [sameDropoff, setSameDropoff] = useState(true);
  const [brand, setBrand] = useState<CarBrand | "">("");
  const [brandQuery, setBrandQuery] = useState("");
  const [pickupDate, setPickupDate] = useState(defaultPickupDate);
  const [returnDate, setReturnDate] = useState(defaultReturnDate);
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [driverAge, setDriverAge] = useState("30-65");
  const [picker, setPicker] = useState<Picker>(null);
  const [calendarMonth, setCalendarMonth] = useState(()=>monthStart(defaultPickupDate));

  const copy = ar ? {
    pickup:"مكان الاستلام",pickupPlaceholder:"عمّان - مطار الملكة علياء",dropoff:"مكان التسليم",sameDropoff:"نفس مكان الاستلام",
    pickupDate:"تاريخ الاستلام",pickupTime:"وقت الاستلام",returnDate:"تاريخ التسليم",returnTime:"وقت التسليم",
    driverAge:"عمر السائق",brand:"الماركة",brandHint:"اختياري",anyBrand:"أي ماركة",chooseBrand:"اختر الماركة",
    brandSearch:"ابحث عن الماركة",clearBrand:"إلغاء اختيار الماركة",noBrands:"لا توجد ماركة بهذا الاسم",search:"ابحث عن سيارة",
    choosePickupDate:"اختر تاريخ الاستلام",chooseReturnDate:"اختر تاريخ التسليم",choosePickupTime:"اختر وقت الاستلام",chooseReturnTime:"اختر وقت التسليم",
    chooseAge:"اختر عمر السائق",localTime:"جميع الأوقات بالتوقيت المحلي",close:"إغلاق",ageNote:"اختر الفئة العمرية للسائق الأساسي",brandTitle:"اختر الماركة",
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],weekdays:["ح","ن","ث","ر","خ","ج","س"],
  } : {
    pickup:"Pick-up location",pickupPlaceholder:"Amman - Queen Alia Airport",dropoff:"Drop-off location",sameDropoff:"Same as pick-up",
    pickupDate:"Pick-up date",pickupTime:"Pick-up time",returnDate:"Return date",returnTime:"Return time",
    driverAge:"Driver age",brand:"Brand",brandHint:"Optional",anyBrand:"Any brand",chooseBrand:"Choose brand",
    brandSearch:"Search brands",clearBrand:"Clear brand",noBrands:"No matching brand",search:"Search cars",
    choosePickupDate:"Choose pick-up date",chooseReturnDate:"Choose return date",choosePickupTime:"Choose pick-up time",chooseReturnTime:"Choose return time",
    chooseAge:"Choose driver age",localTime:"All times are local",close:"Close",ageNote:"Choose the age range of the main driver",brandTitle:"Choose brand",
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],weekdays:["S","M","T","W","T","F","S"],
  };

  const filteredBrands=useMemo(()=>{const query=brandQuery.trim().toLowerCase();return query?CAR_BRANDS.filter((item)=>item.toLowerCase().includes(query)):CAR_BRANDS;},[brandQuery]);

  useEffect(()=>{if(!picker)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setPicker(null);};document.addEventListener("keydown",onKeyDown);return()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",onKeyDown);};},[picker]);

  function openDate(kind:"pickupDate"|"returnDate"){const value=kind==="pickupDate"?pickupDate:returnDate;setCalendarMonth(monthStart(value));setPicker(kind);}
  function chooseDate(value:string){if(picker==="pickupDate"){setPickupDate(value);if(returnDate<=value)setReturnDate(addDays(value,1));setPicker("pickupTime");}else if(picker==="returnDate"){if(value<=pickupDate)return;setReturnDate(value);setPicker("returnTime");}}
  function chooseTime(value:string){if(picker==="pickupTime")setPickupTime(value);if(picker==="returnTime")setReturnTime(value);setPicker(null);}

  return <div className={styles.root}>
    <form className={styles.dock} action="/cars" method="get">
      <label className={`${styles.field} ${styles.locationField}`}><span className={styles.label}><MapPin size={15}/>{copy.pickup}</span><input name="pickup" defaultValue={copy.pickupPlaceholder} required/></label>
      <div className={`${styles.field} ${styles.dropoffField}`}><span className={styles.label}><MapPin size={15}/>{copy.dropoff}</span><label className={styles.switchRow}><button type="button" className={`${styles.switch} ${sameDropoff?styles.switchOn:""}`} role="switch" aria-checked={sameDropoff} aria-label={copy.sameDropoff} onClick={()=>setSameDropoff((value)=>!value)}><span/></button><strong>{copy.sameDropoff}</strong></label>{!sameDropoff&&<input className={styles.dropoffInput} name="dropoff" placeholder={copy.dropoff}/>} {sameDropoff&&<input type="hidden" name="dropoff" value="same"/>}</div>
      <PickerField icon={<CalendarDays size={15}/>} label={copy.pickupDate} value={formatDate(pickupDate)} onClick={()=>openDate("pickupDate")}/>
      <PickerField icon={<Clock size={15}/>} label={copy.pickupTime} value={pickupTime} onClick={()=>setPicker("pickupTime")}/>
      <PickerField icon={<CalendarDays size={15}/>} label={copy.returnDate} value={formatDate(returnDate)} onClick={()=>openDate("returnDate")}/>
      <PickerField icon={<Clock size={15}/>} label={copy.returnTime} value={returnTime} onClick={()=>setPicker("returnTime")}/>
      <div className={`${styles.field} ${styles.ageField}`}><span className={styles.label}><Users size={15}/>{copy.driverAge}</span><button type="button" className={styles.fieldButton} onClick={()=>setPicker("age")}><strong>{ageLabel(driverAge,ar)}</strong><ChevronDown size={15}/></button></div>
      <div className={`${styles.field} ${styles.brandField}`}><span className={styles.brandLabel}><span>{copy.brand}</span><small>{copy.brandHint}</small></span><button className={`${styles.brandTrigger} ${brand?styles.brandTriggerSelected:""}`} type="button" onClick={()=>setPicker("brand")}><span className={styles.brandTriggerText}>{brand?<><BrandBadge brand={brand}/><strong>{brand}</strong></>:<strong>{copy.chooseBrand}</strong>}</span><ChevronDown size={16}/></button></div>
      <input type="hidden" name="pickupDate" value={pickupDate}/><input type="hidden" name="pickupTime" value={pickupTime}/><input type="hidden" name="returnDate" value={returnDate}/><input type="hidden" name="returnTime" value={returnTime}/><input type="hidden" name="driverAge" value={driverAge}/>{brand&&<input type="hidden" name="brand" value={brand}/>} 
      <button className={styles.searchButton} type="submit"><Search size={20}/><span>{copy.search}</span></button>
    </form>

    {picker&&<div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setPicker(null);}}><section className={styles.sheet} role="dialog" aria-modal="true" aria-label={pickerTitle(picker,copy)}><div className={styles.sheetHandle}/><div className={styles.sheetHead}><div><span className={styles.sheetEyebrow}>HandMeKey Cars</span><h2>{pickerTitle(picker,copy)}</h2></div><button type="button" onClick={()=>setPicker(null)} aria-label={copy.close}><X size={19}/></button></div>
      {(picker==="pickupDate"||picker==="returnDate")&&<CalendarPicker month={calendarMonth} setMonth={setCalendarMonth} months={copy.months} weekdays={copy.weekdays} selected={picker==="pickupDate"?pickupDate:returnDate} minDate={picker==="returnDate"?addDays(pickupDate,1):undefined} onSelect={chooseDate}/>} 
      {(picker==="pickupTime"||picker==="returnTime")&&<div className={styles.timePicker}><p>{copy.localTime}</p><div className={styles.timeGrid}>{TIME_SLOTS.map((time)=>{const active=(picker==="pickupTime"?pickupTime:returnTime)===time;return <button type="button" key={time} className={active?styles.timeActive:""} onClick={()=>chooseTime(time)}>{time}{active&&<Check size={14}/>}</button>;})}</div></div>}
      {picker==="age"&&<div className={styles.agePicker}><p>{copy.ageNote}</p><div className={styles.ageGrid}>{DRIVER_AGES.map((value)=>{const active=driverAge===value;return <button type="button" key={value} className={active?styles.ageActive:""} onClick={()=>{setDriverAge(value);setPicker(null);}}><span>{ageLabel(value,ar)}</span>{active&&<Check size={17}/>}</button>;})}</div></div>}
      {picker==="brand"&&<div className={styles.brandSheet}><label className={styles.brandSearch}><Search size={17}/><input autoFocus value={brandQuery} onChange={(event)=>setBrandQuery(event.target.value)} placeholder={copy.brandSearch}/>{brandQuery&&<button type="button" onClick={()=>setBrandQuery("")}><X size={14}/></button>}</label><button type="button" className={`${styles.brandSheetOption} ${!brand?styles.brandSheetOptionActive:""}`} onClick={()=>{setBrand("");setBrandQuery("");setPicker(null);}}><span>{copy.anyBrand}</span>{!brand&&<Check size={16}/>}</button><div className={styles.brandGrid}>{filteredBrands.map((item)=>{const active=brand===item;return <button type="button" key={item} className={`${styles.brandSheetOption} ${active?styles.brandSheetOptionActive:""}`} onClick={()=>{setBrand(item);setBrandQuery("");setPicker(null);}}><BrandBadge brand={item}/><span>{item}</span>{active&&<Check size={16}/>}</button>;})}</div>{filteredBrands.length===0&&<div className={styles.brandEmpty}>{copy.noBrands}</div>}</div>}
    </section></div>}
  </div>;
}

function PickerField({icon,label,value,onClick}:{icon:React.ReactNode;label:string;value:string;onClick:()=>void}){return <div className={styles.field}><span className={styles.label}>{icon}{label}</span><button type="button" className={styles.fieldButton} onClick={onClick}><strong>{value}</strong><ChevronDown size={15}/></button></div>;}
function CalendarPicker({month,setMonth,months,weekdays,selected,minDate,onSelect}:{month:Date;setMonth:(value:Date)=>void;months:string[];weekdays:string[];selected:string;minDate:string|undefined;onSelect:(value:string)=>void}){const year=month.getUTCFullYear(),monthIndex=month.getUTCMonth();const daysInMonth=new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();const firstDay=new Date(Date.UTC(year,monthIndex,1)).getUTCDay();const cells:Array<number|null>=[...Array.from({length:firstDay},()=>null),...Array.from({length:daysInMonth},(_,i)=>i+1)];return <div className={styles.calendar}><div className={styles.calendarHead}><button type="button" onClick={()=>setMonth(new Date(Date.UTC(year,monthIndex-1,1)))} aria-label="Previous"><ChevronLeft size={19}/></button><strong>{months[monthIndex]??""} {year}</strong><button type="button" onClick={()=>setMonth(new Date(Date.UTC(year,monthIndex+1,1)))} aria-label="Next"><ChevronRight size={19}/></button></div><div className={styles.weekdays}>{weekdays.map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div><div className={styles.calendarGrid}>{cells.map((day,index)=>{if(day===null)return <span key={`empty-${index}`}/>;const value=`${year}-${String(monthIndex+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;const disabled=Boolean(minDate&&value<minDate);const active=value===selected;return <button type="button" key={value} disabled={disabled} className={active?styles.dateActive:""} onClick={()=>onSelect(value)}><span>{day}</span></button>;})}</div></div>;}
function BrandBadge({brand}:{brand:CarBrand}){const short=brand==="Mercedes-Benz"?"MB":brand==="Land Rover"?"LR":brand.slice(0,2).toUpperCase();return <span className={styles.brandBadge} aria-hidden="true">{short}</span>;}
function pickerTitle(picker:Exclude<Picker,null>,copy:any){if(picker==="pickupDate")return copy.choosePickupDate;if(picker==="returnDate")return copy.chooseReturnDate;if(picker==="pickupTime")return copy.choosePickupTime;if(picker==="returnTime")return copy.chooseReturnTime;if(picker==="age")return copy.chooseAge;return copy.brandTitle;}
function dateParts(value:string){const parts=value.split("-");return {year:Number(parts[0]??"1970"),month:Number(parts[1]??"1"),day:Number(parts[2]??"1")};}
function monthStart(value:string){const {year,month}=dateParts(value);return new Date(Date.UTC(year,month-1,1));}
function addDays(value:string,days:number){const {year,month,day}=dateParts(value);const date=new Date(Date.UTC(year,month-1,day+days));return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;}
function formatDate(value:string){const {year,month,day}=dateParts(value);return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${year}`;}
function ageLabel(value:string,ar:boolean){if(value==="66+")return "66+";const normalized=value.replace("-"," - ");return ar&&value==="30-65"?`${normalized} سنة`:normalized;}
