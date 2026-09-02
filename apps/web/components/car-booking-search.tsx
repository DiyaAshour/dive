"use client";

import {useEffect, useMemo, useState} from "react";
import {CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Search, Users, X} from "lucide-react";
import styles from "./car-booking-search.module.css";
import extrasStyles from "./car-booking-search-extras.module.css";

type Locale = "ar" | "en";
type Picker = "pickupDate" | "pickupTime" | "returnDate" | "returnTime" | "age" | "brand" | null;
type Props = Readonly<{locale:Locale;defaultPickupDate:string;defaultReturnDate:string}>;

const CAR_BRANDS = ["Toyota","Hyundai","Kia","Nissan","Honda","BMW","Mercedes-Benz","Audi","Volkswagen","Ford","Chevrolet","Lexus","Tesla","BYD","MG","Geely","Land Rover","Mazda","Mitsubishi","Suzuki","Jeep"] as const;
type CarBrand = (typeof CAR_BRANDS)[number];

const CAR_BRAND_LOGOS: Record<CarBrand,string> = {
  Toyota:"toyota",Hyundai:"hyundai",Kia:"kia",Nissan:"nissan",Honda:"honda",BMW:"bmw","Mercedes-Benz":"mercedesbenz",Audi:"audi",Volkswagen:"volkswagen",Ford:"ford",Chevrolet:"chevrolet",Lexus:"lexus",Tesla:"tesla",BYD:"byd",MG:"mg",Geely:"geely","Land Rover":"landrover",Mazda:"mazda",Mitsubishi:"mitsubishi",Suzuki:"suzuki",Jeep:"jeep",
};

const LEGACY_CAR_BRAND_LOGOS: Partial<Record<CarBrand,string>> = {
  Toyota:"toyota",Hyundai:"hyundai",Kia:"kia",Nissan:"nissan",Honda:"honda",BMW:"bmw","Mercedes-Benz":"mercedes",Audi:"audi",Volkswagen:"volkswagen",Ford:"ford",Chevrolet:"chevrolet",Lexus:"lexus",Tesla:"tesla","Land Rover":"landrover",Mazda:"mazda",Mitsubishi:"mitsubishi",Suzuki:"suzuki",Jeep:"jeep",
};

const DRIVER_AGES = ["18-24","25-29","30-65","66+"] as const;
const TIME_SLOTS = Array.from({length:48},(_,index)=>`${String(Math.floor(index/2)).padStart(2,"0")}:${index%2?"30":"00"}`);
const FLEX_OPTIONS = [0,1,2,3,7,14] as const;
const MIN_RENTAL_DAYS = 3;

export function CarBookingSearch({locale,defaultPickupDate,defaultReturnDate}:Props){
  const ar=locale==="ar";
  const [sameDropoff,setSameDropoff]=useState(true);
  const [brand,setBrand]=useState<CarBrand|"">("");
  const [brandQuery,setBrandQuery]=useState("");
  const [pickupDate,setPickupDate]=useState(defaultPickupDate);
  const [returnDate,setReturnDate]=useState(()=>{
    const minimum=addDays(defaultPickupDate,MIN_RENTAL_DAYS);
    return defaultReturnDate>=minimum?defaultReturnDate:minimum;
  });
  const [pickupTime,setPickupTime]=useState("10:00");
  const [returnTime,setReturnTime]=useState("10:00");
  const [driverAge,setDriverAge]=useState("30-65");
  const [picker,setPicker]=useState<Picker>(null);
  const [calendarMonth,setCalendarMonth]=useState(()=>monthStart(defaultPickupDate));
  const [dateMode,setDateMode]=useState<"dates"|"flexible">("dates");
  const [flexDays,setFlexDays]=useState(0);

  const copy=ar?{
    pickup:"مكان الاستلام",pickupPlaceholder:"عمّان - مطار الملكة علياء",dropoff:"مكان التسليم",dropoffPlaceholder:"اختر مكان التسليم",sameDropoff:"نفس مكان الاستلام",
    pickupMoment:"الاستلام",returnMoment:"التسليم",pickupDate:"تاريخ الاستلام",pickupTime:"وقت الاستلام",returnDate:"تاريخ التسليم",returnTime:"وقت التسليم",
    driverAge:"عمر السائق",brand:"الماركة",brandHint:"اختياري",anyBrand:"أي ماركة",chooseBrand:"أي ماركة",brandSearch:"ابحث عن الماركة",noBrands:"لا توجد ماركة بهذا الاسم",search:"ابحث عن سيارة",
    choosePickupDate:"اختر تاريخ الاستلام",chooseReturnDate:"اختر تاريخ التسليم",choosePickupTime:"اختر وقت الاستلام",chooseReturnTime:"اختر وقت التسليم",chooseAge:"اختر عمر السائق",localTime:"جميع الأوقات بالتوقيت المحلي",close:"إغلاق",ageNote:"اختر الفئة العمرية للسائق الأساسي",brandTitle:"اختر الماركة",
    dates:"التواريخ",flexible:"مرن",exactDates:"تواريخ محددة",day:"يوم",days:"أيام",
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],weekdays:["ح","ن","ث","ر","خ","ج","س"],
  }:{
    pickup:"Pick-up location",pickupPlaceholder:"Amman - Queen Alia Airport",dropoff:"Drop-off location",dropoffPlaceholder:"Choose drop-off location",sameDropoff:"Same as pick-up",
    pickupMoment:"Pick-up",returnMoment:"Return",pickupDate:"Pick-up date",pickupTime:"Pick-up time",returnDate:"Return date",returnTime:"Return time",
    driverAge:"Driver age",brand:"Brand",brandHint:"Optional",anyBrand:"Any brand",chooseBrand:"Any brand",brandSearch:"Search brands",noBrands:"No matching brand",search:"Search cars",
    choosePickupDate:"Choose pick-up date",chooseReturnDate:"Choose return date",choosePickupTime:"Choose pick-up time",chooseReturnTime:"Choose return time",chooseAge:"Choose driver age",localTime:"All times are local",close:"Close",ageNote:"Choose the age range of the main driver",brandTitle:"Choose brand",
    dates:"Dates",flexible:"Flexible",exactDates:"Exact dates",day:"day",days:"days",
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],weekdays:["S","M","T","W","T","F","S"],
  };

  const filteredBrands=useMemo(()=>{const query=brandQuery.trim().toLowerCase();return query?CAR_BRANDS.filter((item)=>item.toLowerCase().includes(query)):CAR_BRANDS;},[brandQuery]);
  const datePickerOpen=picker==="pickupDate"||picker==="returnDate";

  useEffect(()=>{
    if(!picker)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    document.body.classList.add("carSearchOverlayOpen");
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setPicker(null);};
    document.addEventListener("keydown",onKeyDown);
    return()=>{document.body.style.overflow=previous;document.body.classList.remove("carSearchOverlayOpen");document.removeEventListener("keydown",onKeyDown);};
  },[picker]);

  function openDate(kind:"pickupDate"|"returnDate"){const value=kind==="pickupDate"?pickupDate:returnDate;setCalendarMonth(monthStart(value));setPicker(kind);}
  function chooseDate(value:string){
    if(picker==="pickupDate"){
      setPickupDate(value);
      const minimumReturn=addDays(value,MIN_RENTAL_DAYS);
      if(returnDate<minimumReturn)setReturnDate(minimumReturn);
      setPicker("returnDate");
      return;
    }
    if(picker==="returnDate"){
      if(value<addDays(pickupDate,MIN_RENTAL_DAYS))return;
      setReturnDate(value);
      setPicker(null);
    }
  }
  function chooseTime(value:string){if(picker==="pickupTime")setPickupTime(value);if(picker==="returnTime")setReturnTime(value);setPicker(null);}
  function selectFlex(days:number){setFlexDays(days);setDateMode(days===0?"dates":"flexible");}

  return <div className={styles.root} id="car-search">
    <form className={styles.dock} action="/cars" method="get">
      <div className={`${styles.field} ${styles.locationField}`}>
        <label className={styles.locationInput}><span className={styles.label}><MapPin size={16}/>{copy.pickup}</span><input name="pickup" defaultValue={copy.pickupPlaceholder} required/></label>
        <div className={styles.sameDropoffLine}><button type="button" className={styles.sameDropoffText} onClick={()=>setSameDropoff((value)=>!value)}>{copy.sameDropoff}</button><button type="button" className={`${styles.switch} ${sameDropoff?styles.switchOn:""}`} role="switch" aria-checked={sameDropoff} aria-label={copy.sameDropoff} onClick={()=>setSameDropoff((value)=>!value)}><span/></button></div>
        {!sameDropoff&&<label className={styles.dropoffReveal}><span>{copy.dropoff}</span><input name="dropoff" placeholder={copy.dropoffPlaceholder} required/></label>}
        {sameDropoff&&<input type="hidden" name="dropoff" value="same"/>}
      </div>

      <MomentField locale={locale} label={copy.pickupMoment} date={pickupDate} time={pickupTime} onDate={()=>openDate("pickupDate")} onTime={()=>setPicker("pickupTime")}/>
      <MomentField locale={locale} label={copy.returnMoment} date={returnDate} time={returnTime} onDate={()=>openDate("returnDate")} onTime={()=>setPicker("returnTime")}/>

      <div className={`${styles.field} ${styles.ageField}`}><span className={styles.label}><Users size={16}/>{copy.driverAge}</span><button type="button" className={styles.simpleTrigger} onClick={()=>setPicker("age")}><strong>{ageLabel(driverAge,ar)}</strong><ChevronDown size={16}/></button></div>
      <div className={`${styles.field} ${styles.brandField}`}><span className={styles.brandLabel}><span>{copy.brand}</span><small>{copy.brandHint}</small></span><button className={`${styles.simpleTrigger} ${brand?styles.brandTriggerSelected:""}`} type="button" onClick={()=>setPicker("brand")}><span className={styles.brandTriggerText}>{brand?<><BrandBadge brand={brand}/><strong>{brand}</strong></>:<strong>{copy.chooseBrand}</strong>}</span><ChevronDown size={16}/></button></div>

      <input type="hidden" name="pickupDate" value={pickupDate}/><input type="hidden" name="pickupTime" value={pickupTime}/><input type="hidden" name="returnDate" value={returnDate}/><input type="hidden" name="returnTime" value={returnTime}/><input type="hidden" name="driverAge" value={driverAge}/><input type="hidden" name="flexibleDays" value={flexDays}/>{brand&&<input type="hidden" name="brand" value={brand}/>} 
      <button className={styles.searchButton} type="submit"><Search size={21}/><span>{copy.search}</span></button>
    </form>

    {picker&&<div className={`${styles.sheetBackdrop} ${extrasStyles.fullOverlay}`} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setPicker(null);}}><section className={`${styles.sheet} ${datePickerOpen?styles.dateSheet:""}`} role="dialog" aria-modal="true" aria-label={pickerTitle(picker,copy)}><div className={styles.sheetHandle}/>
      {datePickerOpen?<><div className={styles.segmented}><button type="button" className={dateMode==="dates"?styles.segmentActive:""} onClick={()=>{setDateMode("dates");setFlexDays(0);}}>{copy.dates}</button><button type="button" className={dateMode==="flexible"?styles.segmentActive:""} onClick={()=>{setDateMode("flexible");if(flexDays===0)setFlexDays(1);}}>{copy.flexible}</button></div><div className={styles.dateSheetLabel}>{picker==="pickupDate"?copy.choosePickupDate:copy.chooseReturnDate}</div><CalendarPicker month={calendarMonth} setMonth={setCalendarMonth} months={copy.months} weekdays={copy.weekdays} pickupDate={pickupDate} returnDate={returnDate} activeDate={picker} onSelect={chooseDate}/><div className={styles.flexRow}>{FLEX_OPTIONS.map((days)=><button key={days} type="button" className={flexDays===days?styles.flexActive:""} onClick={()=>selectFlex(days)}>{days===0?<><CalendarDays size={14}/>{copy.exactDates}</>:`± ${days} ${days===1?copy.day:copy.days}`}</button>)}</div></>:<><div className={styles.sheetHead}><div><span className={styles.sheetEyebrow}>HandMeKey Cars</span><h2>{pickerTitle(picker,copy)}</h2></div><button type="button" onClick={()=>setPicker(null)} aria-label={copy.close}><X size={19}/></button></div>{(picker==="pickupTime"||picker==="returnTime")&&<div className={styles.timePicker}><p>{copy.localTime}</p><div className={styles.timeGrid}>{TIME_SLOTS.map((time)=>{const active=(picker==="pickupTime"?pickupTime:returnTime)===time;return <button type="button" key={time} className={active?styles.timeActive:""} onClick={()=>chooseTime(time)}>{time}{active&&<Check size={14}/>}</button>;})}</div></div>}{picker==="age"&&<div className={styles.agePicker}><p>{copy.ageNote}</p><div className={styles.ageGrid}>{DRIVER_AGES.map((value)=>{const active=driverAge===value;return <button type="button" key={value} className={active?styles.ageActive:""} onClick={()=>{setDriverAge(value);setPicker(null);}}><span>{ageLabel(value,ar)}</span>{active&&<Check size={17}/>}</button>;})}</div></div>}{picker==="brand"&&<div className={styles.brandSheet}><label className={styles.brandSearch}><Search size={17}/><input autoFocus value={brandQuery} onChange={(event)=>setBrandQuery(event.target.value)} placeholder={copy.brandSearch}/>{brandQuery&&<button type="button" onClick={()=>setBrandQuery("")}><X size={14}/></button>}</label><button type="button" className={`${styles.brandSheetOption} ${!brand?styles.brandSheetOptionActive:""}`} onClick={()=>{setBrand("");setBrandQuery("");setPicker(null);}}><span>{copy.anyBrand}</span>{!brand&&<Check size={16}/>}</button><div className={styles.brandGrid}>{filteredBrands.map((item)=>{const active=brand===item;return <button type="button" key={item} className={`${styles.brandSheetOption} ${active?styles.brandSheetOptionActive:""}`} onClick={()=>{setBrand(item);setBrandQuery("");setPicker(null);}}><BrandBadge brand={item}/><span>{item}</span>{active&&<Check size={16}/>}</button>;})}</div>{filteredBrands.length===0&&<div className={styles.brandEmpty}>{copy.noBrands}</div>}</div>}</>}
    </section></div>}
  </div>;
}

function MomentField({locale,label,date,time,onDate,onTime}:{locale:Locale;label:string;date:string;time:string;onDate:()=>void;onTime:()=>void}){return <div className={`${styles.field} ${styles.momentField}`}><div className={styles.momentHeader}><span className={styles.label}><CalendarDays size={16}/>{label}</span><ChevronDown size={15}/></div><div className={styles.momentValues}><button type="button" className={styles.dateTrigger} onClick={onDate}><strong>{formatDisplayDate(date,locale)}</strong></button><button type="button" className={styles.timeTrigger} onClick={onTime}><Clock size={14}/><strong>{time}</strong></button></div></div>;}

function CalendarPicker({month,setMonth,months,weekdays,pickupDate,returnDate,activeDate,onSelect}:{month:Date;setMonth:(value:Date)=>void;months:string[];weekdays:string[];pickupDate:string;returnDate:string;activeDate:"pickupDate"|"returnDate";onSelect:(value:string)=>void}){const year=month.getUTCFullYear(),monthIndex=month.getUTCMonth();const daysInMonth=new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();const firstDay=new Date(Date.UTC(year,monthIndex,1)).getUTCDay();const cells:Array<number|null>=[...Array.from({length:firstDay},()=>null),...Array.from({length:daysInMonth},(_,i)=>i+1)];const today=currentDateValue();const currentMonth=monthStart(today);const canGoPrevious=month.getTime()>currentMonth.getTime();const minimumReturn=addDays(pickupDate,MIN_RENTAL_DAYS);return <div className={styles.calendar}><div className={styles.calendarHead}><button type="button" disabled={!canGoPrevious} onClick={()=>setMonth(new Date(Date.UTC(year,monthIndex-1,1)))} aria-label="Previous"><ChevronLeft size={19}/></button><strong>{months[monthIndex]??""} {year}</strong><button type="button" onClick={()=>setMonth(new Date(Date.UTC(year,monthIndex+1,1)))} aria-label="Next"><ChevronRight size={19}/></button></div><div className={styles.weekdays}>{weekdays.map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div><div className={styles.calendarGrid}>{cells.map((day,index)=>{if(day===null)return <span key={`empty-${index}`}/>;const value=`${year}-${String(monthIndex+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;const disabled=value<today||(activeDate==="returnDate"&&value<minimumReturn);const active=value===pickupDate||value===returnDate;const inRange=value>pickupDate&&value<returnDate;const className=[active?styles.dateActive:"",inRange?styles.dateRange:""].filter(Boolean).join(" ");return <button type="button" key={value} disabled={disabled} className={className} onClick={()=>onSelect(value)}><span>{day}</span></button>;})}</div></div>;}

function BrandBadge({brand}:{brand:CarBrand}){const short=brand==="Mercedes-Benz"?"MB":brand==="Land Rover"?"LR":brand.slice(0,2).toUpperCase();const legacySlug=LEGACY_CAR_BRAND_LOGOS[brand];return <span className={styles.brandBadge} aria-hidden="true"><img src={`https://cdn.simpleicons.org/${CAR_BRAND_LOGOS[brand]}`} alt="" width={23} height={23} loading="lazy" decoding="async" onError={(event)=>{const image=event.currentTarget;if(legacySlug&&image.dataset.legacy!=="1"){image.dataset.legacy="1";image.src=`https://cdnjs.cloudflare.com/ajax/libs/simple-icons/7.5.0/${legacySlug}.svg`;return;}image.style.display="none";const fallback=image.nextElementSibling;if(fallback instanceof HTMLElement)fallback.style.display="grid";}}/><span className={styles.brandFallback}>{short}</span></span>;}
function pickerTitle(picker:Exclude<Picker,null>,copy:any){if(picker==="pickupDate")return copy.choosePickupDate;if(picker==="returnDate")return copy.chooseReturnDate;if(picker==="pickupTime")return copy.choosePickupTime;if(picker==="returnTime")return copy.chooseReturnTime;if(picker==="age")return copy.chooseAge;return copy.brandTitle;}
function dateParts(value:string){const parts=value.split("-");return {year:Number(parts[0]??"1970"),month:Number(parts[1]??"1"),day:Number(parts[2]??"1")};}
function monthStart(value:string){const {year,month}=dateParts(value);return new Date(Date.UTC(year,month-1,1));}
function addDays(value:string,days:number){const {year,month,day}=dateParts(value);const date=new Date(Date.UTC(year,month-1,day+days));return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;}
function currentDateValue(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;}
function formatDisplayDate(value:string,locale:Locale){const {year,month,day}=dateParts(value);const date=new Date(Date.UTC(year,month-1,day,12));return new Intl.DateTimeFormat(locale==="ar"?"ar-JO":"en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(date);}
function ageLabel(value:string,ar:boolean){if(value==="66+")return "66+";const normalized=value.replace("-"," - ");return ar&&value==="30-65"?`${normalized} سنة`:normalized;}
